import { readdirSync, readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, resources, scriptBrotli, scriptBytesAddedBy, settle } from "./helpers";

/**
 * The margin arcade and the working notes below the hero (rebuild-arcade).
 * Pattern for further games: add a row to GAMES in your own spec file, with
 * the key that changes your game's state from its first frame.
 */
const GAMES = [
  { id: "pong", key: "ArrowUp" },
  { id: "typing", key: "f" },
  { id: "memory", key: "ArrowUp", wait: 2600 },
  { id: "reaction", key: "Space" },
  { id: "snake", key: "ArrowDown" },
  { id: "breakout", key: "Space" },
];
const GAME_BUDGET = 4 * 1024;
const WIDTHS = [1280, 1440, 1920];

/** Chunk files of the build whose source holds `marker`: how a test tells the arcade's and the notes' scripts apart. */
const chunksWith = (marker: string) =>
  readdirSync(".next/static/chunks")
    .filter((file) => file.endsWith(".js") && readFileSync(`.next/static/chunks/${file}`, "utf8").includes(marker))
    .map((file) => `/_next/static/chunks/${file}`);
const ARCADE = () => chunksWith("arcade:play");
const LIFE = () => chunksWith("arcade:layout").filter((file) => !ARCADE().includes(file));
const requested = async (page: Page, files: string[]) =>
  (await resources(page)).filter((resource) => files.some((file) => resource.url.endsWith(file))).length;

/** First input, then down to Experience: the arcade and the notes load from there. */
async function open(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.mouse.move(700 + Math.random() * 20, 400);
    await expect(page.locator("[data-margin]")).toHaveCount(2, { timeout: 300 });
  }).toPass();
  await page.evaluate(() => document.getElementById("experience")!.scrollIntoView());
  await expect(page.locator('[data-arcade-card="arcade"]')).toBeVisible();
}

const frame = (page: Page, id: string) => page.locator(`[data-arcade-card="${id}"] canvas`).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());

