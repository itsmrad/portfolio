import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, scriptBytesAddedBy, THEMES, VIEWPORTS } from "./helpers";

/** Brotli budget for everything the footer loads when it is reached (globe, signature drawing). */
const FOOTER_LAZY_BUDGET = 8 * 1024;

const strip = (page: Page) => page.locator("footer dl").first();
const ink = (page: Page) => page.locator("footer button svg path").first();
const toFooter = (page: Page) => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the strip and the signature read true from the server HTML alone", async ({ page }) => {
    await page.goto("/");
    const text = (await strip(page).innerText()).replace(/\s+/g, " ");
    expect(text).toContain("NEW DELHI, INDIA");
    expect(text).toContain("IST · UTC+05:30");
    expect(text).toMatch(/BUILDING \S+ · \d{1,2} [A-Z]{3}/);
    expect(text).toContain("OPEN TO WORK");
    // Signed already: the full stroke, nothing hidden.
    await expect(ink(page)).toHaveCSS("opacity", "1");
    await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px");
  });
});

test("the visitor cell stays empty and the endpoint answers 404 while no store is configured", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("footer dt", { hasText: "Visitors" })).toHaveCount(0);
  expect((await request.get("/api/visit")).status()).toBe(404);
  expect((await request.post("/api/visit")).status()).toBe(404);
});

test("the strip scrambles in without moving, then settles on the true text with a live clock", async ({ page }) => {
  await page.goto("/");
  const before = await strip(page).evaluate((element) => [element.getBoundingClientRect().height, element.textContent]);
  const box = await strip(page).boundingBox();
  await strip(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  // Mid-scramble: same box, different glyphs.
  expect(await strip(page).evaluate((element) => element.getBoundingClientRect().height)).toBe(before[0]);
  expect((await strip(page).boundingBox())?.width).toBe(box?.width);
  await page.waitForTimeout(2000);
  const text = await strip(page).innerText();
  expect(text).toMatch(/\b\d{2}:\d{2} IST\b/);
  expect(text).toContain("NEW DELHI, INDIA");
  expect(text).toContain("OPEN TO WORK");
});

test("the signature draws when seen, and the pen signs it again on click", async ({ page }) => {
  await page.goto("/");
  await expect(ink(page)).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Sign again" }).scrollIntoViewIfNeeded();
  await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px", { timeout: 5000 });
  await page.getByRole("button", { name: "Sign again" }).click();
  await page.waitForTimeout(600);
  expect(Number.parseFloat(await ink(page).evaluate((path) => getComputedStyle(path).strokeDashoffset))).toBeGreaterThan(0);
  await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px", { timeout: 5000 });
});

test("the signature button is reachable by keyboard", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Sign again" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px", { timeout: 5000 });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing scrambles, the signature fades in whole and the globe holds still", async ({ page }) => {
    await page.goto("/");
    const final = await strip(page).innerText();
    await strip(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    // The clock may have started; everything else is untouched.
    const unclocked = (text: string) => text.replace(/^.*IST.*$/m, "");
    expect(unclocked(await strip(page).innerText())).toBe(unclocked(final));
    await page.getByRole("button", { name: "Sign again" }).scrollIntoViewIfNeeded();
    await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px");
    await expect(ink(page)).toHaveCSS("opacity", "1");
    await toFooter(page);
    await expect(page.locator("footer [data-drawn]")).toHaveCount(1);
    const satellite = page.locator("footer [data-satellite]");
    const states = await satellite.evaluate((element) => element.getAnimations().map((animation) => animation.playState));
    expect(states.every((state) => state === "paused")).toBe(true);
  });
});

test("the footer's code loads only when the footer is reached, inside its budget", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("footer [data-drawn]")).toHaveCount(0);
  const added = await scriptBytesAddedBy(page, () => toFooter(page));
  console.log(`footer lazy JS ${kb(added)} brotli`);
  expect(added).toBeGreaterThan(0);
  expect(added).toBeLessThanOrEqual(FOOTER_LAZY_BUDGET);
  await expect(page.locator("footer [data-drawn]")).toHaveCount(1);
});

test("the wordmark's dimension states its real width", async ({ page }) => {
  await page.goto("/");
  await toFooter(page);
  const label = page.locator("footer [data-width]");
  await expect(label).not.toHaveAttribute("data-width", "");
  const width = await label.evaluate((element) => element.closest("[data-slot=dimension]")!.parentElement!.getBoundingClientRect().width);
  expect(Number(await label.getAttribute("data-width"))).toBe(Math.round(width));
});

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test(`footer extras run clean, ${theme} / ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      const errors = collectErrors(page);
      await page.goto("/");
      await toFooter(page);
      await expect(page.locator("footer [data-drawn]")).toHaveCount(1);
      await page.mouse.move(viewport.width / 3, viewport.height - 300);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
}
