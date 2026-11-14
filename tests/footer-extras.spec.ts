import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, scriptBytesAddedBy, THEMES, VIEWPORTS } from "./helpers";

/** Brotli budget for everything the footer loads when it is reached (globe, signature drawing). */
const FOOTER_LAZY_BUDGET = 8 * 1024;

const strip = (page: Page) => page.locator("footer dl").first();
const ink = (page: Page) => page.locator("footer button svg path").first();
const toFooter = (page: Page) => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
// The signature signs once it is wholly in view and clear of the bottom 96px, as a reader would see it.
const toSignature = (page: Page) =>
  page.getByRole("button", { name: "Sign again" }).evaluate((button) => button.scrollIntoView({ block: "center" }));

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

test("without a store: no visitor cell, an empty shared read, and no write routes", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("footer dt", { hasText: "Visitors" })).toHaveCount(0);
  const shared = await request.get("/api/visit");
  expect(shared.status()).toBe(200);
  expect(await shared.json()).toEqual({});
  expect((await request.post("/api/visit")).status()).toBe(404);
  expect((await request.post("/api/visit/live?id=AbCdEfGhIjKlMnOpQrStUv")).status()).toBe(404);
  // Only GET and POST exist.
  for (const method of ["PUT", "DELETE", "PATCH"]) expect((await request.fetch("/api/visit", { method })).status()).toBe(405);
});

test("the strip scrambles in cell by cell without moving, then settles on the true text", async ({ page }) => {
  await page.goto("/");
  const spans = page.locator("footer [data-scramble]");
  const finals = await spans.allTextContents();
  expect(finals.length).toBe(3);
  // Record every scrambled span's text and width on each frame from the moment the strip is reached.
  const frames = await strip(page).evaluate(async (element) => {
    const nodes = [...element.querySelectorAll<HTMLElement>("[data-scramble]")];
    // Instantly: on the full page a smooth scroll would still be on its way when the recording ends.
    element.scrollIntoView({ block: "center", behavior: "instant" });
    const samples: { text: string[]; width: number[] }[] = [];
    const start = performance.now();
    while (performance.now() - start < 2500) {
      await new Promise(requestAnimationFrame);
      samples.push({ text: nodes.map((node) => node.textContent ?? ""), width: nodes.map((node) => node.getBoundingClientRect().width) });
    }
    return samples;
  });
  finals.forEach((final, index) => {
    // It really scrambled: some frame showed other glyphs, always as many characters.
    expect(frames.some((frame) => frame.text[index] !== final)).toBe(true);
    expect(frames.every((frame) => frame.text[index]!.length === final.length)).toBe(true);
    // And never moved: the same width on every frame.
    expect(new Set(frames.map((frame) => frame.width[index])).size).toBe(1);
  });
  expect(await spans.allTextContents()).toEqual(finals);
  expect(await strip(page).innerText()).toMatch(/\b\d{2}:\d{2} IST\b/);
});

/** Owner in Asia/Kolkata (UTC+5:30, no DST): what the clock tells visitors elsewhere. */
const ZONES = [
  { zone: "America/Los_Angeles", date: "2026-11-13T12:00:00Z", note: "13h 30m ahead of you" },
  { zone: "America/Los_Angeles", date: "2026-07-01T12:00:00Z", note: "12h 30m ahead of you" },
  { zone: "America/Denver", date: "2026-11-13T12:00:00Z", note: "12h 30m ahead of you" },
  { zone: "Pacific/Honolulu", date: "2026-11-13T12:00:00Z", note: "15h 30m ahead of you" },
  { zone: "Europe/London", date: "2026-11-13T12:00:00Z", note: "5h 30m ahead of you" },
  { zone: "Europe/London", date: "2026-07-01T12:00:00Z", note: "4h 30m ahead of you" },
  { zone: "Asia/Kathmandu", date: "2026-11-13T12:00:00Z", note: "15m behind you" },
  { zone: "Asia/Tokyo", date: "2026-11-13T12:00:00Z", note: "3h 30m behind you" },
  { zone: "Pacific/Auckland", date: "2026-11-13T12:00:00Z", note: "7h 30m behind you" },
  { zone: "Pacific/Auckland", date: "2026-07-01T12:00:00Z", note: "6h 30m behind you" },
  { zone: "Asia/Kolkata", date: "2026-11-13T12:00:00Z", note: null },
] as const;

