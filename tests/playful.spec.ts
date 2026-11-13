import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, resources, scriptBrotli, scriptBytesAddedBy, settle } from "./helpers";

/**
 * The margins, the hero stickers, the hand-drawn hovers and the easter eggs.
 * The stickers are in the HTML; everything else is fetched on the visitor's
 * first input, so the wide tests move the mouse and wait for the pieces.
 */
const WIDE = { width: 1440, height: 900 };
const SECTIONS = ["top", "about", "experience", "work", "building", "activity", "stack", "education", "contact"];
/** Lazy script budgets, brotli. */
const BUDGET = { woken: 8 * 1024, summoned: 2 * 1024 };
const KONAMI = "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a".split(" ");

const margins = (page: Page) => page.locator('[data-margin="right"] [data-measures="contact"]');
const toast = (page: Page) => page.locator("#playful-toast");

/** Moves the mouse until the layer has heard it (the listeners attach at hydration). */
async function wake(page: Page) {
  let x = 700;
  await expect(async () => {
    await page.mouse.move(x++, 450);
    await expect(page.locator("[data-margin]")).toHaveCount(2, { timeout: 250 });
    await expect(toast(page)).toBeAttached({ timeout: 250 });
  }).toPass();
}

async function openWide(page: Page) {
  await page.goto("/");
  await wake(page);
  await expect(margins(page)).toBeAttached();
  await settle(page);
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("gets three stickers clear of the hero text, and nothing of the margins", async ({ page }) => {
    const errors = collectErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    // Count media-query checks: on a phone the loader must not run one per touch.
    await page.addInitScript(() => {
      const state = window as unknown as { __queries: number };
      const real = window.matchMedia.bind(window);
      state.__queries = 0;
      window.matchMedia = (query) => (state.__queries++, real(query));
    });
    await page.goto("/");
    await expect(page.locator("[data-sticker]:visible")).toHaveCount(3);
    await settle(page);
    const queries = () => page.evaluate(() => (window as unknown as { __queries: number }).__queries);
    const before = await queries();
    for (let tap = 0; tap < 5; tap++) await page.locator('[data-sticker="keycap"] > div').tap();
    expect(await queries()).toBe(before);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 0));

    // The gutters render nothing and download nothing: no chunk, no handwriting face, no eggs.
    expect(await page.locator('[data-slot="gutter"]').evaluateAll((gutters) => gutters.map((gutter) => gutter.childElementCount))).toEqual([0, 0]);
    expect(requests.filter((url) => /caveat/i.test(url))).toEqual([]);
    await expect(page.locator('link[rel="preload"][href*="caveat" i]')).toHaveCount(0);
    await expect(toast(page)).toHaveCount(0);

    // Every sticker stays off the name, the tagline, the portrait and any control in the hero.
    const overlaps = await page.evaluate(() => {
      const boxes = (selector: string) => [...document.querySelectorAll(selector)].map((element) => element.getBoundingClientRect());
      const content = boxes("#top :is(h1, p, a, button, img)");
      const shown = boxes("[data-sticker]").filter((sticker) => sticker.width > 0);
      return shown.filter((sticker) =>
        content.some((box) => sticker.left < box.right && box.left < sticker.right && sticker.top < box.bottom && box.top < sticker.bottom),
      ).length;
    });
    expect(overlaps).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
});

