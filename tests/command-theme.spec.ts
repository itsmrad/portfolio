import { readdirSync, readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { brotli, collectErrors, resources, scriptBytesAddedBy, settle } from "./helpers";

/** The palette chunk is the only script that knows this placeholder. */
const PALETTE_MARK = "Filter shortcuts";

const palette = (page: Page) => page.getByRole("dialog", { name: "Command palette" });
const search = (page: Page) => palette(page).getByRole("combobox", { name: "Search commands" });

/** Waits out the smooth scroll: the section's top ends under the header. */
async function expectNearTop(page: Page, id: string, max = 120) {
  await expect
    .poll(() => page.evaluate((target) => document.getElementById(target)!.getBoundingClientRect().top, id), { timeout: 5000 })
    .toBeLessThan(max);
  await expect.poll(() => page.evaluate((target) => document.getElementById(target)!.getBoundingClientRect().top, id)).toBeGreaterThan(-10);
}

async function ready(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** Holds back every script requested from now on, so the palette chunk arrives late (a cold load). */
async function slowChunks(page: Page, ms = 400) {
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

/** The page keys still work: nothing is left swallowing them. */
async function expectKeysLive(page: Page) {
  await expect(palette(page)).toBeHidden();
  await page.keyboard.press("g");
  await page.keyboard.press("h");
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBeLessThan(10);
  await page.keyboard.press("w");
  await expectNearTop(page, "work");
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
    await expectNearTop(page, "experience");

    // Arrow keys loop, Escape clears before it closes.
    await page.keyboard.press("/");
    await expect(search(page)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(palette(page).getByRole("option", { selected: true })).toContainText("keyboard shortcuts");
    await page.keyboard.type("zzzz");
    await expect(palette(page).getByText("No results for")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(search(page)).toHaveValue("");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();

    // Ctrl+K toggles closed too; holding it does not flicker.
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeHidden();
    await page.keyboard.down("Control");
    for (let i = 0; i < 6; i++) await page.keyboard.down("k");
    await page.keyboard.up("k");
    await page.keyboard.up("Control");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });

  test("open, close and typing never leave the keys stuck, whatever the order (B2)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);

    // Cold chunk: typing during the load lands in the search, Backspace edits it, Enter runs it.
    await slowChunks(page);
    await page.keyboard.press("/");
    await page.keyboard.type("expx");
    await page.keyboard.press("Backspace");
    await expect(search(page)).toHaveValue("exp");
    await page.keyboard.press("Enter");
    await expectNearTop(page, "experience");
    await page.unroute(/\/_next\/static\/chunks\/.*\.js/);

    // Cached chunk: the reflexes, with no pause between keys, several times over.
    const sequences: [string, string[]][] = [
      ["Escape then /", ["/", "Escape", "/"]],
      ["Ctrl+K twice then /", ["Control+k", "Control+k", "/"]],
      ["Escape then Ctrl+K", ["/", "Escape", "Control+k"]],
      ["Ctrl+K, Escape, /", ["Control+k", "Escape", "/"]],
      ["? then Escape twice then /", ["?", "Escape", "Escape", "/"]],
    ];
    for (const [name, keys] of sequences) {
      for (let round = 0; round < 4; round++) {
        for (const key of keys) await page.keyboard.press(key, { delay: 0 });
        await expect(palette(page), `${name}, round ${round}`).toBeVisible();
        await expect(search(page)).toBeFocused();
        await page.keyboard.type("ab");
        // A `/` that reached an already open box is fair; nothing else may sit in front.
        await expect(search(page)).toHaveValue(/^\/?ab$/);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await expect(palette(page)).toBeHidden();
      }
    }

    // The reviewer's deterministic case: the dialog closes and `/` arrives in the same task.
    for (let round = 0; round < 4; round++) {
      await page.keyboard.press("/");
      await expect(search(page)).toBeFocused();
      await page.evaluate(() => {
        document.querySelector<HTMLDialogElement>("dialog[data-palette]")!.close();
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
      });
      await expect(palette(page), `close then / in one task, round ${round}`).toBeVisible();
      await expect(search(page)).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(palette(page)).toBeHidden();
    }

    // Choosing a command, then opening again at once.
    for (const command of ["copy url", "toggle theme"]) {
      await page.keyboard.press("/");
      await page.keyboard.type(command);
      await page.keyboard.press("Enter");
      await page.keyboard.press("/");
      await expect(palette(page), command).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(palette(page)).toBeHidden();
    }
    await expectKeysLive(page);
    expect(errors).toEqual([]);
  });

  test("a cold open cancelled with Escape gives the keys back (B2)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);
    await slowChunks(page, 600);
    await page.keyboard.press("Control+k");
    await page.keyboard.type("ab");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    await expect(palette(page)).toHaveCount(0);
    await page.unroute(/\/_next\/static\/chunks\/.*\.js/);
    await expectKeysLive(page);
    expect(errors).toEqual([]);
  });

  test("a palette chunk that cannot load logs no uncaught error and leaves the keys working (S6)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);
    // Offline: hovering the pill and pressing / log nothing, and the keys still work.
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => route.abort());
    await page.getByRole("banner").getByRole("button", { name: "Search" }).hover();
    await page.mouse.move(700, 600);
    await page.keyboard.press("/");
    // A failed load gives the keys back at once; one that hangs, after at most 3 s.
    await page.waitForTimeout(3200);
    await expectKeysLive(page);
    // The browser logs the refused request itself; no uncaught error from our code.
    expect(errors.filter((error) => !/Failed to load resource/.test(error))).toEqual([]);
  });

  test("the header pill opens it, focus is trapped and returns, the page does not scroll (S1, S4)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);
    const pill = page.getByRole("banner").getByRole("button", { name: "Search" });
    expect((await pill.boundingBox())!.width).toBeLessThanOrEqual(128);
    await expect(pill).toHaveAttribute("data-slot", "button");

    const width = () => page.evaluate(() => document.documentElement.clientWidth);
    const before = await width();
    await pill.focus();
    await page.keyboard.press("Enter");
    await expect(palette(page)).toBeVisible();
    expect(await width(), "no layout shift from the scroll lock").toBe(before);

    // Scroll lock: neither the wheel over the backdrop nor PageDown moves the page.
    await page.mouse.move(80, 600);
    await page.mouse.wheel(0, 800);
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY)).toBe(0);

    // The rest of the page is inert: Tab never reaches it.
    await page.keyboard.type("x");
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const inPage = await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active !== document.body && !active.closest("dialog");
      });
      expect(inPage).toBe(false);
    }

    // A text selection dragged out of the search box onto the backdrop keeps it open.
    const field = (await search(page).boundingBox())!;
    await page.mouse.move(field.x + 20, field.y + field.height / 2);
    await page.mouse.down();
    await page.mouse.move(60, 700, { steps: 5 });
    await page.mouse.up();
    await expect(palette(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
    await expect(pill).toBeFocused();

    // A press that starts and ends on the backdrop closes it.
    await pill.click();
    await expect(palette(page)).toBeVisible();
    await page.mouse.click(40, 450);
    await expect(palette(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("closing keeps the box as it was while it fades (S3)", async ({ page }) => {
    await ready(page);
    await page.keyboard.press("/");
    await page.keyboard.type("copy url");
    await expect(palette(page).getByRole("option")).toHaveCount(1);
    // Layout height: the fade's 98% scale is not a change of the box.
    const height = await page.evaluate(() => document.querySelector<HTMLElement>("dialog[data-palette]")!.offsetHeight);
    const fading = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[data-palette]")!;
      dialog.close();
      return new Promise<number[]>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve([dialog.offsetHeight, dialog.querySelectorAll("[role=option]").length])),
        ),
      );
    });
    expect(fading[0]).toBe(height);
    expect(fading[1]).toBe(1);
  });

  test("single keys, g chords, ignored contexts and the shortcut list (S5)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);

    await page.keyboard.press("w");
    await expectNearTop(page, "work");
    await page.keyboard.press("g");
    await page.keyboard.press("c");
    await expectNearTop(page, "contact", 400);
    await page.keyboard.press("g");
    await page.keyboard.press("h");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(10);

    // The chord expires after a second: `g`, a pause, then `d` is the theme key again.
    await page.keyboard.press("g");
    await page.waitForTimeout(1150);
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).not.toBeNull();
    await page.waitForTimeout(700);
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    await page.waitForTimeout(700);

    // Modifiers, Shift, key repeat and text fields are left alone.
    await page.keyboard.press("Alt+e");
    await page.keyboard.press("Shift+E");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(10);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "probe";
      const editable = document.createElement("div");
      editable.id = "editable";
      editable.contentEditable = "true";
      editable.textContent = "x";
      document.querySelector("main")!.prepend(input, editable);
    });
    for (const target of ["#probe", "#editable"]) {
      await page.locator(target).focus();
      await page.keyboard.type("ed/");
      await page.waitForTimeout(400);
      expect(await page.evaluate(() => [scrollY, document.documentElement.classList.contains("dark")])).toEqual([0, false]);
      await expect(palette(page)).toHaveCount(0);
      await page.locator(target).blur();
    }

    await page.keyboard.press("?");
    await expect(palette(page).getByRole("combobox", { name: "Filter keyboard shortcuts" })).toBeFocused();
    const list = palette(page).getByRole("listbox", { name: "Keyboard shortcuts" });
    // Screen readers hear the keys: "About shortcut a", "About shortcut g then a".
    await expect(list.getByRole("option", { name: "About shortcut a", exact: true })).toBeVisible();
    await expect(list.getByRole("option", { name: "About shortcut g then a", exact: true })).toBeVisible();
    for (const key of ["e", "w", "d", "m"]) await expect(list.getByRole("option", { name: new RegExp(`shortcut ${key}$`) }).first()).toBeVisible();
    await expect(list.getByRole("option", { name: /^Keyboard shortcuts/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(search(page)).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("single-key shortcuts can be turned off and on, persisted and announced (S8)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);
    const hint = page.getByRole("navigation", { name: "Primary", exact: true }).locator("a > span[aria-hidden]").first();
    await page.keyboard.press("Control+k");
    await page.keyboard.type("shortcuts off");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Keyboard shortcuts off" })).toBeVisible();
    await expect(hint).toHaveCSS("text-decoration-line", "line-through");

    await page.reload();
    await page.waitForLoadState("networkidle");
    for (const key of ["e", "/", "?", "g", "w"]) await page.keyboard.press(key);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(palette(page)).toHaveCount(0);

    // Ctrl+K always works, and the row now turns them back on.
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.type("shortcuts on");
    await expect(palette(page).getByRole("option", { name: "Turn keyboard shortcuts on" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Keyboard shortcuts on" })).toBeVisible();
    await expect(hint).not.toHaveCSS("text-decoration-line", "line-through");
    expect(await page.evaluate(() => localStorage.getItem("shortcuts"))).toBeNull();
    await page.keyboard.press("w");
    await expectNearTop(page, "work");
    expect(errors).toEqual([]);
  });

  test("owner inputs: email, resume and booking rows match the content", async ({ page, context }) => {
    const errors = collectErrors(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await ready(page);
    const row = (name: RegExp) => palette(page).getByRole("option", { name });

    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    const email = (await row(/^Copy email/).count()) > 0;
    const resume = (await row(/^Download resume/).count()) > 0;
    const call = (await row(/^Book a call/).count()) > 0;
    console.log(`owner rows: email ${email}, resume ${resume}, call ${call}`);
    await page.keyboard.press("Escape");

    // `c` copies the address when there is one, and does nothing otherwise.
    await page.keyboard.press("c");
    if (email) {
      await expect(page.getByRole("status").filter({ hasText: "Email copied" })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/@/);
    } else {
      await page.waitForTimeout(400);
      await expect(page.getByRole("status").filter({ hasText: "Email copied" })).toHaveCount(0);
    }

    // `r` downloads the PDF when it is published.
    if (resume) {
      const download = page.waitForEvent("download");
      await page.keyboard.press("r");
      expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
    }

    // Book a call opens the booking page in a new tab.
    if (call) {
      await page.keyboard.press("Control+k");
      await page.keyboard.type("book a call");
      const popup = page.waitForEvent("popup");
      await page.keyboard.press("Enter");
      expect((await popup).url()).toMatch(/^https:\/\//);
    }

    // Copy link gives the canonical home page plus the section.
    await page.keyboard.press("Control+k");
    await page.keyboard.type("copy url");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^https:\/\/www\.anupamdas\.me\/#?/);
    expect(errors).toEqual([]);
  });

  test("theme: the circular reveal runs on a clip-path, not the browser's cross-fade (B1)", async ({ page }) => {
    const errors = collectErrors(page);
    await page.emulateMedia({ colorScheme: "light" });
    await ready(page);
    await expect(page.getByRole("banner").getByRole("button", { name: "Toggle light and dark theme", exact: true })).toHaveAttribute(
      "data-slot",
      "button",
    );

    // Watch every frame for a second (a loaded machine can start the transition late) and
    // record, per animation on the new snapshot, its name and whether it animates clip-path.
    const seen = page.evaluate(
      () =>
        new Promise<{ name: string; clip: boolean }[]>((resolve) => {
          const found = new Map<string, boolean>();
          const end = performance.now() + 1000;
          const tick = () => {
            for (const animation of document.getAnimations()) {
              const effect = animation.effect as KeyframeEffect;
              if (effect.pseudoElement !== "::view-transition-new(root)") continue;
              const name = (animation as CSSAnimation).animationName ?? "";
              found.set(name, effect.getKeyframes().some((frame) => "clipPath" in frame));
            }
            if (performance.now() < end) requestAnimationFrame(tick);
            else resolve([...found].map(([name, clip]) => ({ name, clip })));
          };
          tick();
        }),
    );
    await page.keyboard.press("d");
    const animations = await seen;
    expect(animations.some((animation) => animation.clip), JSON.stringify(animations)).toBe(true);
    expect(animations.filter((animation) => animation.name.startsWith("-ua-")), "no default cross-fade").toEqual([]);
    expect(await page.evaluate(() => [document.documentElement.classList.contains("dark"), localStorage.getItem("theme")])).toEqual([true, "dark"]);
    await expect.poll(() => page.evaluate(() => document.documentElement.style.cssText)).toBe("");

    // A skipped transition (the window resized mid-reveal) still switches, logs nothing and
    // releases the toggle within a second, whatever the browser does with the transition.
    const switching = () => page.evaluate(() => /switching/.test(document.documentElement.className));
    await page.keyboard.press("d");
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme")), { timeout: 1500 }).toBeNull();
    await expect.poll(switching, { timeout: 2500, intervals: [100] }).toBe(false);

    // A press during a reveal is never ignored: it finishes the reveal and switches back.
    await page.keyboard.press("d");
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme")), { timeout: 1500 }).toBeNull();
    await expect.poll(switching, { timeout: 2500, intervals: [100] }).toBe(false);

    // No flash on reload: dark from the first frame.
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme")), { timeout: 1500 }).toBe("dark");
    await expect.poll(switching, { timeout: 2500, intervals: [100] }).toBe(false);
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await page.waitForLoadState("networkidle");

    // Back to the system's theme clears the override, from the palette this time.
    await page.keyboard.press("Control+k");
    await page.keyboard.type("theme");
    await expect(search(page)).toHaveValue("theme");
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    expect(await page.evaluate(() => document.documentElement.className.includes("dark"))).toBe(false);
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
    await ready(page);
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

  test("the dock navigates, opens search near the top and never covers the end of the page (S7)", async ({ page }) => {
    const errors = collectErrors(page);
    await ready(page);
    const dock = page.getByRole("button", { name: "Search…" });
    // The first screen belongs to the hero; the dock arrives once the page scrolls.
    await expect(dock).toBeHidden();
    await page.mouse.wheel(0, 200);
    await expect(dock).toBeVisible();
    await expect(dock).toHaveAttribute("data-slot", "button");
    await expect(page.getByRole("banner").getByRole("button", { name: "Search" })).toBeHidden();

    await page.getByRole("button", { name: "Sections" }).click();
    const menu = page.getByRole("navigation", { name: "Sections" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Education" }).click();
    await expect(menu).toBeHidden();
    await expectNearTop(page, "education");

    await dock.click();
    await expect(palette(page)).toBeVisible();
    const panel = (await palette(page).boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    // 4rem from the top, clear of an on-screen keyboard (once the 4px opening lift has settled).
    await expect.poll(async () => Math.round((await palette(page).boundingBox())!.y)).toBe(64);
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

test.describe("short phones", () => {
  test.use({ hasTouch: true });

  for (const [width, height] of [[360, 640], [360, 740], [375, 667], [390, 844], [412, 915]] as const) {
    test(`${width}x${height}: nothing floats over the hero's facts on the first screen`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await ready(page);
      const floating = await page.evaluate(() => {
        const dock = [...document.querySelectorAll("[data-command-open]")].at(-1)!.parentElement!;
        const fade = dock.previousElementSibling!;
        return [dock, fade].map((element) => getComputedStyle(element).visibility);
      });
      expect(floating).toEqual(["hidden", "hidden"]);
    });
  }
});

test("the dock is not shown from sm up", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search…" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
});
