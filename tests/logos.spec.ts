import { expect, test, type Locator, type Page } from "@playwright/test";

import { collectErrors, THEMES } from "./helpers";

/**
 * Organisation marks on the experience and education rows: one cell of
 * logos.svg per tile, painted by the tile's pseudo-elements (ink silhouette at
 * rest, brand colour on the row in hand, lifted colours on the dark page).
 */

const ENTRIES = [
  { name: "PlanCover", slot: 0, section: "experience" },
  { name: "Dasgupta Maiti & Associates", slot: 1, section: "experience" },
  { name: "Syuniqe", slot: 2, section: "experience" },
  { name: "Bhagwan Parshuram Institute of Technology", slot: 3, section: "education" },
] as const;

const tile = (page: Page, entry: (typeof ENTRIES)[number]) =>
  page.locator(`#${entry.section} li`, { hasText: entry.name }).locator('span[style*="--slot"]');

const pseudo = (locator: Locator, which: "::before" | "::after") =>
  locator.evaluate((el, which) => {
    const style = getComputedStyle(el, which);
    return { mask: style.maskImage, image: style.backgroundImage, x: style.backgroundPositionX, opacity: style.opacity };
  }, which);

for (const theme of THEMES) {
  test(`each entry renders its mark in a reserved 34px tile (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const errors = collectErrors(page);
    await page.goto("/");
    for (const entry of ENTRIES) {
      const box = tile(page, entry);
      await expect(box).toHaveAttribute("style", `--slot:${entry.slot}`);
      await expect(box).toHaveAttribute("aria-hidden", "true");
      await expect(box).toHaveText("");
      expect(await box.boundingBox()).toMatchObject({ width: 34, height: 34 });
      const ink = await pseudo(box, "::before");
      const colour = await pseudo(box, "::after");
      expect(ink.mask).toContain("logos");
      expect(colour.image).toContain("logos");
      // Colour cells 4-7 on paper, 8-11 lifted for the dark page.
      expect(colour.x).toBe(`${-(entry.slot + (theme === "dark" ? 8 : 4)) * 28}px`);
    }
    expect(errors).toEqual([]);
  });
}

test("the marks paint, and the tiles hold their place while the sprite loads", async ({ browser }) => {
  const snap = async (block: boolean) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    if (block) await page.route(/logos\.[^/]*\.svg$/, (route) => route.abort());
    const sprite = block ? null : page.waitForResponse(/logos\.[^/]*\.svg$/);
    await page.goto("/");
    const response = await sprite;
    if (response) {
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/svg+xml");
    }
    const result = [];
    for (const entry of ENTRIES) {
      const box = tile(page, entry);
      await box.scrollIntoViewIfNeeded();
      result.push({ box: await box.evaluate((el) => el.getBoundingClientRect().toJSON()), pixels: await box.screenshot({ animations: "disabled" }) });
    }
    await page.close();
    return result;
  };
  const empty = await snap(true);
  const loaded = await snap(false);
  ENTRIES.forEach((entry, i) => {
    expect(loaded[i]!.box.width, entry.name).toBe(34);
    expect(loaded[i]!.box.height, entry.name).toBe(34);
    expect(loaded[i]!.pixels.equals(empty[i]!.pixels), `${entry.name} paints a mark`).toBe(false);
  });
});

test("the row in hand shows its mark in colour, the others rest in ink", async ({ page }) => {
  await page.goto("/");
  const plancover = tile(page, ENTRIES[0]);
  const syuniqe = tile(page, ENTRIES[2]);
  // The current role starts open, so its mark is in colour.
  await expect.poll(async () => (await pseudo(plancover, "::after")).opacity).toBe("1");
  expect((await pseudo(syuniqe, "::after")).opacity).toBe("0");
  expect((await pseudo(syuniqe, "::before")).opacity).toBe("1");
  await page.locator("#experience summary", { hasText: "Syuniqe" }).hover();
  await expect.poll(async () => (await pseudo(syuniqe, "::after")).opacity).toBe("1");
  await expect.poll(async () => (await pseudo(syuniqe, "::before")).opacity).toBe("0");
});
