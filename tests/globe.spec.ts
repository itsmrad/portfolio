import { expect, test, type Page } from "@playwright/test";

import { facing, orient, unit } from "../src/components/footer/globe";
import { standIn } from "../src/components/footer/stand-in";
import { collectErrors, THEMES } from "./helpers";

/**
 * The footer globe: the whole Earth on its 23.4° axis, turned by pointer,
 * touch and keys, with the visitor map moving with it. The counter's answers
 * are stood in per test (this build has no store).
 */
const TILT = 23.44;
const DELHI: [number, number] = [28.61, 77.21];

/** Sheet coordinates (x right, y up, z toward the viewer) of a place under a view. */
function project(view: { yaw: number; pitch: number }, place: [number, number]): [number, number, number] {
  const m = orient(view.yaw, view.pitch);
  const [x, y, z] = unit(...place);
  return [m[0]! * x + m[1]! * y + m[2]! * z, m[3]! * x + m[4]! * y + m[5]! * z, m[6]! * x + m[7]! * y + m[8]! * z];
}
const close = (actual: number[], expected: number[]) => actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 6));

test.describe("projection", () => {
  test("the axis leans 23.44° from vertical, north to the right, whatever the turn", () => {
    for (const yaw of [0, 1, 2.5, -3]) {
      const [x, y, z] = project({ yaw, pitch: 0 }, [90, 0]);
      close([x, y, z], [Math.sin((TILT * Math.PI) / 180), Math.cos((TILT * Math.PI) / 180), 0]);
    }
    // Tipped toward the viewer, the pole comes forward along the same leaning line.
    const [x, y] = project({ yaw: 0, pitch: 0.5 }, [90, 0]);
    expect((Math.atan2(x, y) * 180) / Math.PI).toBeCloseTo(TILT, 6);
  });

  test("known places land where expected", () => {
    // Facing New Delhi puts it dead centre, nearest the viewer.
    close(project(facing(...DELHI), DELHI), [0, 0, 1]);
    // Facing 0°, 0°: 90°E sits on the right limb, dropped by the tilt; the North Pole on the upper right limb.
    const view = facing(0, 0);
    close(project(view, [0, 90]), [Math.cos((TILT * Math.PI) / 180), -Math.sin((TILT * Math.PI) / 180), 0]);
    // London is north (up and right of up, along the axis) and a little west of Accra.
    const [lx, ly, lz] = project(view, [51.5, -0.13]);
    expect(lz).toBeGreaterThan(0);
    expect(ly).toBeGreaterThan(0.6);
    expect(lx).toBeGreaterThan(0.2);
    // Tokyo is east of New Delhi: to its right when New Delhi faces the viewer.
    const tokyo = project(facing(...DELHI), [35.68, 139.69]);
    expect(tokyo[0]).toBeGreaterThan(0.5);
  });

  test("the far side is behind the Earth", () => {
    // The antipode of the place in front, and anything more than 90° away, faces away.
    expect(project(facing(...DELHI), [-28.61, -102.79])[2]).toBeCloseTo(-1, 6);
    expect(project(facing(...DELHI), [40.7, -74])[2]).toBeLessThan(0);
    expect(project(facing(...DELHI), [51.5, -0.13])[2]).toBeGreaterThan(0);
  });

  test("the home view stays upright: it never tips past 45° north or 30° south", () => {
    expect(facing(80, 0).pitch).toBeCloseTo((45 * Math.PI) / 180, 6);
    expect(facing(-70, 0).pitch).toBeCloseTo((-30 * Math.PI) / 180, 6);
  });
});

test("the preview stand-in never runs on Vercel and is off unless asked for", () => {
  const saved = { ...process.env };
  try {
    delete process.env.GLOBE_PREVIEW_STAND_IN;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    expect(standIn()).toBeNull();
    process.env.GLOBE_PREVIEW_STAND_IN = "1";
    const data = standIn();
    expect(data?.stats.cells.length).toBeGreaterThan(40);
    expect(data?.you).toEqual([41, -74]);
    for (const [name, value] of [
      ["VERCEL", "1"],
      ["VERCEL_ENV", "production"],
      ["VERCEL_ENV", "preview"],
    ]) {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      process.env[name!] = value;
      expect(standIn(), `${name}=${value}`).toBeNull();
    }
  } finally {
    process.env = saved;
  }
});

/* --- In the page --------------------------------------------------------- */