test.describe("wide", () => {
  test.use({ viewport: WIDE });

  test("the handwriting face is fetched once, small, and never preloaded", async ({ page }) => {
    await openWide(page);
    const fonts = (await resources(page)).filter((resource) => /caveat/i.test(resource.url));
    expect(fonts).toHaveLength(1);
    expect(fonts[0]!.bytes).toBeLessThanOrEqual(15 * 1024);
    await expect(page.locator('link[rel="preload"][href*="caveat" i]')).toHaveCount(0);
    await expect(page.locator('[data-margin="left"]')).toHaveAttribute("data-inked", "");
  });

  test("the margins state real measurements and sit beside their sections", async ({ page }) => {
    const errors = collectErrors(page);
    await openWide(page);

    const measured = await page.evaluate((ids) => {
      const height = (id: string) => Math.round(document.getElementById(id)!.getBoundingClientRect().height);
      return {
        heights: ids.map((id) => [document.querySelector(`[data-measures="${id}"]`)?.textContent, String(height(id))]),
        widths: [...document.querySelectorAll('[data-axis="x"]')].map((line) => [
          line.textContent,
          String(Math.round(line.closest('[data-slot="gutter"]')!.getBoundingClientRect().width)),
        ]),
        notes: [...document.querySelectorAll<HTMLElement>("[data-note]")].map((note) => {
          const anchor = document.getElementById(note.dataset.note!)!.getBoundingClientRect();
          const box = note.getBoundingClientRect();
          return box.top >= anchor.top && box.top <= anchor.bottom;
        }),
      };
    }, SECTIONS);
    for (const [shown, real] of [...measured.heights, ...measured.widths]) expect(shown).toBe(real);
    expect(measured.widths).toHaveLength(2);
    expect(measured.notes).toHaveLength(7);
    expect(measured.notes.every(Boolean)).toBe(true);

    // Decoration: hidden from assistive tech, nothing to focus, no sideways scroll.
    for (const gutter of await page.locator('[data-slot="gutter"]').all()) await expect(gutter).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(':is([data-slot="gutter"], #top [aria-hidden]) :is(a[href], button, input, select, textarea, [tabindex])')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

    // The whole layer is a small part of the page's element budget.
    const elements = await page.evaluate(
      () => document.querySelectorAll(':is([data-slot="gutter"], [data-sticker], #playful-toast) *, [data-sticker]').length,
    );
    console.log(`playful elements at 1440: ${elements}`);
    expect(elements).toBeLessThanOrEqual(160);
    expect(errors).toEqual([]);
  });

  test("the dots light under the pointer and the ruler follows the page", async ({ page }) => {
    await openWide(page);
    // The state the code writes, not a value partway through its fade.
    const lit = () => page.locator('[data-margin="right"] [data-lit]').evaluate((layer: HTMLElement) => layer.style.getPropertyValue("--on"));
    await page.mouse.move(1150, 600);
    await expect.poll(lit).toBe("1");
    await page.mouse.move(720, 600);
    await expect.poll(lit).toBe("0");

    await page.locator('[data-rail="experience"]').click();
    await expect(page.locator('[data-rail="experience"]')).toHaveAttribute("data-active", "true");
    const top = await page.locator("#experience").evaluate((section) => section.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(WIDE.height * 0.42);
  });

  test("stickers lean toward the pointer and sink when pressed", async ({ page }) => {
    await openWide(page);
    const sticker = page.locator('[data-sticker="terminal"] > div');
    const box = (await sticker.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.25);
    // Right of centre leans right; any hover lifts.
    await expect.poll(() => sticker.evaluate((element) => Number(element.style.getPropertyValue("--x")))).toBeGreaterThan(2);
    await expect.poll(() => sticker.evaluate((element) => Number(element.style.getPropertyValue("--y")))).toBeLessThan(-5);
    await page.mouse.down();
    await expect.poll(() => sticker.evaluate((element) => getComputedStyle(element).scale)).toBe("0.94");
    await page.mouse.up();
    await page.mouse.move(720, 500);
    await expect.poll(() => sticker.evaluate((element) => Number(element.style.getPropertyValue("--y")))).toBe(0);
  });

  test("hand-drawn hovers attach to the shared hooks", async ({ page }) => {
    await openWide(page);
    // End states only: with transitions off, a hover style is either applied or not.
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
    const link = page.locator("main a.link-underline").first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    expect(await link.evaluate((element) => getComputedStyle(element).textDecorationStyle)).toBe("wavy");
    // No <Button> is on the page until the resume exists, so one is added to check the hook.
    await page.evaluate(() => document.querySelector("main")!.insertAdjacentHTML("afterbegin", '<a data-slot="button" id="probe" href="#top">Probe</a>'));
    const size = () => page.locator("#probe").evaluate((element) => getComputedStyle(element, "::before").backgroundSize);
    expect(await size()).toBe("0px 1.25px, 0px 1.25px");
    await page.locator("#probe").hover();
    expect(await size()).toBe("100% 1.25px, 100% 1.25px");
    // Same four lines around an icon-only 32px control (R10 puts the hook on those too).
    await page.evaluate(() =>
      document.querySelector("#probe")!.insertAdjacentHTML("afterend", '<button data-slot="button" id="icon" style="width:32px;height:32px"></button>'),
    );
    await page.locator("#icon").hover();
    const box = await page.locator("#icon").evaluate((element) => {
      const style = getComputedStyle(element, "::after");
      return [style.backgroundSize, style.width, style.height];
    });
    expect(box).toEqual(["1.25px 100%, 1.25px 100%", "40px", "40px"]);
  });

  test("an egg whose chunk fails does nothing, and works on the next try", async ({ page }) => {
    const thrown: string[] = [];
    await openWide(page);
    page.on("pageerror", (error) => thrown.push(String(error)));
    await page.route("**/_next/static/chunks/**", (route) => route.abort());

    for (const key of KONAMI) await page.keyboard.press(key);
    await page.keyboard.type("kitty");
    await page.locator('header a[href="/"]').click({ button: "right" });
    await page.waitForTimeout(1000);
    // Nothing happened, nothing claims it did, and nothing was thrown.
    await expect(page.locator("html")).not.toHaveAttribute("data-exploded");
    await expect(page.locator("[data-cat], [role='menu']")).toHaveCount(0);
    await expect(toast(page)).toHaveText("");
    expect(thrown).toEqual([]);

    await page.unroute("**/_next/static/chunks/**");
    for (const key of KONAMI) await page.keyboard.press(key);
    await expect(page.locator("html")).toHaveAttribute("data-exploded", "on");
    await expect(toast(page)).toHaveText(/Exploded view/);
    expect(thrown).toEqual([]);
  });

  test("easter eggs: summoned by keys, announced politely, dismissed with Escape", async ({ page, context }) => {
    const errors = collectErrors(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openWide(page);
    await expect(toast(page)).toHaveAttribute("role", "status");
    const title = await page.title();

    // Konami: the exploded view. Its last letter must not also fire the "a" shortcut.
    for (const key of KONAMI) await page.keyboard.press(key);
    await expect(page.locator("html")).toHaveAttribute("data-exploded", "on");
    await expect(toast(page)).toHaveText(/Exploded view/);
    expect(new URL(page.url()).hash).toBe("");
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("data-exploded", "off");

    // Shift+R: "hot reload" replays the entrance.
    await page.keyboard.press("Shift+R");
    await expect(toast(page)).toHaveText("Performing hot reload...");
    await expect(page.locator("[data-sticker]:visible")).toHaveCount(5);

    // A typed word wakes the cat; Escape sends it home.
    await page.keyboard.type("kitty");
    await expect(page.locator("[data-cat]")).toBeAttached();
    await expect(page.locator("[data-cat-bed]")).toHaveAttribute("data-away", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-cat]")).toHaveCount(0);

    // Right-click the mark: a real menu that takes focus and gives it back.
    const mark = page.locator('header a[href="/"]');
    await mark.click({ button: "right" });
    const item = page.getByRole("menu", { name: "Brand mark" }).getByRole("menuitem", { name: "Copy mark as SVG" });
    await expect(item).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(mark).toBeFocused();
    await mark.click({ button: "right" });
    await page.keyboard.press("Enter");
    await expect(toast(page)).toHaveText("Mark copied as SVG");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"[\s\S]+<\/svg>$/);
    await expect(mark).toBeFocused();

    // Leaving the tab changes its title until the visitor is back.
    const visibility = (hidden: boolean) =>
      page.evaluate((value) => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
        document.dispatchEvent(new Event("visibilitychange"));
      }, hidden);
    await visibility(true);
    expect(await page.title()).toBe("Come back, the ink is still wet");
    await visibility(false);
    expect(await page.title()).toBe(title);
    expect(errors).toEqual([]);
  });

  test("the 404 keeps only what needs no section", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/no-such-page");
    await wake(page);
    await settle(page);
    await expect(page.locator("[data-note], [data-measures], [data-rail], [data-sticker]")).toHaveCount(0);
    expect(errors.filter((error) => !error.includes("404"))).toEqual([]);
  });

  test("nothing shifts while the layer arrives", async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as unknown as { __cls: number };
      state.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) state.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await openWide(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    console.log(`playful CLS at 1440: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThanOrEqual(0.02);
  });

  test("lazy chunks stay inside their budgets", async ({ page }) => {
    // Untouched, the page has fetched none of the layer's chunks.
    await page.goto("/");
    await settle(page);
    await expect(margins(page)).toHaveCount(0);
    const before = new Set((await resources(page)).map((resource) => resource.url));

    await wake(page);
    await settle(page);
    const woken = (await resources(page)).filter((resource) => resource.type === "script" && !before.has(resource.url));
    const wokenBytes = woken.reduce((total, script) => total + scriptBrotli(script.url), 0);

    const exploded = await scriptBytesAddedBy(page, async () => {
      for (const key of KONAMI) await page.keyboard.press(key);
    });
    await page.keyboard.press("Escape");
    const cat = await scriptBytesAddedBy(page, () => page.keyboard.type("kitty"));
    await page.keyboard.press("Escape");
    const menu = await scriptBytesAddedBy(page, () => page.locator('header a[href="/"]').click({ button: "right" }));

    const measured = {
      "first input (margins, eggs, sticker lean)": `${kb(wokenBytes)} in ${woken.length} files`,
      "exploded view": kb(exploded),
      "cursor cat": kb(cat),
      "mark menu": kb(menu),
    };
    console.log(`playful lazy JS, brotli ${JSON.stringify(measured, null, 2)}`);
    test.info().annotations.push({ type: "measured", description: JSON.stringify(measured) });
    expect(wokenBytes).toBeGreaterThan(0);
    expect(wokenBytes).toBeLessThanOrEqual(BUDGET.woken);
    for (const bytes of [exploded, cat, menu]) expect(bytes).toBeLessThanOrEqual(BUDGET.summoned);
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: WIDE, reducedMotion: "reduce" });

  test("everything is still: no loops, no lean, no cat", async ({ page }) => {
    const errors = collectErrors(page);
    await openWide(page);
    // Stickers are simply there, and no animation is left running.
    for (const sticker of await page.locator("[data-sticker]").all()) await expect(sticker).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);

    const sticker = page.locator('[data-sticker="terminal"] > div');
    await sticker.hover();
    await page.waitForTimeout(300);
    expect(await sticker.evaluate((element) => element.style.getPropertyValue("--y"))).toBe("");
    await expect(sticker).toHaveCSS("scale", "none");

    await page.evaluate(() => window.dispatchEvent(new CustomEvent("playful:summon", { detail: "cat" })));
    await page.waitForTimeout(500);
    await expect(page.locator("[data-cat]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
