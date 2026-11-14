import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, scriptBytesAddedBy } from "./helpers";

/**
 * Registry C's games (rebuild-games-c): Redline, Loose parts, Stack layers. Same pattern as tests/arcade.spec.ts, plus pointer play, the
 * reduced-motion path, and Redline's scoring on a known snippet.
 */
const GAMES = [
  { id: "redline", key: "Space", budget: 6 * 1024 },
  { id: "parts", key: "Space", budget: 4 * 1024 },
  { id: "stack", key: "ArrowDown", budget: 4 * 1024 },
];

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
async function start(page: Page, id: string) {
  const card = page.locator(`[data-arcade-card="${id}"]`);
  const play = card.getByRole("button", { name: /^Play / });
  await play.scrollIntoViewIfNeeded();
  await play.click();
  await expect(card.locator("canvas")).toBeFocused();
  await page.waitForTimeout(300);
  return card;
}

test.describe("registry C at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
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
      expect(bytes).toBeLessThanOrEqual(game.budget);

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

    test(`${game.id}: plays by pointer alone`, async ({ page }) => {
      const errors = collectErrors(page);
      await open(page);
      const card = await start(page, game.id);
      const canvas = card.locator("canvas");
      const box = (await canvas.boundingBox())!;
      // First click starts; a move and a second click then change the field again.
      let before = await frame(page, game.id);
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await expect.poll(() => frame(page, game.id)).not.toBe(before);
      await page.waitForTimeout(200);
      before = await frame(page, game.id);
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
      await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
      await expect.poll(() => frame(page, game.id)).not.toBe(before);
      expect(errors).toEqual([]);
    });
  }

  test("redline: the right line scores by speed, a wrong one shows the answer and breaks the streak", async ({ page }) => {
    // A fixed random keeps the snippets in source order: first `sum`, bug on line 3, then `gain`, line 5.
    await page.addInitScript(() => (Math.random = () => 0.5));
    await open(page);
    const card = await start(page, "redline");
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
    await expect(card).toContainText(/Score\s*1[0-2](?!\d)/i);
    const status = page.getByRole("region", { name: "Arcade" }).locator("p[role=status]");
    await expect(status).toContainText(/Found it/);
    await page.keyboard.press("Space");
    await page.keyboard.press("2");
    await expect(status).toContainText(/line 5/);
    // Arrows and Space pick as well.
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(status).toContainText(/list is not mut/);
  });

  test("reduced motion: every game runs without errors", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = collectErrors(page);
    await open(page);
    for (const game of GAMES) {
      await start(page, game.id);
      const before = await frame(page, game.id);
      await page.keyboard.press(game.key);
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(400);
      await page.keyboard.up("ArrowLeft");
      await expect.poll(() => frame(page, game.id)).not.toBe(before);
      await page.keyboard.press("Escape");
    }
    expect(errors).toEqual([]);
  });
});
