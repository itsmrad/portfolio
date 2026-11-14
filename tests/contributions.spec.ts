import { readdirSync, readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, resources, scriptBytesAddedBy, settle } from "./helpers";

/**
 * "Play my contributions" (rebuild-games-c): the Activity graph turned into a
 * game. Nothing of it loads before the press, at any width; the press loads one
 * small chunk, lays the field over the graph without moving the page, and Esc
 * (or the back control) returns to the graph as it was.
 */
const BUDGET = 6 * 1024;
const GAME = () =>
  readdirSync(".next/static/chunks")
    .filter((file) => file.endsWith(".js") && readFileSync(`.next/static/chunks/${file}`, "utf8").includes("arcade:contributions"))
    .map((file) => `/_next/static/chunks/${file}`);

const button = (page: Page) => page.locator("[data-graph-play]");
const field = (page: Page) => page.locator('[data-game="contributions"] canvas');
const frame = (page: Page) => field(page).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
/** Where the page's content sits: any layout shift moves one of these. */
const layout = (page: Page) =>
  page.evaluate(() => [document.documentElement.scrollHeight, ...["activity", "stack"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top + scrollY))]);

async function toActivity(page: Page) {
  await page.goto("/");
  await settle(page);
  await page.mouse.move(300, 300);
  await page.evaluate(() => document.getElementById("activity")!.scrollIntoView());
  await settle(page);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`at ${viewport.width}: nothing of the game loads before the press, then one chunk within budget`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("sound", "off"));
    expect(GAME().length).toBe(1);
    await toActivity(page);
    const loaded = async () => (await resources(page)).filter((resource) => GAME().some((file) => resource.url.endsWith(file))).length;
    expect(await loaded()).toBe(0);
    await expect(button(page)).toBeVisible();
    await expect(button(page)).toHaveText("Play my contributions");
    // Not the accent-filled action (R19).
    await expect(button(page)).not.toHaveClass(/action-accent/);
    const bytes = await scriptBytesAddedBy(page, () => button(page).click());
    console.log(`contributions at ${viewport.width}: ${kb(bytes)} brotli on the press`);
    expect(await loaded()).toBe(1);
    expect(bytes).toBeLessThanOrEqual(BUDGET);
  });
}

test.describe("at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem("sound", "off")));

  test("the graph becomes the field in place: no shift, keys and pointer play, the page's keys pause, Esc returns to the untouched graph", async ({ page }) => {
    const errors = collectErrors(page);
    await toActivity(page);
    const svg = page.locator("[data-calendar] svg");
    const graph = await svg.screenshot();
    const before = await layout(page);

    await button(page).click();
    await expect(field(page)).toBeFocused();
    await expect(button(page)).toHaveAttribute("aria-expanded", "true");
    // Laid exactly over the graph, and the page does not move.
    const [over, under] = [await field(page).boundingBox(), await svg.boundingBox()];
    expect(Math.abs(over!.y - under!.y)).toBeLessThan(1);
    expect(Math.abs(over!.width - under!.width)).toBeLessThan(1);
    expect(await layout(page)).toEqual(before);

    // The days lift off, then keys move and fire.
    await page.waitForTimeout(1800);
    let shot = await frame(page);
    await page.keyboard.down("ArrowLeft");
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    await page.keyboard.up("ArrowLeft");
    await expect.poll(() => frame(page)).not.toBe(shot);
    // Pointer: the ship follows, a press fires.
    shot = await frame(page);
    const box = (await field(page).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect.poll(() => frame(page)).not.toBe(shot);

    // Game keys neither scroll the page nor reach the shortcuts or eggs.
    const scroll = await page.evaluate(() => scrollY);
    const theme = await page.evaluate(() => document.documentElement.className);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("d");
    await page.keyboard.type("kitty");
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    expect(await page.evaluate(() => document.documentElement.className)).toBe(theme);
    await expect(page.locator("[data-cat]")).toHaveCount(0);

    // Esc: the days fly home, the field lifts away, focus returns, the graph is as it was.
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-game]")).toHaveCount(0);
    await expect(button(page)).toBeFocused();
    await expect(button(page)).toHaveAttribute("aria-expanded", "false");
    expect(await layout(page)).toEqual(before);
    expect((await svg.screenshot()).equals(graph)).toBe(true);
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe(theme);

    // Enter on the button starts it again.
    await button(page).focus();
    await page.keyboard.press("Enter");
    await expect(field(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-game]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("reduced motion: it plays and returns, with no errors", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = collectErrors(page);
    await toActivity(page);
    await button(page).click();
    await expect(field(page)).toBeFocused();
    // Colours are read correctly (the paper below the graph is the page's, not ink).
    await page.waitForTimeout(600);
    const paper = await field(page).evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext("2d")!.getImageData(4, canvas.height - 4, 1, 1).data]);
    expect(paper[0]).toBeGreaterThan(200);
    const shot = await frame(page);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(300);
    await page.keyboard.up("ArrowRight");
    await expect.poll(() => frame(page)).not.toBe(shot);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-game]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("tap to start, drag to steer (it fires by itself), the back control returns", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sound", "off"));
    const errors = collectErrors(page);
    await toActivity(page);
    const before = await layout(page);
    await button(page).tap();
    await expect(field(page)).toBeVisible();
    expect(await layout(page)).toEqual(before);
    await page.waitForTimeout(1800);
    const box = (await field(page).boundingBox())!;
    const shot = await frame(page);
    // A drag, as pointer events from a finger.
    await field(page).dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 7, clientX: box.x + box.width * 0.3, clientY: box.y + box.height * 0.9, isPrimary: true });
    await field(page).dispatchEvent("pointermove", { pointerType: "touch", pointerId: 7, clientX: box.x + box.width * 0.7, clientY: box.y + box.height * 0.9, isPrimary: true });
    await page.waitForTimeout(400);
    await expect.poll(() => frame(page)).not.toBe(shot);
    // The back control sits at the right of the heads-up line, just under the graph.
    const graph = (await page.locator("[data-calendar] svg").boundingBox())!;
    await page.touchscreen.tap(box.x + box.width - 20, graph.y + graph.height + 10);
    await expect(page.locator("[data-game]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
