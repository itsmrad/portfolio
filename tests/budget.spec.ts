import { expect, test } from "@playwright/test";

import { brotli, frameworkChunks, kb, resources, scriptBrotli, settle, sum } from "./helpers";

/**
 * The hard limits from the performance budget, measured on the home page of
 * the production build before any input. Scripts and HTML are sized in brotli,
 * the encoding production serves (`next start` only gzips, about 17% larger;
 * that figure is logged too). Fonts and images are sized as transferred.
 * Limits here change only with the lead's sign-off, never to make a test pass.
 */
const LIMIT = {
  homeJs: 140 * 1024,
  firstPartyJs: 30 * 1024,
  htmlCompressed: 30 * 1024,
  htmlRaw: 120 * 1024,
  fonts: 80 * 1024,
  // Sans, mono, serif and the pixel face: the owner's type decision needs four.
  fontFamilies: 4,
  fontPreloads: 2,
  images: 250 * 1024,
  singleImage: 120 * 1024,
  cls: 0.02,
};

test.use({ viewport: { width: 390, height: 844 } });

test("home page stays inside the budget", async ({ page, request }) => {
  // The size gates need loaded scripts to be the ones on disk.
  expect(frameworkChunks().length).toBeGreaterThan(0);
  // Record layout shifts from the very first frame, fonts swapping in included.
  await page.addInitScript(() => {
    const state = window as unknown as { __cls: number };
    state.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) state.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/");
  await settle(page);
  // Lazy images count too.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page);

  const all = await resources(page);
  const origin = new URL(page.url()).origin;
  const scripts = all.filter((resource) => resource.type === "script");
  const framework = frameworkChunks();
  const firstParty = scripts.filter((script) => !framework.some((chunk) => script.url.endsWith(chunk)));
  const fonts = all.filter((resource) => resource.type === "font");
  const images = all.filter((resource) => resource.type === "image");

  const js = (list: typeof scripts) => list.reduce((total, script) => total + scriptBrotli(script.url), 0);
  const html = await (await request.get("/")).body();
  const families = await page.evaluate(() => [...new Set([...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family))]);
  const preloads = await page.locator('link[rel="preload"][as="font"]').count();
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);

  const measured = {
    "home JS": `${kb(js(scripts))} brotli (${kb(sum(scripts))} as served with gzip), ${scripts.length} files`,
    "framework JS": `${kb(js(scripts) - js(firstParty))} brotli`,
    "first-party JS": `${kb(js(firstParty))} brotli`,
    HTML: `${kb(brotli(html))} brotli, ${kb(html.length)} raw`,
    fonts: `${kb(sum(fonts))} in ${fonts.length} files, ${families.length} families, ${preloads} preloaded`,
    images: `${kb(sum(images))} in ${images.length} files`,
    CLS: cls.toFixed(4),
  };
  console.log(`budget ${JSON.stringify(measured, null, 2)}`);
  test.info().annotations.push({ type: "measured", description: JSON.stringify(measured) });

  expect(scripts.filter((script) => !script.url.startsWith(origin)), "third-party scripts").toEqual([]);
  expect(all.filter((resource) => !resource.url.startsWith(origin)), "third-party requests").toEqual([]);
  expect(scripts.every((script) => script.bytes > 0), "every script reports a transfer size").toBe(true);
  expect(js(scripts), "home JS").toBeLessThanOrEqual(LIMIT.homeJs);
  expect(js(firstParty), "first-party JS").toBeLessThanOrEqual(LIMIT.firstPartyJs);
  expect(brotli(html), "HTML compressed").toBeLessThanOrEqual(LIMIT.htmlCompressed);
  expect(html.length, "HTML raw").toBeLessThanOrEqual(LIMIT.htmlRaw);
  expect(sum(fonts), "font bytes").toBeLessThanOrEqual(LIMIT.fonts);
  expect(families.length, `font families: ${families.join(", ")}`).toBeLessThanOrEqual(LIMIT.fontFamilies);
  expect(preloads, "preloaded fonts").toBeLessThanOrEqual(LIMIT.fontPreloads);
  expect(sum(images), "image bytes").toBeLessThanOrEqual(LIMIT.images);
  for (const image of images) expect(image.bytes, image.url).toBeLessThanOrEqual(LIMIT.singleImage);
  expect(cls, "cumulative layout shift").toBeLessThanOrEqual(LIMIT.cls);
});