for (const { zone, date, note } of ZONES) {
  test(`the clock is true for a visitor in ${zone} on ${date.slice(0, 10)}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: zone });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(date));
    await page.goto("/");
    const time = page.locator("footer dd", { hasText: " IST" }).first();
    // 12:00 UTC is 17:30 in New Delhi.
    await expect(time).toContainText("17:30 IST");
    const text = (await time.textContent()) ?? "";
    if (note) expect(text).toContain(`· ${note}`);
    else expect(text).not.toMatch(/ahead|behind|·/);
    await context.close();
  });
}

test("if the footer's code cannot load, the signature still shows signed and nothing throws", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // From here on every script request fails, as after going offline or a newer deployment.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await toFooter(page);
  await toSignature(page);
  // Shown whole at once: a real drawing would still be mid-stroke after 300ms.
  await expect(ink(page)).toHaveCSS("opacity", "1", { timeout: 300 });
  await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px", { timeout: 300 });
  await page.waitForTimeout(500);
  await expect(page.locator("footer [data-drawn]")).toHaveCount(0);
  expect(errors.filter((error) => !error.includes("Failed to load resource"))).toEqual([]);
});

test("the signature is a button the hand-drawn hover applies to", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign again" })).toHaveAttribute("data-slot", "button");
});

test("the signature draws when seen, and the pen signs it again on click", async ({ page }) => {
  await page.goto("/");
  await expect(ink(page)).toHaveCSS("opacity", "0");
  await toSignature(page);
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
    await toSignature(page);
    await expect(ink(page)).toHaveCSS("stroke-dashoffset", "0px");
    await expect(ink(page)).toHaveCSS("opacity", "1");
    await toFooter(page);
    await expect(page.locator("footer [data-drawn]")).toHaveCount(1);
    const frame = () => page.locator("footer canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    const still = await frame();
    await page.waitForTimeout(1000);
    expect(await frame()).toBe(still);
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

/** The map's states, with the counter's answers stood in (this build has no store). */
type Stats = { count?: number; live?: number; cells?: number[][] };
async function withMap(page: Page, stats: Stats, you: object = {}) {
  await page.route("**/api/visit", (route) => route.fulfill({ json: route.request().method() === "GET" ? stats : {} }));
  await page.route("**/api/visit/live?**", (route) => route.fulfill({ json: you }));
}
const globe = (page: Page) => page.locator("footer [data-drawn]");
const shownLabels = (page: Page) =>
  page.locator("footer [data-label][data-shown]").evaluateAll((labels) => labels.map((label) => (label as HTMLElement).dataset.label));
const caption = (page: Page) => page.locator("footer [data-caption]");

/** Every shown tag inside the stage, none overlapping another; the caption inside the footer. */
async function laidOutCleanly(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const stage = document.querySelector("footer [data-drawn]")!.getBoundingClientRect();
    const tags = [...document.querySelectorAll("footer [data-label][data-shown]")].map((tag) => tag.getBoundingClientRect());
    for (const t of tags) {
      if (t.left < Math.max(0, stage.left) || t.right > Math.min(innerWidth, stage.right) || t.top < stage.top || t.bottom > stage.bottom) {
        issues.push("a tag leaves the clear area");
      }
    }
    tags.forEach((a, i) =>
      tags.slice(i + 1).forEach((b) => {
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) issues.push("tags overlap");
      }),
    );
    const note = document.querySelector("footer [data-caption]")!.getBoundingClientRect();
    if (note.right > innerWidth || note.left < 0 || note.bottom > document.querySelector("footer")!.getBoundingClientRect().bottom + 1) {
      issues.push("caption overflows");
    }
    return issues;
  });
}

const MANY: number[][] = [
  ...Array.from({ length: 30 }, (_, i) => [24 + (i % 7), 72 + (i % 9), 1 + (i % 5)]),
  ...Array.from({ length: 30 }, (_, i) => [45 + (i % 10), -5 + (i % 15), 1 + (i % 3)]),
  ...Array.from({ length: 30 }, (_, i) => [30 + (i % 15), -120 + i, 1 + (i % 4)]),
  [82, 30, 2],
  [-78, 0, 1],
  [5, 179, 3],
  [-40, -178, 2],
];

test.describe("the visitor map", () => {
  test("with no store: the plain globe and Anupam's pin, no dots, no caption, nothing in the console", async ({ page }) => {
    const errors = collectErrors(page);
    await withMap(page, {});
    await page.goto("/");
    await toFooter(page);
    await expect(globe(page)).toHaveAttribute("data-visitors", "0");
    await expect.poll(() => shownLabels(page)).toEqual(["home"]);
    await expect(caption(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("with an empty store: the caption, no dots, and this visitor's distance", async ({ page }) => {
    await withMap(page, { count: 0, live: 0, cells: [] }, { you: [52, 0], distance: { value: 6700, unit: "km" } });
    await page.goto("/");
    await toFooter(page);
    await expect(caption(page)).toBeVisible();
    await expect(caption(page)).toContainText("you're about 6,700 km from Anupam");
    await expect(globe(page)).toHaveAttribute("data-visitors", "0");
  });

  test("one visitor: one dot", async ({ page }) => {
    await withMap(page, { count: 1, live: 1, cells: [[29, 76, 1]] });
    await page.goto("/");
    await toFooter(page);
    await expect(globe(page)).toHaveAttribute("data-visitors", "1");
  });

  test("you and Anupam in the same cell: one merged label and a warmer line", async ({ page }) => {
    await withMap(page, { count: 5, live: 2, cells: [[29, 77, 5]] }, { you: [29, 77], distance: { same: true } });
    await page.goto("/");
    await toFooter(page);
    // Anupam's tag speaks for both; the visitor's own tag stands down.
    await expect.poll(() => shownLabels(page)).toEqual(["home"]);
    await expect(page.locator('footer [data-label="home"]')).toHaveText("you're both here");
    await expect(caption(page)).toContainText("you're in Anupam's city");
    await expect(page.locator("footer [data-distance-line]")).toHaveText("you're in Anupam's city");
  });

  test("an unknown place: no 'you' and no distance line", async ({ page }) => {
    await withMap(page, { count: 5, live: 1, cells: MANY });
    await page.goto("/");
    await toFooter(page);
    await expect(caption(page)).toBeVisible();
    await expect(page.locator("footer [data-distance-line]")).toHaveText("");
    expect(await shownLabels(page)).not.toContain("you");
  });

  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    for (const theme of THEMES) {
      test(`many visitors at ${width}px, ${theme}: labels never overlap or leave the drawing`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme });
        const errors = collectErrors(page);
        // A visitor close to Anupam, so both labels compete for room.
        await withMap(page, { count: 1284, live: 3, cells: MANY }, { you: [19, 73], distance: { value: 1200, unit: "km" } });
        await page.goto("/");
        await toFooter(page);
        await expect.poll(() => shownLabels(page)).toEqual(["home", "you"]);
        // Across the turn, too.
        for (let i = 0; i < 4; i++) {
          expect(await laidOutCleanly(page)).toEqual([]);
          await page.waitForTimeout(700);
        }
        expect(Number(await globe(page).getAttribute("data-visitors"))).toBeGreaterThan(0);
        expect(errors).toEqual([]);
      });
    }
  }

  test("is the same whatever the visitor's time zone", async ({ browser }) => {
    const seen: unknown[] = [];
    for (const timezoneId of ["Pacific/Auckland", "America/Los_Angeles", "Asia/Kolkata"]) {
      const context = await browser.newContext({ timezoneId, reducedMotion: "reduce" });
      const page = await context.newPage();
      await withMap(page, { count: 7, live: 2, cells: MANY }, { you: [52, 0], distance: { value: 4200, unit: "mi" } });
      await page.goto("/");
      await toFooter(page);
      await expect(caption(page)).toBeVisible();
      await expect(caption(page)).toContainText("4,200 miles");
      await expect.poll(() => shownLabels(page)).toContain("you");
      seen.push([await globe(page).getAttribute("data-visitors"), await shownLabels(page), await caption(page).textContent()]);
      await context.close();
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
  });

  test("under reduced motion the map is drawn whole at once and holds still", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await withMap(page, { count: 7, live: 2, cells: MANY }, { you: [52, 0], distance: { value: 6700, unit: "km" } });
    await page.goto("/");
    await toFooter(page);
    await expect(caption(page)).toBeVisible();
    const first = await page.locator("footer canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    await page.waitForTimeout(1500);
    expect(await page.locator("footer canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(first);
    await context.close();
  });
});
