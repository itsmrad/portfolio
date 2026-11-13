import { readFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";

import type { Page } from "@playwright/test";

export const SITE_URL = "https://www.anupamdas.me";
export const THEMES = ["light", "dark"] as const;
export const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/** Console errors and uncaught exceptions; hydration mismatches surface here in production builds. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

export type Resource = { url: string; type: string; bytes: number };

/** Every sub-resource the page has loaded so far, with compressed transfer bytes. */
export function resources(page: Page): Promise<Resource[]> {
  return page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map((entry) => ({
      url: entry.name,
      type: /\.woff2?(\?|$)/.test(entry.name)
        ? "font"
        : /\.js(\?|$)/.test(entry.name)
          ? "script"
          : /\/_next\/image|\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(entry.name)
            ? "image"
            : entry.initiatorType,
      bytes: entry.transferSize,
    })),
  );
}

export const sum = (items: Resource[]) => items.reduce((total, item) => total + item.bytes, 0);
export const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** Wait until the network has been quiet and then two more seconds, with no input. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

/**
 * Script bytes (brotli) a feature loads on demand. Use it to hold a lazy chunk to its
 * budget and to prove nothing of it loaded earlier:
 *
 *   const added = await scriptBytesAddedBy(page, () => page.keyboard.press("Control+k"));
 *   expect(added).toBeLessThanOrEqual(25 * 1024);
 */
export async function scriptBytesAddedBy(page: Page, trigger: () => Promise<unknown>) {
  const before = new Set((await resources(page)).map((resource) => resource.url));
  await trigger();
  await settle(page);
  const added = (await resources(page)).filter((resource) => resource.type === "script" && !before.has(resource.url));
  return added.reduce((total, script) => total + scriptBrotli(script.url), 0);
}

/** URLs of the framework runtime chunks (React, the router, the bundler runtime) from the build manifest. */
export function frameworkChunks(): string[] {
  const manifest = JSON.parse(readFileSync(".next/build-manifest.json", "utf8")) as { rootMainFiles: string[] };
  return manifest.rootMainFiles;
}

/** Brotli size, the encoding production serves (the local server only gzips). */
export function brotli(data: Buffer) {
  return brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
}

/** Brotli size of a built script, read from .next by its URL. */
export function scriptBrotli(url: string) {
  return brotli(readFileSync(`.next/${new URL(url).pathname.replace("/_next/", "")}`));
}

/** The page background as [r, g, b], whatever colour space the CSS used. */
export function background(page: Page) {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("2d")!;
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  });
}
export const BACKGROUND = { light: [255, 255, 255], dark: [9, 9, 11] };
