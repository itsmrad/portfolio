import { expect, test, type Page } from "@playwright/test";

import { collectErrors, resources, scriptBytesAddedBy, settle, THEMES, VIEWPORTS } from "./helpers";

const projectImages = async (page: Page) =>
  (await resources(page)).filter((r) => r.type === "image" && /codenaya-|xflow-/.test(decodeURIComponent(r.url))).map((r) => decodeURIComponent(r.url));

/** The xflow window image the reader can actually see. */
const visibleXflowShot = (page: Page) =>
  page.locator("#xflow img").evaluateAll((imgs) =>
    (imgs as HTMLImageElement[]).filter((img) => getComputedStyle(img).display !== "none").map((img) => img.currentSrc || img.src),
  );

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`projects, ${theme} / ${viewport.name}`, () => {
      test.use({ colorScheme: theme, viewport: { width: viewport.width, height: viewport.height } });

      test("featured articles are complete and the right screenshots load", async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto("/");
        for (const slug of ["codenaya", "xflow"]) {
          const article = page.locator(`article#${slug}`);
          await expect(article.locator("h3")).toHaveCount(1);
          await expect(article.locator("dl").first().locator("dd")).toHaveCount(6);
          await expect(article.getByRole("heading", { level: 4, name: /Engineering decisions/ })).toBeVisible();
          await expect(article.locator("h5")).toHaveCount(3);
          // Every screenshot reserves its box and waits for the scroll.
          for (const img of await article.locator("img").all()) {
            await expect(img).toHaveAttribute("loading", "lazy");
            await expect(img).toHaveAttribute("width", /\d+/);
            await expect(img).toHaveAttribute("height", /\d+/);
          }
        }
        // xflow sells on published numbers, with their conditions beside them.
        const figure = page.locator("#xflow figure");
        await expect(figure).toContainText("3.0");
        await expect(figure).toContainText("255");
        await expect(figure).toContainText("Apple M2");
        await expect(figure.getByRole("link", { name: /scoreboard-macos\.json/ })).toHaveAttribute("href", /docs\/benchmarks/);
        await expect(page.locator("#xflow")).not.toContainText(/\b(users?|downloads?|stars?)\b/i);

        await page.locator("#xflow").scrollIntoViewIfNeeded();
        await page.locator("#building").scrollIntoViewIfNeeded();
        await settle(page);
        // Only the xflow capture matching the theme is shown and fetched.
        const other = theme === "dark" ? "light" : "dark";
        expect(await visibleXflowShot(page)).toEqual([expect.stringContaining(`xflow-home-${theme}`)]);
        const fetched = await projectImages(page);
        expect(fetched.some((url) => url.includes(`xflow-home-${theme}`))).toBe(true);
        expect(fetched.some((url) => url.includes(`xflow-home-${other}`))).toBe(false);
        for (const img of await page.locator("#work img:visible").all()) {
          expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
        }
        expect(errors).toEqual([]);
      });
    });
  }
}

test.describe("projects interaction", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("an explicit theme choice swaps the xflow capture", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.locator("#xflow").scrollIntoViewIfNeeded();
    await settle(page);
    expect(await visibleXflowShot(page)).toEqual([expect.stringContaining("xflow-home-dark")]);
  });

  test("the window lifts on hover and on keyboard focus", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("#codenaya a").first();
    const window = link.locator("div").first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect.poll(() => window.evaluate((el) => getComputedStyle(el).transform)).toBe("matrix(1, 0, 0, 1, -12, -8)");
    await page.mouse.move(0, 0);
    await expect.poll(() => window.evaluate((el) => getComputedStyle(el).transform)).toBe("none");

    // Keyboard: tab until the window link has focus; it lifts the same way.
    await page.locator("#work-title").scrollIntoViewIfNeeded();
    await page.locator("#work-title").click();
    for (let i = 0; i < 5 && !(await link.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    await expect.poll(() => window.evaluate((el) => getComputedStyle(el).transform)).toBe("matrix(1, 0, 0, 1, -12, -8)");
  });

  test("reduced motion: no lift, no drawing, no blinking", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const link = page.locator("#codenaya a").first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await page.waitForTimeout(400);
    expect(await link.locator("div").first().evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    const bar = page.locator("#xflow figure li > i").first();
    expect(await bar.evaluate((el) => getComputedStyle(el, "::after").animationName)).toBe("none");
    const cell = page.locator("#building li span[aria-hidden] i").first();
    expect(await cell.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("building rows: one line each, marked in progress, leader inks on hover", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator("#building ol > li");
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) {
      await expect(row.locator("p")).toHaveCount(1);
      await expect(row.getByRole("link")).toHaveAccessibleName(/in progress/);
      await expect(row.getByRole("link")).toHaveAttribute("href", /^https:\/\/github\.com\/itsmrad\//);
    }
    await expect(page.locator("#building header")).toContainText(/in progress/i);
    const leader = rows.first().locator("span[aria-hidden]").nth(1);
    const scale = () => leader.evaluate((el) => getComputedStyle(el, "::after").transform);
    expect(await scale()).toBe("matrix(0, 0, 0, 1, 0, 0)");
    await rows.first().hover();
    await expect.poll(scale).toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test("the section ships no JavaScript of its own", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const added = await scriptBytesAddedBy(page, async () => {
      await page.locator("#building").scrollIntoViewIfNeeded();
      await page.locator("#codenaya a").first().hover();
    });
    expect(added).toBe(0);
  });
});
