import { expect, test, type Page } from "@playwright/test";

import { glyphs } from "../src/content/glyphs";
import { collectErrors, resources, settle } from "./helpers";

/**
 * The banner's tech glyphs (round 4, R23): isometric tiles drawn as masks on the monogram's box, pressable by
 * position. Geometry from 360 to 1920, the press (colour, dip, joke), the popup's place at 360, 390, 768 and
 * 1440, the jokes' rotation and rules, and the cost: nothing new before the first input.
 */

type Tile = { id: string; left: number; top: number; width: number; height: number };

/** Every tile on the page, in viewport px, read back from the glyph layers' computed masks. */
function tiles(page: Page) {
  return page.evaluate(() => {
    const mark = document.querySelector<HTMLElement>("[data-glyphs]")!;
    const host = mark.getBoundingClientRect();
    const found: { id: string; left: number; top: number; width: number; height: number }[] = [];
    for (const which of ["before", "after"]) {
      const style = getComputedStyle(mark, `::${which}`);
      const ids = getComputedStyle(mark).getPropertyValue(`--glyphs-${which}`).replace(/"/g, "").trim().split(" ");
      const sizes = style.maskSize.split(",").map(parseFloat);
      style.maskPosition.split(",").forEach((pair, i) => {
        const [x, y] = pair.trim().split(" ").map(parseFloat);
        found.push({
          id: ids[i]!,
          left: host.left + parseFloat(style.left) + x!,
          top: host.top + parseFloat(style.top) + y!,
          width: sizes[i]!,
          height: (sizes[i]! * 38) / 54,
        });
      });
    }
    return found;
  });
}
const centre = (tile: Tile) => [tile.left + tile.width / 2, tile.top + tile.height * 0.4] as const;

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem("sound", "off"));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("the glyphs at rest", () => {
  for (const width of [360, 390, 640, 768, 1024, 1280, 1440, 1920])
    test(`at ${width}: on clear paper, off the monogram, its guides and 30° note, the stickers and each other`, async ({ page }) => {
      await open(page, width);
      const report = await page.evaluate(() => {
        const mark = document.querySelector<HTMLElement>("[data-glyphs]")!;
        const svg = mark.querySelector<SVGSVGElement>("svg[viewBox]")!;
        const host = mark.getBoundingClientRect();
        type Box = { id: string; left: number; top: number; width: number; height: number };
        const boxes: Box[] = [];
        for (const which of ["before", "after"]) {
          const style = getComputedStyle(mark, `::${which}`);
          const ids = getComputedStyle(mark).getPropertyValue(`--glyphs-${which}`).replace(/"/g, "").trim().split(" ");
          const sizes = style.maskSize.split(",").map(parseFloat);
          style.maskPosition.split(",").forEach((pair, i) => {
            const [x, y] = pair.trim().split(" ").map(parseFloat);
            boxes.push({ id: ids[i]!, left: host.left + parseFloat(style.left) + x!, top: host.top + parseFloat(style.top) + y!, width: sizes[i]!, height: (sizes[i]! * 38) / 54 });
          });
        }
        // A tile's outline: its diamond and its sides, as a share of its box; `pad` px of paper around it.
        const within = (b: Box, x: number, y: number, pad = 0) =>
          Math.abs((x - b.left) / b.width - 0.5) * 2 + Math.abs((y - b.top) / b.height - 0.48) * 1.9 <= 1.15 + (pad * 3) / b.width;
        const inside = (b: Box, pad = 3) => {
          const points: [number, number][] = [];
          for (let x = b.left - pad; x <= b.left + b.width + pad; x += 2)
            for (let y = b.top - pad; y <= b.top + b.height + pad; y += 2) if (within(b, x, y, pad)) points.push([x, y]);
          return points;
        };
        const found: string[] = [];
        const matrix = svg.getScreenCTM()!.inverse();
        const shapes = [...svg.querySelectorAll<SVGGeometryElement>("path, polygon, polyline, line")].filter((shape) => !shape.closest("defs, pattern, clipPath, mask"));
        const angle = svg.querySelector("g[class]:has(text)")?.getBoundingClientRect();
        const stickers = [...document.querySelectorAll<HTMLElement>("[data-sticker]")].map((sticker) => sticker.getBoundingClientRect()).filter((box) => box.width);
        const banner = mark.parentElement!.getBoundingClientRect();
        for (const b of boxes) {
          const points = inside(b);
          if (points.some(([x, y]) => shapes.some((shape) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return shape.isPointInFill(p) || shape.isPointInStroke(p); })))
            found.push(`${b.id} / monogram or guide`);
          const hits = (r: DOMRect) => points.some(([x, y]) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
          if (angle && hits(angle)) found.push(`${b.id} / 30° note`);
          if (stickers.some(hits)) found.push(`${b.id} / sticker`);
          if (b.left < banner.left || b.left + b.width > banner.right) found.push(`${b.id} / outside the banner`);
          for (const other of boxes) if (other !== b && points.some(([x, y]) => within(other, x, y))) found.push(`${b.id} / ${other.id}`);
        }
        return { count: boxes.length, found: [...new Set(found)] };
      });
      console.log(`glyphs at ${width}: ${report.count}`, report.found);
      expect(report.count).toBeGreaterThanOrEqual(width < 640 ? 3 : 12);
      expect(report.found).toEqual([]);
    });

  test("are in the server's CSS, drawn before any script runs; nothing of the press loads before a glyph is touched", async ({ browser, page }) => {
    const still = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await still.goto("/");
    expect(await still.evaluate(() => getComputedStyle(document.querySelector("[data-glyphs]")!, "::before").maskImage.split("url(").length - 1)).toBeGreaterThanOrEqual(8);
    await still.close();

    await open(page, 1440);
    await settle(page);
    await page.mouse.move(5, 600);
    await settle(page);
    const jokes = () => resources(page).then((list) => list.filter((entry) => entry.type === "script").length);
    const before = await jokes();
    // Off the glyphs, the press chunk stays away; over one, it arrives (so the press answers at once).
    await page.mouse.move(700, 600);
    await settle(page);
    expect(await jokes()).toBe(before);
    const [x, y] = centre((await tiles(page))[0]!);
    await page.mouse.move(x, y);
    await settle(page);
    expect(await jokes()).toBe(before + 1);
  });
});

test.describe("pressing a glyph", () => {
  test("at 1440: a pointer cursor over a tile, a coloured dip, its note, a joke beside it; two elements at most", async ({ page }) => {
    const errors = collectErrors(page);
    await open(page, 1440);
    await page.mouse.move(5, 600);
    await settle(page);
    // The page itself: loading the chunk adds its own script and stylesheet tags to <head>, which are not the press.
    const count = () => page.evaluate(() => document.body.querySelectorAll("*").length);
    const elements = await count();
    const all = await tiles(page);
    expect(all.length).toBeGreaterThanOrEqual(12);
    for (const tile of all) {
      const [x, y] = centre(tile);
      await page.mouse.move(x, y);
      await expect.poll(() => page.locator("[data-glyphs]").evaluate((element) => element.style.cursor)).toBe("pointer");
      await page.mouse.down();
      await page.mouse.up();
      const popup = page.locator("[data-joke][data-on]").last();
      await expect(popup).toBeVisible();
      const text = await popup.innerText();
      expect(glyphs[tile.id as keyof typeof glyphs].jokes, `${tile.id}: "${text}"`).toContain(text);
    }
    // The pressed tile and the popup: made once, then reused.
    expect((await count()) - elements).toBeLessThanOrEqual(2);
    await page.mouse.move(700, 800);
    await expect.poll(() => page.locator("[data-glyphs]").evaluate((element) => element.style.cursor)).toBe("");
    expect(errors).toEqual([]);
  });

  for (const width of [360, 390, 768, 1440])
    test(`at ${width}: every popup stays in the banner, above the name and the buttons, inside the viewport`, async ({ page }) => {
      await open(page, width);
      await page.mouse.move(width - 5, 880);
      await settle(page);
      for (const tile of await tiles(page)) {
        const [x, y] = centre(tile);
        await page.mouse.click(x, y);
        const popup = page.locator("[data-joke][data-on]").last();
        await expect(popup).toBeVisible();
        const fits = await popup.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const cover = element.parentElement!.parentElement!;
          const area = cover.getBoundingClientRect();
          const foot = cover.children[1]!.getBoundingClientRect().top;
          const name = document.querySelector("#top h1")!.getBoundingClientRect();
          return {
            inBanner: box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= foot,
            inViewport: box.left >= 0 && box.right <= innerWidth,
            offName: box.bottom <= name.top || box.top >= name.bottom || box.right <= name.left || box.left >= name.right,
          };
        });
        expect(fits, tile.id).toEqual({ inBanner: true, inViewport: true, offName: true });
      }
    });

  test("jokes rotate without an immediate repeat, and every one turns up", async ({ page }) => {
    await open(page, 1440);
    await page.mouse.move(5, 600);
    await settle(page);
    const tile = (await tiles(page)).find((t) => t.id === "rust")!;
    const [x, y] = centre(tile);
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      await page.mouse.click(x, y);
      seen.push(await page.locator("[data-joke][data-on]").last().innerText());
    }
    seen.forEach((text, i) => i && expect(text, `press ${i}`).not.toBe(seen[i - 1]));
    expect(new Set(seen)).toEqual(new Set(glyphs.rust.jokes));
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("the joke and the colour still come, without the dip", async ({ page }) => {
      await open(page, 1440);
      await page.mouse.move(5, 600);
      await settle(page);
      const [x, y] = centre((await tiles(page))[0]!);
      await page.mouse.click(x, y);
      await expect(page.locator("[data-joke][data-on]").last()).toBeVisible();
      const dips = await page.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName.includes("dip")).length);
      expect(dips).toBe(0);
    });
  });
});

test("the jokes follow R23: at least four a glyph, one line under about 60 characters, lower case", () => {
  for (const [id, { jokes }] of Object.entries(glyphs)) {
    expect(jokes.length, id).toBeGreaterThanOrEqual(4);
    expect(new Set(jokes).size, id).toBe(jokes.length);
    for (const line of jokes) {
      expect(line.length, line).toBeLessThanOrEqual(60);
      expect(line, line).not.toMatch(/\n/);
      // Lower case, apart from a code name written as code (useEffect).
      expect(line.replace(/\b[a-z]+[A-Z]\w*\b/g, ""), line).toBe(line.replace(/\b[a-z]+[A-Z]\w*\b/g, "").toLowerCase());
    }
  }
});