test.describe("arcade at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  // Muted, so the sound engine's chunk is not counted as a game's.
  test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem("sound", "off")));

  for (const game of GAMES) {
    test(`${game.id}: starts by click and keyboard, takes input, pauses the page's keys, Esc returns focus, small chunk`, async ({ page }) => {
      const errors = collectErrors(page);
      await open(page);
      const card = page.locator(`[data-arcade-card="${game.id}"]`);
      const play = card.getByRole("button", { name: /^Play / });
      await play.scrollIntoViewIfNeeded();
      // Let what scrolling brings into view (the footer's own chunk near Contact) land first.
      await settle(page);
      // Its own chunk, fetched by the click and no earlier.
      const bytes = await scriptBytesAddedBy(page, () => play.click());
      console.log(`${game.id} chunk: ${kb(bytes)} brotli`);
      expect(bytes).toBeGreaterThan(0);
      expect(bytes).toBeLessThanOrEqual(GAME_BUDGET);

      const canvas = card.locator("canvas");
      await expect(canvas).toBeFocused();
      await expect(canvas).toHaveAttribute("aria-label", /game$/);
      await expect(canvas).toHaveAttribute("aria-describedby", `arcade-${game.id}-how`);
      // About as soon as a person would press a key after Play.
      await page.waitForTimeout(game.wait ?? 500);

      // A game key changes the field, and neither scrolls the page nor reaches the shortcuts or eggs.
      const scroll = await page.evaluate(() => scrollY);
      const before = await frame(page, game.id);
      await page.keyboard.press(game.key);
      await expect.poll(() => frame(page, game.id)).not.toBe(before);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      expect(await page.evaluate(() => scrollY)).toBe(scroll);
      const theme = await page.evaluate(() => document.documentElement.className);
      await page.keyboard.press("d");
      await page.keyboard.type("kitty");
      expect(await page.evaluate(() => document.documentElement.className)).toBe(theme);
      await expect(page.locator("[data-cat]")).toHaveCount(0);

      // Esc closes, focus comes back to Play, and the page's keys work again.
      await page.keyboard.press("Escape");
      await expect(canvas).toHaveCount(0);
      await expect(play).toBeFocused();
      await page.keyboard.press("d");
      await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe(theme);

      // Keyboard start: Enter on the Play button.
      await page.keyboard.press("Enter");
      await expect(card.locator("canvas")).toBeFocused();
      await page.keyboard.press("Escape");
      expect(errors).toEqual([]);
    });
  }

  test("one game at a time, the index starts any game, Tab leaves a game and pauses it, best scores persist", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("arcade:reaction", JSON.stringify({ v: 231, t: "231 ms" })));
    await open(page);
    const index = page.locator('[data-arcade-card="arcade"]');
    // Every registry's entries, not only this file's table: other engineers' games join the index too.
    const entries = ["a", "b", "c"].reduce((sum, r) => sum + (readFileSync(`src/components/arcade/games/registry-${r}.ts`, "utf8").match(/\{ id: "/g)?.length ?? 0), 0);
    await expect(index.getByRole("listitem")).toHaveCount(entries);
    await index.getByRole("button", { name: "Ruler and rivet" }).click();
    await expect(page.locator('[data-arcade-card="pong"] canvas')).toBeFocused();
    await index.getByRole("button", { name: "Cursor race" }).click();
    await expect(page.locator("[data-arcade-card] canvas")).toHaveCount(1);
    await expect(page.locator('[data-arcade-card="typing"] canvas')).toBeFocused();
    // Focus is never trapped: Tab moves on, and the game says it is paused.
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-arcade-card="typing"] canvas')).not.toBeFocused();
    await expect(page.locator('[data-arcade-card="typing"] [data-phase="playing"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-arcade-card="reaction"]')).toContainText("231 ms");
    // Cards are real controls in a named region, outside the aria-hidden margins.
    await expect(page.getByRole("region", { name: "Arcade" })).toBeVisible();
    expect(await page.locator('[aria-hidden="true"] [data-arcade-card]').count()).toBe(0);
  });

  test("the page's budgets are untouched: nothing of the arcade or the notes loads untouched, on scroll alone, or on the first input", async ({ page }) => {
    const arcade = ARCADE();
    const life = LIFE();
    expect(arcade.length).toBeGreaterThan(0);
    expect(life.length).toBeGreaterThan(0);
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);
    expect(await requested(page, [...arcade, ...life])).toBe(0);
    await expect(page.locator("[data-arcade-card], [data-life]")).toHaveCount(0);

    // First input at the top (the playful layer's own 8 KB measure): still none of it.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(700, 400);
    await page.mouse.move(720, 420);
    await settle(page);
    expect(await requested(page, [...arcade, ...life])).toBe(0);

    // Down to Experience: now both, and their size is recorded.
    await page.evaluate(() => document.getElementById("experience")!.scrollIntoView());
    await settle(page);
    const all = (await resources(page)).filter((resource) => [...arcade, ...life].some((file) => resource.url.endsWith(file)));
    const bytes = all.reduce((total, script) => total + scriptBrotli(script.url), 0);
    console.log(`arcade shell and notes: ${kb(bytes)} brotli in ${all.length} files`);
    expect(bytes).toBeLessThanOrEqual(10 * 1024);
  });
});

