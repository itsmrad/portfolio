import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, scriptBytesAddedBy } from "./helpers";

/**
 * Registry B's four games (rebuild-games-b), on the pattern of tests/arcade.spec.ts:
 * each starts by click and by keyboard, a game key changes its field, the page's
 * keys stay paused while it plays, Esc returns focus to Play, no console errors,
 * and its own chunk is within 4 KB brotli. Then one rule of each game, played
 * with Math.random pinned to 0 so the board is known.
 */
const GAMES = [
  { id: "punch", key: "Space" },
  { id: "plane", key: "Space" },
  { id: "words", key: "r" },
  { id: "sheets", key: "ArrowLeft" },
];
const GAME_BUDGET = 4 * 1024;

/** First input, then down to Experience: the arcade loads from there. */
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

const status = (page: Page) => page.getByRole("region", { name: "Arcade" }).locator('p[role="status"]');
const frame = (page: Page, id: string) => page.locator(`[data-arcade-card="${id}"] canvas`).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());

/** Starts a game with Math.random pinned to a known sequence (0 by default); returns its card. */
async function start(page: Page, id: string, sequence = [0]) {
  await open(page);
  await page.evaluate((values) => {
    let i = 0;
    Math.random = () => values[i++ % values.length]!;
  }, sequence);
  const card = page.locator(`[data-arcade-card="${id}"]`);
  await card.getByRole("button", { name: /^Play / }).click();
  const canvas = card.locator("canvas");
  await expect(canvas).toBeFocused();
  await expect(card.locator('[data-phase="loading"]')).toHaveCount(0);
  return { card, canvas };
}

/** Click on the canvas at logical coordinates (the field is 240 x 180). */
async function tap(page: Page, id: string, x: number, y: number) {
  const box = (await page.locator(`[data-arcade-card="${id}"] canvas`).boundingBox())!;
  await page.mouse.click(box.x + (x / 240) * box.width, box.y + (y / 180) * box.height);
}

test.describe("arcade B at 1440", () => {
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
      const bytes = await scriptBytesAddedBy(page, () => play.click());
      console.log(`${game.id} chunk: ${kb(bytes)} brotli`);
      expect(bytes).toBeGreaterThan(0);
      expect(bytes).toBeLessThanOrEqual(GAME_BUDGET);

      const canvas = card.locator("canvas");
      await expect(canvas).toBeFocused();
      await expect(canvas).toHaveAttribute("aria-describedby", `arcade-${game.id}-how`);
      await page.waitForTimeout(300);

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

      await page.keyboard.press("Escape");
      await expect(canvas).toHaveCount(0);
      await expect(play).toBeFocused();
      await page.keyboard.press("d");
      await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe(theme);

      await page.keyboard.press("Enter");
      await expect(card.locator("canvas")).toBeFocused();
      await page.keyboard.press("Escape");
      expect(errors).toEqual([]);
    });
  }

  test("sheet sizes: two A10 merge into an A9 by key and by drag; the score is the new sheet's area", async ({ page }) => {
    const { card } = await start(page, "sheets");
    // Math.random 0: both first sheets are A10 (2), top left and the cell beside it.
    await page.keyboard.press("ArrowLeft");
    await expect(card.locator("output")).toHaveText(/Score\s*4$/);
    await expect(status(page)).toHaveText("Made an A9.");
    // Drag right along the top row: the new A9 and the A10 spawned beside it slide over, no merge.
    const box = (await card.locator("canvas").boundingBox())!;
    const before = await frame(page, "sheets");
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 42, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => frame(page, "sheets")).not.toBe(before);
  });

  test("word check: repeated letters are marked only as often as the word holds them; a solve scores", async ({ page }) => {
    await start(page, "words");
    // Math.random 0: the word is REACT. TREAT has two Ts; only the last is in place, the first is not in it.
    await page.keyboard.type("treat");
    await page.keyboard.press("Enter");
    await expect(status(page)).toHaveText("T no, R elsewhere, E elsewhere, A elsewhere, T yes");
    // Letters may be typed during the reveal; Enter waits for it. Too short: refused, and said so.
    await page.keyboard.type("rea");
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    await expect(status(page)).toHaveText("Five letters, please.");
    // The on-screen keys type too: C, X, then Backspace, T and enter (logical key centres).
    await tap(page, "words", 97, 166);
    await tap(page, "words", 74, 166);
    await page.keyboard.press("Backspace");
    await tap(page, "words", 108, 130);
    await tap(page, "words", 217, 166);
    await expect(status(page)).toHaveText("REACT in 2 of 6.");
    await expect(page.locator('[data-arcade-card="words"] output')).toContainText("2/6");
  });

  test("paper plane: the first flap launches it and the floor ends the round", async ({ page }) => {
    const { card } = await start(page, "plane");
    await page.keyboard.press("Space");
    // No more flaps: it falls to the floor before the first gap arrives.
    await expect(card.locator('[data-phase="over"]')).toBeVisible({ timeout: 5000 });
    await expect(status(page)).toHaveText("No gaps cleared.");
  });

  test("centre punch: the first press starts the clock, a punch on the mark is a hit, one beside it a miss", async ({ page }) => {
    // The first mark is centred at (19, 37), the next one near (201, 150).
    const { card } = await start(page, "punch", [0, 0, 0.9, 0.9]);
    await page.keyboard.press("Space");
    await tap(page, "punch", 19, 37);
    await expect(card.locator("output")).toHaveText(/1 hit$/);
    await tap(page, "punch", 100, 100);
    await expect(card.locator("output")).toHaveText(/1 hit$/);
    await expect(card.locator("canvas")).toBeFocused();
  });
});

test.describe("arcade B, reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("every game still plays without errors", async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => localStorage.setItem("sound", "off"));
    await open(page);
    for (const game of GAMES) {
      const card = page.locator(`[data-arcade-card="${game.id}"]`);
      await card.getByRole("button", { name: /^Play / }).click();
      await expect(card.locator("canvas")).toBeFocused();
      await page.waitForTimeout(300);
      const before = await frame(page, game.id);
      await page.keyboard.press(game.key);
      await expect.poll(() => frame(page, game.id)).not.toBe(before);
      await page.keyboard.press("Escape");
    }
    expect(errors).toEqual([]);
  });
});
