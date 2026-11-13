import { expect, test, type Page } from "@playwright/test";

import { collectErrors, resources, scriptBytesAddedBy, settle, THEMES, VIEWPORTS } from "./helpers";

const projectImages = async (page: Page) =>
  (await resources(page)).filter((r) => r.type === "image" && /codenaya-|xflow-/.test(decodeURIComponent(r.url))).map((r) => decodeURIComponent(r.url));

/** The xflow card image the reader can actually see. */
const visibleXflowShot = (page: Page) =>
  page.locator("#xflow a img").evaluateAll((imgs) =>
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
          await expect(article.locator("dl").first().locator("dt")).toHaveCount(6);
          // Whose work it is, said plainly, with the repository's own count.
          await expect(article).toContainText(/commits are his/);
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
        const figure = page.locator("#xflow figure:has(data)");
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
        expect(await visibleXflowShot(page)).toEqual([expect.stringContaining(`xflow-cli-${theme}`)]);
        const fetched = await projectImages(page);
        expect(fetched.some((url) => url.includes(`xflow-cli-${theme}`))).toBe(true);
        expect(fetched.some((url) => url.includes(`xflow-cli-${other}`))).toBe(false);
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
    expect(await visibleXflowShot(page)).toEqual([expect.stringContaining("xflow-cli-dark")]);
  });

  test("an explicit light choice under a dark system shows the light capture", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(() => document.documentElement.classList.add("light"));
    await page.locator("#xflow").scrollIntoViewIfNeeded();
    await settle(page);
    expect(await visibleXflowShot(page)).toEqual([expect.stringContaining("xflow-cli-light")]);
  });

  test("every bar is drawn to its published value, and a visible bar at rest is its true length", async ({ page }) => {
    await page.goto("/");
    const figure = page.locator("#xflow figure:has(data)");
    // Each bar's stops equal its numbers over the plate's scale.
    const rows = await figure.locator("li").evaluateAll((items) =>
      items.map((li) => {
        const values = [...li.querySelectorAll("data")].map((d) => Number(d.getAttribute("value")));
        const bar = li.querySelector("i") as HTMLElement;
        return { values, a: parseFloat(bar.style.getPropertyValue("--a")), b: parseFloat(bar.style.getPropertyValue("--b")) };
      }),
    );
    expect(rows).toHaveLength(5);
    for (const [i, row] of rows.entries()) {
      const max = i < 2 ? 25 : 700;
      expect(row.a).toBeCloseTo((row.values[0]! / max) * 100, 1);
      expect(row.b).toBeCloseTo((row.values.at(-1)! / max) * 100, 1);
    }
    // The figure rests with its top only 140px into the screen: once the draw has
    // played, every bar on screen is full length (scroll never scrubs it).
    const top = await figure.evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, y), top - 900 + 140);
    await page.waitForTimeout(1500);
    const visible = await figure.locator("li > i").evaluateAll((bars) =>
      bars
        .filter((bar) => bar.getBoundingClientRect().bottom <= innerHeight && bar.getBoundingClientRect().top >= 0)
        .map((bar) => getComputedStyle(bar, "::after").transform),
    );
    expect(visible.length).toBeGreaterThan(0);
    for (const transform of visible) expect(transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test("the building loader runs only while it is on screen", async ({ page }) => {
    await page.goto("/");
    const state = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => (a as CSSAnimation).animationName?.includes("cell"))
          .map((a) => a.playState),
      );
    expect(await state()).toEqual(Array(8).fill("paused"));
    await page.locator("#building").scrollIntoViewIfNeeded();
    await expect.poll(state).toEqual(Array(8).fill("running"));
    // Opacity only: nothing for the main thread to restyle each frame.
    const cell = page.locator("#building li i").first();
    expect(await cell.evaluate((el) => getComputedStyle(el, "::after").animationName)).toMatch(/cell/);
  });

  test("print keeps the summary and numbers and drops the cards and long parts", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto("/");
    for (const slug of ["codenaya", "xflow"]) {
      const article = page.locator(`#${slug}`);
      await expect(article.locator("h3")).toBeVisible();
      await expect(article.locator("[data-print=hide]").first()).toBeHidden();
      await expect(article.locator("dl").first()).toBeVisible();
      expect(await article.locator("h4").count()).toBeGreaterThan(2);
      for (const heading of await article.locator("h4").all()) await expect(heading).toBeHidden();
      expect(await article.locator("h3 a").evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none");
    }
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
    const cell = page.locator("#building li i").first();
    expect(await cell.evaluate((el) => getComputedStyle(el, "::after").animationName)).toBe("none");
  });

  test("building rows: one line each, marked in progress, leader inks on hover", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator("#building ol > li");
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) {
      await expect(row.locator("p")).toHaveCount(1);
      await expect(row).toContainText("In progress.");
      await expect(row.getByRole("heading", { level: 3 })).toHaveAccessibleName(/^[a-z]+$/);
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