for (const width of WIDTHS) {
  test.describe(`margins at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("cards and notes keep off the column, the ruler and each other; projects never leave both margins empty", async ({ page }) => {
      const errors = collectErrors(page);
      await open(page);
      // Walk the page so every note is measured and revealed.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 600) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(500);
      const report = await page.evaluate(() => {
        const column = document.querySelector('[data-slot="frame"]')!.getBoundingClientRect();
        // The scroll ruler (from 80rem).
        const ruler = document.querySelector("[data-rail]")?.parentElement?.getBoundingClientRect();
        const visible = (element: Element) => getComputedStyle(element).visibility !== "hidden" && element.getBoundingClientRect().height > 0;
        const boxes = [...document.querySelectorAll("[data-arcade-card], [data-life], [data-note], [data-cat-bed]")]
          .filter(visible)
          .map((element) => {
            const r = element.getBoundingClientRect();
            return { name: element.getAttribute("data-arcade-card") ?? element.getAttribute("data-note") ?? element.className, left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY };
          });
        const overlaps: string[] = [];
        boxes.forEach((a, i) =>
          boxes.slice(i + 1).forEach((b) => {
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push(`${a.name} / ${b.name}`);
          }),
        );
        const touching = boxes.filter((box) => box.right > column.left - 8 && box.left < column.right + 8).map((box) => box.name);
        const cards = boxes.filter((box) => document.querySelector(`[data-arcade-card="${box.name}"]`));
        // Its ticks and tracker; its section names draw above the cards.
        const onRuler = ruler ? cards.filter((box) => box.left < ruler.right + 8).map((box) => box.name) : [];
        // Screens from the top of Work to the end of xflow: what each margin holds.
        const work = document.getElementById("work")!.getBoundingClientRect().top + scrollY;
        const end = document.getElementById("building")!.getBoundingClientRect().top + scrollY;
        const empty: number[] = [];
        for (let y = work; y + innerHeight <= end; y += innerHeight / 2) {
          const inside = boxes.filter((box) => box.bottom > y && box.top < y + innerHeight);
          const left = inside.some((box) => box.right < column.left);
          const right = inside.some((box) => box.left > column.right);
          if (!left && !right) empty.push(Math.round(y));
        }
        return { overlaps, touching, onRuler, empty, count: boxes.length };
      });
      console.log(`margins at ${width}: ${report.count} items`, JSON.stringify(report));
      expect(report.touching).toEqual([]);
      expect(report.overlaps).toEqual([]);
      expect(report.onRuler).toEqual([]);
      expect(report.empty).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("the notes", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every note finds the true text it points at, and the toys answer a press", async ({ page }) => {
    await open(page);
    // Content and DOM agree: one rendered item per entry (balloons: one per list item).
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.evaluate((h) => scrollTo(0, h), height);
    await expect(page.locator("[data-life]").first()).toBeAttached();
    const source = readFileSync("src/content/playful.ts", "utf8");
    const entries = (source.match(/\{ kind: "(note|ratio|toy)"/g) ?? []).length;
    const lists = (source.match(/\{ kind: "balloons"/g) ?? []).length;
    expect(await page.locator("[data-life]:not([class*=balloon])").count()).toBe(entries);
    expect(await page.locator("[data-life][class*=balloon]").count()).toBeGreaterThanOrEqual(lists * 5);

    const dial = page.locator('[data-toy="dial"]');
    await dial.scrollIntoViewIfNeeded();
    const first = await dial.innerText();
    await dial.click();
    await expect(dial).not.toHaveText(first);
    const terminal = page.locator('[data-toy="terminal"]');
    await terminal.scrollIntoViewIfNeeded();
    await terminal.click();
    await expect(terminal).toContainText("vite build");
  });

  test("the cat is twice its size, labelled, with an arrow at it", async ({ page }) => {
    await open(page);
    const bed = page.locator("[data-cat-bed]");
    await bed.scrollIntoViewIfNeeded();
    await expect(bed.locator("svg").last()).toHaveCSS("width", "64px");
    await expect(bed).toContainText("click to wake");
    await expect(bed.locator("span").first()).toHaveCSS("opacity", "1");
    await expect(bed.locator("svg")).toHaveCount(2);
  });
});

test.describe("phones and the 404", () => {
  test("a phone renders, downloads and runs none of it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await settle(page);
    await page.touchscreen?.tap(200, 400).catch(() => {});
    await page.mouse.click(200, 400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);
    expect(await requested(page, [...ARCADE(), ...LIFE()])).toBe(0);
    await expect(page.locator("[data-arcade-card], [data-life], [data-game]")).toHaveCount(0);
  });

  test("the 404 keeps only its own game: no arcade, no index, no notes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/no-such-page");
    await page.waitForLoadState("networkidle");
    await page.mouse.move(700, 400);
    await page.mouse.move(720, 420);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);
    await expect(page.locator("[data-arcade-card], [data-life]")).toHaveCount(0);
    await expect(page.locator("main canvas")).toHaveCount(1);
    expect(await requested(page, ARCADE())).toBe(0);
  });
});