type Stats = { count?: number; live?: number; cells?: number[][] };
async function withMap(page: Page, stats: Stats, you: object = {}) {
  await page.route("**/api/visit", (route) => route.fulfill({ json: route.request().method() === "GET" ? stats : {} }));
  await page.route("**/api/visit/live?**", (route) => route.fulfill({ json: you }));
}

// A seeded spread: clusters in India, Europe and the Americas, and places on every side of the Earth.
let seed = 3;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const MANY: number[][] = [
  ...[
    [28, 77, 10, 30],
    [50, 5, 14, 30],
    [38, -95, 30, 30],
    [-20, -50, 16, 10],
    [35, 135, 10, 10],
    [-30, 140, 20, 8],
    [5, 20, 30, 8],
  ].flatMap(([lat, lon, spread, n]) =>
    Array.from({ length: n! }, () => [
      Math.round(lat! + (random() - 0.5) * spread!),
      Math.round(lon! + (random() - 0.5) * spread!),
      1 + Math.floor(random() * 30),
    ]),
  ),
  [82, 30, 2],
  [-78, 0, 1],
  [5, 179, 3],
  [-40, -178, 2],
];

const stage = (page: Page) => page.locator("footer [data-drawn]");
const canvas = (page: Page) => page.locator("footer figure canvas");
const snapshot = (page: Page) => canvas(page).evaluate((element: HTMLCanvasElement) => element.toDataURL());
const shownLabels = (page: Page) =>
  page.locator("footer [data-label][data-shown]").evaluateAll((labels) => labels.map((label) => (label as HTMLElement).dataset.label));

/** Brings the figure to the middle of the screen at once, and waits for its first frame. */
async function toGlobe(page: Page) {
  await page.locator("footer figure").evaluate((figure) => figure.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(stage(page)).toHaveCount(1);
}

/** Where a label's leader ends, which is its dot, in stage pixels; null while the label is hidden. */
const dot = (page: Page, name: string) =>
  page.locator(`footer [data-label="${name}"]`).evaluate((tag: HTMLElement) => {
    if (!("shown" in tag.dataset)) return null;
    const [x, y] = (/translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(tag.style.transform) ?? []).slice(1).map(Number);
    const read = (name: string) => parseFloat(tag.style.getPropertyValue(name));
    const [length, angle] = [read("--len"), read("--angle")];
    return { x: x! + read("--lx") + 1 + length * Math.cos(angle), y: y! + read("--ly") + 1 + length * Math.sin(angle) };
  });
const middle = (page: Page) => stage(page).evaluate((element) => ({ x: element.clientWidth / 2, y: element.clientHeight / 2, r: Math.min(element.clientWidth * 0.36, 180) }));

/** Every shown tag inside the stage, none overlapping another. */
const laidOutCleanly = (page: Page) =>
  page.evaluate(() => {
    const issues: string[] = [];
    const frame = document.querySelector("footer [data-drawn]")!.getBoundingClientRect();
    const tags = [...document.querySelectorAll("footer [data-label][data-shown]")].map((tag) => tag.getBoundingClientRect());
    for (const t of tags) {
      if (t.left < frame.left || t.right > frame.right || t.top < frame.top || t.bottom > frame.bottom || t.left < 0 || t.right > innerWidth) {
        issues.push("a tag leaves the figure");
      }
    }
    tags.forEach((a, i) =>
      tags.slice(i + 1).forEach((b) => {
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) issues.push("tags overlap");
      }),
    );
    return issues;
  });

