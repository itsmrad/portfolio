import { existsSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { brotli, frameworkChunks, kb, resources, scriptBrotli, settle, sum, VIEWPORTS } from "./helpers";

/**
 * The performance budget, measured on the home page of the production build
 * before any input, at phone and desktop widths. Scripts and HTML are sized in
 * brotli, the encoding production serves (`next start` only gzips; that figure
 * is logged too). Fonts and images are sized as transferred.
 *
 * Every number here is a lead ruling. Fix the code, not the number.
 */
const KB = 1024;
const LIMIT = {
  homeJs: 140 * KB,
  firstPartyJs: 30 * KB,
  html: 35 * KB,
  domElements: 1400,
  fonts: 80 * KB,
  // Sans, mono, serif and the pixel face.
  fontFamilies: 4,
  fontPreloads: 2,
  // Desktop only: one more face (handwriting for margin notes), at most this size.
  desktopFont: 15 * KB,
  images: 250 * KB,
  singleImage: 120 * KB,
  cls: 0.02,
};

/**
 * First-load script on top of the framework runtime is shared out between the
 * features. The foundation's own share is what it measures today; a feature's
 * allowance is unlocked when its content file exists (src/content/<file>),
 * which is when its branch has landed. So a branch that overspends fails here
 * on its own, instead of the merged site failing with nobody owning it.
 */
const FOUNDATION_JS = 6.5 * KB;
const ALLOWANCE: Record<string, number> = {
  "sound.ts": 2 * KB, // sound facade and mute toggle
  "command.ts": 3 * KB, // key listener 1 KB, theme toggle 2 KB
  "home.ts": 4 * KB, // hero monogram
  "footer.ts": 3 * KB, // footer extras
  "playful.ts": 3 * KB, // playful layer
};
// The lead holds 9 KB more and raises this as it is handed out.
const RELEASED_BY_LEAD = 0 * KB;

const landed = Object.keys(ALLOWANCE).filter((file) => existsSync(`src/content/${file}`));
const jsCeiling = Math.min(
  LIMIT.firstPartyJs,
  FOUNDATION_JS + landed.reduce((total, file) => total + ALLOWANCE[file]!, 0) + RELEASED_BY_LEAD,
);

/**
 * Load the home page with the web fonts held back for half a second, so the
 * page always paints in its fallback fonts first and the swap is always
 * measured. Without this the result depends on whether the fonts win a race.
 */
async function loadHome(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as { __cls: number };
    state.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) state.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.route("**/*.woff2", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto("/");
  await settle(page);
  // First load: after load and idle, before any scroll or input (R11).
  const firstLoad = await resources(page);
  // Lazy images count too, and in-view lazy scripts get their own ceiling.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page);
  return { firstLoad, all: await resources(page) };
}

for (const viewport of VIEWPORTS) {
  test(`home page stays inside the budget at ${viewport.width}px`, async ({ page, request, browser }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const { firstLoad, all } = await loadHome(page);
    const origin = new URL(page.url()).origin;

    const scripts = all.filter((resource) => resource.type === "script");
    const framework = frameworkChunks();
    expect(framework.length, "build manifest lists the framework chunks").toBeGreaterThan(0);
    const isFirstParty = (script: (typeof scripts)[number]) => !framework.some((chunk) => script.url.endsWith(chunk));
    const firstParty = firstLoad.filter((resource) => resource.type === "script").filter(isFirstParty);
    // Everything first-party requested once the whole page has been scrolled, in-view lazy chunks included.
    const firstPartyScrolled = scripts.filter(isFirstParty);
    const js = (list: typeof scripts) => list.reduce((total, script) => total + scriptBrotli(script.url), 0);

    const fonts = all.filter((resource) => resource.type === "font");
    const images = all.filter((resource) => resource.type === "image");
    const html = await (await request.get("/")).body();
    // Downloaded families only: the "… Fallback" faces are local system fonts.
    const families = await page.evaluate(() =>
      [...new Set([...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family))].filter((family) => !family.endsWith("Fallback")),
    );
    const preloads = await page.locator('link[rel="preload"][as="font"]').count();
    const elements = await page.locator("*").count();
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);

    const measured = {
      "home JS": `${kb(js(scripts))} brotli (${kb(sum(scripts))} as served with gzip), ${scripts.length} files`,
      "framework JS": `${kb(js(scripts) - js(firstParty))} brotli`,
      "first-party JS": `${kb(js(firstParty))} brotli of ${kb(jsCeiling)} (landed: ${landed.join(", ") || "foundation only"})`,
      "first-party files": firstParty.map((script) => `${script.url.split("/").pop()} ${kb(scriptBrotli(script.url))}`),
      "first-party JS after a full scroll": `${kb(js(firstPartyScrolled))} brotli of ${kb(LIMIT.firstPartyJs)}`,
      HTML: `${kb(brotli(html))} brotli (${kb(html.length)} raw), ${elements} elements`,
      fonts: `${kb(sum(fonts))} in ${fonts.length} files, ${families.length} families, ${preloads} preloaded`,
      images: `${kb(sum(images))} in ${images.length} files`,
      "CLS with late fonts": cls.toFixed(4),
    };
    console.log(`budget at ${viewport.width}px ${JSON.stringify(measured, null, 2)}`);
    test.info().annotations.push({ type: "measured", description: JSON.stringify(measured) });

    expect(all.filter((resource) => !resource.url.startsWith(origin)), "third-party requests").toEqual([]);
    expect(scripts.every((script) => script.bytes > 0), "every script reports a transfer size").toBe(true);
    expect(js(scripts), "home JS").toBeLessThanOrEqual(LIMIT.homeJs);
    expect(js(firstParty), "first-party JS against the allowances that have landed").toBeLessThanOrEqual(jsCeiling);
    expect(js(firstPartyScrolled), "first-party JS after a full-page scroll").toBeLessThanOrEqual(LIMIT.firstPartyJs);
    expect(brotli(html), "HTML as transferred").toBeLessThanOrEqual(LIMIT.html);
    expect(elements, "DOM elements").toBeLessThanOrEqual(LIMIT.domElements);
    expect(preloads, "preloaded fonts").toBeLessThanOrEqual(LIMIT.fontPreloads);
    expect(sum(images), "image bytes").toBeLessThanOrEqual(LIMIT.images);
    for (const image of images) expect(image.bytes, image.url).toBeLessThanOrEqual(LIMIT.singleImage);
    expect(cls, "cumulative layout shift with late fonts").toBeLessThanOrEqual(LIMIT.cls);

    if (viewport.name === "phone") {
      expect(sum(fonts), "font bytes").toBeLessThanOrEqual(LIMIT.fonts);
      expect(families.length, `font families: ${families.join(", ")}`).toBeLessThanOrEqual(LIMIT.fontFamilies);
    } else {
      // Whatever a phone does not load is the desktop-only extra: one face,
      // small, and (by the preload limit above) never preloaded.
      const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const onPhone = new Set((await loadHome(phone)).all.filter((resource) => resource.type === "font").map((font) => font.url));
      await phone.close();
      const extra = fonts.filter((font) => !onPhone.has(font.url));
      expect(extra.length, `desktop-only fonts: ${extra.map((font) => font.url).join(", ")}`).toBeLessThanOrEqual(1);
      expect(sum(extra), "desktop-only font bytes").toBeLessThanOrEqual(LIMIT.desktopFont);
      expect(sum(fonts) - sum(extra), "font bytes shared with phones").toBeLessThanOrEqual(LIMIT.fonts);
      expect(families.length, `font families: ${families.join(", ")}`).toBeLessThanOrEqual(LIMIT.fontFamilies + 1);
    }
  });
}
