import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { background, BACKGROUND, collectErrors, THEMES, VIEWPORTS } from "./helpers";

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${theme} / ${viewport.name}`, () => {
      test.use({ colorScheme: theme, viewport: { width: viewport.width, height: viewport.height } });

      test("home renders clean, semantic HTML", async ({ page }) => {
        const errors = collectErrors(page);
        const response = await page.goto("/", { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        // Prerendered, not rendered per request.
        expect(response?.headers()["x-nextjs-prerender"]).toBeTruthy();

        await expect(page.locator("h1")).toHaveCount(1);
        for (const landmark of ["header", "main", "footer"]) {
          await expect(page.locator(landmark).first()).toBeVisible();
        }
        // Phones navigate by scrolling; the links appear from 640px. "Primary"
        // is a reserved landmark name: a phone dock must call itself something else.
        await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeVisible({ visible: viewport.width >= 640 });
        // Counters beside section titles stay out of the headings' names.
        const names = await page.locator("h2").evaluateAll((headings) =>
          headings.map((heading) => {
            const copy = heading.cloneNode(true) as Element;
            copy.querySelectorAll("[aria-hidden]").forEach((node) => node.remove());
            return copy.textContent!.trim();
          }),
        );
        for (const name of names) expect(name).not.toMatch(/\d$/);
        // Heading levels never skip.
        const levels = await page.locator("h1, h2, h3, h4").evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])));
        levels.reduce((previous, level) => {
          expect(level - previous, `heading jumps from h${previous} to h${level}`).toBeLessThanOrEqual(1);
          return level;
        }, 0);

        // The system theme applies with no stored choice and no class.
        expect(await background(page)).toEqual(BACKGROUND[theme]);

        // Full-bleed rules must not make the page scroll sideways.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      });

      test("404 is a real 404 with a way home", async ({ page }) => {
        const errors = collectErrors(page);
        const response = await page.goto("/no-such-page", { waitUntil: "networkidle" });
        expect(response?.status()).toBe(404);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator('main a[href="/"]')).toBeVisible();
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        // The only expected console error is the browser's own note about the 404 response.
        expect(errors.filter((error) => !error.includes("404"))).toEqual([]);
      });
    });
  }
}

test("skip link is the first stop and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText("Skip to content");
  await expect(focused).toHaveAttribute("href", "#main");
  await expect(page.locator("main#main")).toHaveCount(1);
});

test("every internal link and anchor resolves", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))]);
  for (const href of hrefs.filter((href) => href.startsWith("/") || href.startsWith("#"))) {
    const [path, hash] = href.split("#");
    if (path && path !== "/") expect((await request.get(path)).status(), href).toBe(200);
    if (hash) await expect(page.locator(`[id="${hash}"]`), href).toHaveCount(1);
  }
});

test("redirects from the old blog are permanent", async ({ request }) => {
  for (const path of ["/blog", "/blog/some-old-post"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(308);
    expect(response.headers().location, path).toBe("/");
  }
});

test("machine files are served with the right types", async ({ request }) => {
  const markdown = await request.get("/index.md");
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
  expect(markdown.headers().link).toBe('<https://www.anupamdas.me>; rel="canonical"');
  expect(await markdown.text()).toMatch(/^# Anupam Das\n/);

  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(llms.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  expect(await llms.text()).toContain("https://www.anupamdas.me/index.md");
});

test.describe("theme", () => {
  test.use({ colorScheme: "light" });

  test("a manual choice persists with no flash, and the system choice clears it", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    // Reserved name: no other control may be labelled exactly this.
    const toggle = page.getByRole("banner").getByRole("button", { name: "Toggle light and dark theme", exact: true });
    const themeColor = () => page.locator('meta[name="theme-color"]').first().getAttribute("content");

    await toggle.click();
    await expect(html).toHaveClass(/\bdark\b/);
    expect(await themeColor()).toBe("#09090b");

    // With every external script blocked, only the inline head script can have
    // applied the choice: it is there before first paint, with no hydration.
    await page.route("**/*.js", (route) => route.abort());
    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);
    expect(await background(page)).toEqual(BACKGROUND.dark);
    expect(await themeColor()).toBe("#09090b");
    await page.unroute("**/*.js");
    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);

    // Back to light, which is the system theme here: the override is dropped.
    await toggle.click();
    await expect(html).not.toHaveClass(/\b(dark|light)\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    expect(await themeColor()).toBe("#ffffff");
  });

  test("a stored light choice beats a dark system", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    expect(await background(page)).toEqual(BACKGROUND.light);
    await context.close();
  });
});

test.describe("gutters", () => {
  test("exist only on wide screens and never move the column", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const gutters = page.locator('[data-slot="gutter"]');
    await expect(gutters).toHaveCount(2);
    for (const gutter of await gutters.all()) {
      await expect(gutter).toHaveAttribute("aria-hidden", "true");
      expect((await gutter.boundingBox())?.width).toBe(400); // (1440 - 640) / 2
    }
    const frame = await page.locator('main [data-slot="frame"]').boundingBox();
    expect(frame).toMatchObject({ x: 400, width: 640 });

    await page.setViewportSize({ width: 390, height: 844 });
    for (const gutter of await gutters.all()) await expect(gutter).toBeHidden();
  });
});

test("the resume button exists only when the PDF does", async ({ page, request }) => {
  await page.goto("/");
  const links = page.locator('a[href="/resume.pdf"]');
  if (existsSync("public/resume.pdf")) {
    await expect(links.first()).toBeVisible();
    expect((await request.get("/resume.pdf")).status()).toBe(200);
  } else {
    await expect(links).toHaveCount(0);
    for (const path of ["/index.md", "/llms.txt"]) expect(await (await request.get(path)).text()).not.toContain("resume.pdf");
  }
});