/** Presses a key and waits for the frame that shows it. */
async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function drag(page: Page, dx: number, dy: number, from?: { x: number; y: number }) {
  const box = (await stage(page).boundingBox())!;
  const start = from ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(start.x + (dx * i) / 10, start.y + (dy * i) / 10);
  // Hold still before letting go, so nothing is thrown.
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test.describe("held still (reduced motion), so every position is exact", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("home faces New Delhi; a drag carries the surface with the pointer; double-click and the reset return", async ({ page }) => {
    const errors = collectErrors(page);
    await withMap(page, {});
    await page.goto("/");
    await toGlobe(page);
    const centre = await middle(page);
    await expect.poll(() => dot(page, "home")).toBeTruthy();
    const home = (await dot(page, "home"))!;
    expect(Math.abs(home.x - centre.x)).toBeLessThan(1);
    expect(Math.abs(home.y - centre.y)).toBeLessThan(1);
    const before = await snapshot(page);
    // Drawn in the page's inks, not all in the text colour (reduced motion gives elements a tiny transition).
    const inks = await canvas(page).evaluate((element: HTMLCanvasElement) => {
      const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
      const seen = new Set<string>();
      for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 250) seen.add(`${data[i]! >> 4},${data[i + 1]! >> 4},${data[i + 2]! >> 4}`);
      return seen.size;
    });
    expect(inks).toBeGreaterThan(3);

    // Grab the globe just beside the pin and pull right: the pin follows the hand.
    await drag(page, 60, 0);
    const moved = (await dot(page, "home"))!;
    expect(moved.x - home.x).toBeGreaterThan(50);
    expect(moved.x - home.x).toBeLessThan(66);
    expect(Math.abs(moved.y - home.y)).toBeLessThan(8);
    expect(await snapshot(page)).not.toBe(before);
    // And down: north tips toward the viewer, so the pin goes down too.
    await drag(page, 0, 40);
    expect((await dot(page, "home"))!.y).toBeGreaterThan(moved.y + 30);

    // The reset control appears once turned, and turns it back.
    const reset = page.getByRole("button", { name: "reset view" });
    await expect(reset).toBeVisible();
    await reset.click();
    await expect.poll(async () => Math.abs((await dot(page, "home"))!.x - centre.x)).toBeLessThan(1);
    await drag(page, -120, 30);
    await stage(page).dblclick();
    await expect.poll(async () => Math.abs((await dot(page, "home"))!.y - centre.y)).toBeLessThan(1);
    // Under reduced motion it never moves by itself.
    const still = await snapshot(page);
    await page.waitForTimeout(1200);
    expect(await snapshot(page)).toBe(still);
    expect(errors).toEqual([]);
  });

  test("the keyboard turns it, never scrolls the page, and never traps focus", async ({ page }) => {
    await withMap(page, { count: 1284, live: 3, cells: MANY }, { you: [51, 0], distance: { value: 6700, unit: "km" } });
    await page.goto("/");
    await toGlobe(page);
    const globe = page.getByRole("application");
    await expect(globe).toHaveAttribute("aria-roledescription", "interactive globe");
    // Its name carries the same facts as the picture; the caption says the places are coarse.
    await expect(globe).toHaveAttribute("aria-label", /1,284 visitors so far from \d+ places, 3 on the site now/);
    await expect(globe).toHaveAttribute("aria-label", /you're about 6,700 km from Anupam/);
    await expect(globe).toHaveAccessibleDescription(/to about 100 km/i);

    await globe.focus();
    await expect(globe).toBeFocused();
    expect(await globe.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    const scrolled = await page.evaluate(() => scrollY);
    const centre = await middle(page);
    // The view has turned to show both places (the turn lands on the next frame).
    await expect.poll(() => shownLabels(page)).toEqual(["home", "you"]);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    // Home faces the middle of the great circle from London to New Delhi.
    const start = (await dot(page, "home"))!;
    await press(page, "ArrowRight");
    const right = (await dot(page, "home"))!;
    expect(right.x - start.x).toBeGreaterThan(0.15 * centre.r);
    await press(page, "ArrowDown");
    expect((await dot(page, "home"))!.y).toBeGreaterThan(right.y + 0.1 * centre.r);
    await press(page, "ArrowUp");
    await press(page, "ArrowLeft");
    const back = (await dot(page, "home"))!;
    expect(Math.abs(back.x - start.x)).toBeLessThan(1);
    expect(Math.abs(back.y - start.y)).toBeLessThan(1);
    // Twelve turns of 15° put New Delhi on the far side: its pin and label go.
    for (let i = 0; i < 12; i++) await press(page, "ArrowRight");
    expect(await shownLabels(page)).not.toContain("home");
    await press(page, "Home");
    await expect.poll(() => shownLabels(page)).toContain("home");
    expect(await page.evaluate(() => scrollY)).toBe(scrolled);
    // Tab moves on: to the reset, then out of the figure.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "reset view" })).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("figure"))).toBe(false);
  });

  test("on touch, a vertical swipe on the globe scrolls the page and a sideways one turns the globe", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    await withMap(page, {});
    await page.goto("/");
    await toGlobe(page);
    await expect(stage(page)).toHaveCSS("touch-action", "pan-y");
    const cdp = await context.newCDPSession(page);
    const box = (await stage(page).boundingBox())!;
    const swipe = async (dx: number, dy: number) => {
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12 }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(400);
    };
    await expect.poll(() => dot(page, "home")).toBeTruthy();
    const home = (await dot(page, "home"))!;
    const top = await page.evaluate(() => scrollY);
    await swipe(4, -220);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(top + 100);
    expect((await dot(page, "home"))?.x).toBeCloseTo(home.x, 0);

    await page.locator("footer figure").evaluate((figure) => figure.scrollIntoView({ block: "center", behavior: "instant" }));
    const level = await page.evaluate(() => scrollY);
    await swipe(80, 6);
    expect(await page.evaluate(() => scrollY)).toBe(level);
    expect((await dot(page, "home"))!.x).toBeGreaterThan(home.x + 40);
    await context.close();
  });
});

