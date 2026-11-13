import { readdirSync, readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { brotli, collectErrors, resources, scriptBytesAddedBy, settle } from "./helpers";

/** The palette chunk is the only script that knows this placeholder. */
const PALETTE_MARK = "Filter shortcuts";

const palette = (page: Page) => page.getByRole("dialog", { name: "Command palette" });
const search = (page: Page) => palette(page).getByRole("combobox", { name: "Search commands" });

async function sectionTop(page: Page, id: string) {
  await page.waitForTimeout(900); // smooth scroll
  return page.evaluate((target) => Math.round(document.getElementById(target)!.getBoundingClientRect().top), id);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("palette loads on demand within 25 KB and runs keyboard-only", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await settle(page);
    const before = (await resources(page)).filter((r) => r.type === "script").map((r) => r.url);
    expect(before.some((url) => readFileSync(`.next/${new URL(url).pathname.replace("/_next/", "")}`, "utf8").includes(PALETTE_MARK))).toBe(false);

    const added = await scriptBytesAddedBy(page, () => page.keyboard.press("Control+k"));
    console.log(`palette chunk ${(added / 1024).toFixed(1)} KB brotli`);
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThanOrEqual(25 * 1024);

    await expect(palette(page)).toBeVisible();
    await expect(search(page)).toBeFocused();
    await expect(search(page)).toHaveAttribute("aria-activedescendant", /option-0$/);

    await page.keyboard.type("experi");
    await expect(palette(page).getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(palette(page)).toBeHidden();
    expect(await sectionTop(page, "experience")).toBeLessThan(120);

    // Arrow keys loop, Enter on a command, Escape clears before it closes.
    await page.keyboard.press("/");
    await expect(search(page)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(palette(page).getByRole("option", { selected: true })).toContainText("Toggle sound");
    await page.keyboard.type("zzzz");
    await expect(palette(page).getByText("No results for")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(search(page)).toHaveValue("");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();

    // Ctrl+K toggles closed too.
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("the header pill opens it, focus is trapped and returns to the pill", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    const pill = page.getByRole("banner").getByRole("button", { name: "Search" });
    const box = await pill.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(128);

    await pill.focus();
    await page.keyboard.press("Enter");
    await expect(palette(page)).toBeVisible();
    // The rest of the page is inert: Tab never reaches it.
    const outside = await page.evaluate(() => {
      const dialog = document.querySelector("dialog[open]")!;
      return [...document.querySelectorAll("a[href], button")].filter((el) => !dialog.contains(el)).length;
    });
    expect(outside).toBeGreaterThan(0);
    await page.keyboard.type("x");
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const inPage = await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active !== document.body && !active.closest("dialog");
      });
      expect(inPage).toBe(false);
    }
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
    await expect(pill).toBeFocused();

    // A click on the backdrop closes it.
    await pill.click();
    await expect(palette(page)).toBeVisible();
    await page.mouse.click(40, 450);
    await expect(palette(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("single keys, g chords and the shortcut list", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("w");
    expect(await sectionTop(page, "work")).toBeLessThan(120);
    await page.keyboard.press("g");
    await page.keyboard.press("c");
    expect(await sectionTop(page, "contact")).toBeLessThan(400);
    await page.keyboard.press("g");
    await page.keyboard.press("h");
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(10);

    // Modifiers and text fields are left alone.
    await page.keyboard.press("Alt+e");
    await page.keyboard.press("Shift+E");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(10);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "probe";
      document.querySelector("main")!.prepend(input);
    });
    await page.locator("#probe").focus();
    await page.keyboard.type("ed/");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => [scrollY, document.documentElement.classList.contains("dark")])).toEqual([0, false]);
    await expect(palette(page)).toHaveCount(0);
    await page.locator("#probe").blur();

    await page.keyboard.press("?");
    await expect(palette(page).getByRole("combobox", { name: "Filter keyboard shortcuts" })).toBeFocused();
    const list = palette(page).getByRole("listbox", { name: "Keyboard shortcuts" });
    for (const key of ["a", "e", "w", "d", "m", "?"]) await expect(list.getByRole("option").filter({ has: page.locator(`kbd:text-is("${key}")`) }).first()).toBeVisible();
    await expect(list.getByRole("group", { name: "Go to, after g" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(search(page)).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("theme: d reveals the other theme from the button and the choice persists", async ({ page }) => {
    const errors = collectErrors(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("d");
    const reveal = await page.evaluate(() =>
      document
        .getAnimations()
        .map((animation) => (animation.effect as KeyframeEffect).pseudoElement)
        .filter(Boolean),
    );
    expect(reveal).toContain("::view-transition-new(root)");
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => [document.documentElement.classList.contains("dark"), localStorage.getItem("theme")])).toEqual([true, "dark"]);
    expect(await page.evaluate(() => document.documentElement.style.cssText)).toBe("");

    // No flash on reload: dark from the first frame.
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await page.waitForLoadState("networkidle");

    // Back to the system's theme clears the override, from the palette this time.
    await page.keyboard.press("Control+k");
    await page.keyboard.type("theme");
    // Typed before the chunk arrived, the text still lands in the search, never on the shortcuts.
    await expect(search(page)).toHaveValue("theme");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => [document.documentElement.className.includes("dark"), localStorage.getItem("theme")])).toEqual([false, null]);
    expect(errors).toEqual([]);
  });

  test("the listener stays within 1 KB", () => {
    const chunks = readdirSync(".next/static/chunks").filter((name) => name.endsWith(".js"));
    const source = chunks.map((name) => readFileSync(`.next/static/chunks/${name}`, "utf8")).find((text) => text.includes("data-command-open"));
    expect(source, "chunk with the listener").toBeTruthy();
    // Turbopack writes each module as `,<id>,e=>{…}`; take the one that defines the listener.
    const fragment = source!.split(/(?=,\d+,\(?\w\)?=>)/).find((part) => part.includes("data-command-open"))!;
    console.log(`listener ${brotli(Buffer.from(fragment))} B brotli`);
    expect(brotli(Buffer.from(fragment))).toBeLessThanOrEqual(1024);
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("the theme switches at once, with no view transition", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Toggle light and dark theme" }).click();
    const pseudo = await page.evaluate(
      () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect).pseudoElement?.includes("view-transition")).length,
    );
    expect(pseudo).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).not.toBeNull();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the dock navigates, opens search and never covers the end of the page", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    const dock = page.getByRole("button", { name: "Search…" });
    await expect(dock).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Search" })).toBeHidden();

    await page.getByRole("button", { name: "Sections" }).click();
    const menu = page.getByRole("navigation", { name: "Sections" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Education" }).click();
    await expect(menu).toBeHidden();
    expect(await sectionTop(page, "education")).toBeLessThan(120);

    await dock.click();
    await expect(palette(page)).toBeVisible();
    const panel = await palette(page).boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    const [footerBottom, fadeTop] = await page.evaluate(() => {
      const footer = document.querySelector("footer")!;
      const dock = [...document.querySelectorAll("[data-command-open]")].at(-1)!.parentElement!;
      const fade = dock.previousElementSibling!;
      return [footer.getBoundingClientRect().bottom, fade.getBoundingClientRect().top];
    });
    expect(footerBottom).toBeLessThanOrEqual(fadeTop + 1);
    expect(errors).toEqual([]);
  });
});

test("the dock is not shown from sm up", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search…" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
});