test.describe("motion", () => {
  test("it spins slowly, pauses on a drag, and stops off screen and in a hidden tab", async ({ page }) => {
    await withMap(page, {});
    await page.goto("/");
    await toGlobe(page);
    await page.waitForTimeout(400);
    const a = await snapshot(page);
    await page.waitForTimeout(600);
    expect(await snapshot(page), "idle spin").not.toBe(a);

    // A drag pauses the spin for a while.
    await drag(page, 40, 0);
    await page.waitForTimeout(800);
    const held = await snapshot(page);
    await page.waitForTimeout(1500);
    expect(await snapshot(page), "paused after a drag").toBe(held);

    // Off screen: nothing draws.
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(8000);
    const away = await snapshot(page);
    await page.waitForTimeout(1000);
    expect(await snapshot(page), "off screen").toBe(away);

    // Back in view it spins again; a hidden tab stops it.
    await toGlobe(page);
    await page.waitForTimeout(300);
    const back = await snapshot(page);
    await page.waitForTimeout(500);
    expect(await snapshot(page)).not.toBe(back);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    const hidden = await snapshot(page);
    await page.waitForTimeout(800);
    expect(await snapshot(page), "hidden tab").toBe(hidden);
  });

  test("a drag hint shows until the first turn, then never again", async ({ page }) => {
    await withMap(page, {});
    await page.goto("/");
    await toGlobe(page);
    expect(await page.evaluate(() => localStorage.getItem("globe-turned"))).toBeNull();
    await drag(page, 30, 0);
    expect(await page.evaluate(() => localStorage.getItem("globe-turned"))).toBe("1");
  });
});

test("the land arrives as one small asset, only when the globe comes near", async ({ page }) => {
  const asked: number[] = [];
  page.on("response", async (response) => {
    if (response.url().endsWith("/globe-land.bin")) asked.push((await response.body()).length);
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(asked).toEqual([]);
  await toGlobe(page);
  await expect.poll(() => asked.length).toBe(1);
  console.log(`globe land ${asked[0]} bytes raw`);
  expect(asked[0]).toBeLessThanOrEqual(3 * 1024);
});

test("with the land asset and the store both failing, the globe still draws and turns with Anupam's pin", async ({ page }) => {
  const errors = collectErrors(page);
  await page.route("**/globe-land.bin", (route) => route.abort());
  await page.route("**/api/visit**", (route) => route.abort());
  await page.goto("/");
  await toGlobe(page);
  await expect.poll(() => shownLabels(page)).toEqual(["home"]);
  await expect(stage(page)).toHaveAttribute("data-visitors", "0");
  const before = await snapshot(page);
  await drag(page, 80, 0);
  expect(await snapshot(page)).not.toBe(before);
  // Aborted requests log as failed loads; nothing else may.
  expect(errors.filter((error) => !/Failed to load resource/.test(error))).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  for (const theme of THEMES) {
    test(`many visitors at ${width}px, ${theme}: labels stay apart and inside the figure at every turn`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const errors = collectErrors(page);
      // A visitor near Anupam, so both labels compete for room.
      await withMap(page, { count: 1284, live: 3, cells: MANY }, { you: [19, 73], distance: { value: 1200, unit: "km" } });
      await page.goto("/");
      await toGlobe(page);
      await expect.poll(() => shownLabels(page)).toEqual(["home", "you"]);
      const { r } = await middle(page);
      for (const [dx, dy] of <[number, number][]>[
        [0, 0],
        [r * 0.5, 0],
        [-r, r * 0.3],
        [0, -r * 0.8],
        [r * 0.7, r * 0.7],
      ]) {
        await drag(page, dx, dy);
        expect(await laidOutCleanly(page)).toEqual([]);
      }
      expect(Number(await stage(page).getAttribute("data-visitors"))).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });
  }
}
