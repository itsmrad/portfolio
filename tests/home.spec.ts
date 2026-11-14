import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import { collectErrors, kb, resources, scriptBrotli, scriptBytesAddedBy, settle } from "./helpers";

/** Compressed first-load script the monogram may cost, and the lazy chunk behind every other home interaction. */
const LIMIT = { monogram: 4 * 1024, effects: 3 * 1024, calendarElements: 12 };

const faces = (page: Page) => page.locator("#top button svg [data-solid]").nth(1);
/** The middle of the first top face: a point that is certainly on the solid. */
const onSolid = async (page: Page) => {
  const box = (await faces(page).locator("path").first().boundingBox())!;
  return [box.x + box.width / 2, box.y + box.height / 2] as const;
};
const sink = async (page: Page) => Number((await faces(page).getAttribute("transform"))?.match(/translate\(0 ([\d.]+)\)/)?.[1] ?? 0);

test.describe("hero", () => {
  test("the name is the only h1, beside the portrait, with every tagline in the page", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Anupam Das");
    expect(await page.locator("h1").evaluate((h1) => getComputedStyle(h1).fontFamily)).toContain("serif");
    const portrait = page.locator("#top img");
    await expect(portrait).toHaveAttribute("alt", /^Anupam in profile/);
    expect((await portrait.locator("xpath=ancestor::div[3]").boundingBox())?.width).toBe(96);
    // The rotation names both products and never repeats the role, which the first fact row states.
    await expect(page.locator("#top h1 + ul li")).toHaveText(["Building Codenaya", "Building xflow in Rust", "Final-year B.Tech at BPIT"]);
    await expect(page.locator("#top ul").last().locator("li").first()).toContainText("AI/LLM Intern at PlanCover");
    expect(errors).toEqual([]);
  });

  test("the tagline rotates: the second line takes over from the first, in the same box", async ({ page }) => {
    await page.goto("/");
    const lines = page.locator("#top h1 + ul li");
    const opacity = (index: number) => lines.nth(index).evaluate((line) => Number(getComputedStyle(line).opacity));
    const box = await page.locator("#top h1 + ul").boundingBox();
    await expect.poll(() => opacity(0)).toBeGreaterThan(0.9);
    expect(await opacity(1)).toBeLessThan(0.1);
    // Each line holds for three seconds.
    await expect.poll(() => opacity(1), { timeout: 6000 }).toBeGreaterThan(0.9);
    expect(await opacity(0)).toBeLessThan(0.1);
    expect(await page.locator("#top h1 + ul").boundingBox()).toEqual(box);
  });

  test("the palette button uses the palette's own opener and marks itself as a button", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("#top [data-command-open]");
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
    await expect(button).toHaveAttribute("data-slot", "button");
    await expect(button).toContainText("Ctrl");
    // Where the palette has marked an Apple device, the cap shows the Command sign instead.
    await page.evaluate(() => (document.documentElement.dataset.platform = "mac"));
    await expect(button.locator("kbd").first()).toHaveText("⌘", { useInnerText: true });
    await expect(page.locator("#contact [data-copy]")).toHaveAttribute("data-slot", "button");
  });

  test.describe("on a touch phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("there is no keyboard, so no palette button", async ({ page }) => {
      await page.goto("/");
      expect(await page.evaluate(() => matchMedia("(pointer: fine)").matches)).toBe(false);
      await expect(page.locator("#top [data-command-open]")).toBeHidden();
      await expect(page.locator('#top a[href="/Anupam-Das-Resume.pdf"]')).toBeVisible();
    });
  });

  test("the monogram sinks 16 units while held and springs back, by pointer and by keyboard", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    const button = page.getByRole("button", { name: /monogram/i });
    await page.mouse.move(...(await onSolid(page)));
    await page.mouse.down();
    await expect.poll(() => sink(page)).toBe(16);
    // The walls are redrawn to the new depth, not left standing above the faces.
    expect(await page.locator("#top button svg [data-solid]").first().locator("path").first().getAttribute("d")).toMatch(/^M[\d.]+ [\d.]+V/);
    await page.mouse.up();
    await expect.poll(() => sink(page)).toBe(0);

    await button.focus();
    await page.keyboard.down("Space");
    await expect.poll(() => sink(page)).toBe(16);
    await page.keyboard.up("Space");
    await expect.poll(() => sink(page)).toBe(0);
    expect(errors).toEqual([]);
  });

  test("only the drawn solid is pressable, and the highlight follows the cursor", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const svg = (await page.getByRole("button", { name: /monogram/ }).locator("svg").boundingBox())!;
    // The bottom-left corner of the drawing's box is empty paper.
    await page.mouse.move(svg.x + 4, svg.y + svg.height - 4);
    await page.mouse.down();
    await page.waitForTimeout(300);
    expect(await sink(page)).toBe(0);
    await page.mouse.up();

    const glow = page.locator("#top radialGradient");
    const before = await glow.getAttribute("cx");
    await page.mouse.move(200, 200);
    await expect.poll(() => glow.getAttribute("cx")).not.toBe(before);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the press is immediate, the highlight stays put and the tagline does not rotate", async ({ page }) => {
      await page.goto("/");
      const glow = await page.locator("#top radialGradient").getAttribute("cx");
      await page.mouse.move(...(await onSolid(page)));
      await page.mouse.down();
      expect(await sink(page)).toBe(16);
      await page.mouse.up();
      expect(await sink(page)).toBe(0);
      expect(await page.locator("#top radialGradient").getAttribute("cx")).toBe(glow);
      const lines = page.locator("#top h1 + ul li");
      expect(await lines.evaluateAll((items) => items.map((item) => getComputedStyle(item).animationName))).toEqual(["none", "none", "none"]);
      expect(await lines.evaluateAll((items) => items.map((item) => getComputedStyle(item).opacity))).toEqual(["1", "0", "0"]);
    });
  });

  test.describe("far from New Delhi", () => {
    test.use({ timezoneId: "America/New_York" });

    test("local time and the greeting are right before any script file runs", async ({ page }) => {
      // Only the inline scripts can have painted these.
      await page.route("**/*.js", (route) => route.abort());
      await page.goto("/");
      const clock = page.locator("[data-clock]");
      await expect(clock.locator("span").first()).toHaveText(/^\d{1,2}:\d{2} [AP]M$/);
      await expect(clock.locator("span").last()).toHaveText(/^ \/\/ (9h 30m|10h 30m) ahead$/);
      await expect(page.locator("#about header + div p").first()).toHaveText(/^Good (morning|afternoon|evening)\.$/);
    });
  });

  for (const width of [360, 390, 430, 1440]) {
    test(`nothing moves when the fonts arrive late (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(() => {
        const state = window as unknown as { __cls: number };
        state.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!entry.hadRecentInput) state.__cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      // The fonts are held until the page has been measured in its fallback faces.
      let release!: () => void;
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/*.woff2", async (route) => {
        await held;
        await route.continue();
      });
      // `load` would wait for the fonts, so stop at the parsed document.
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.fonts.status === "loading");
      const measure = () =>
        page.evaluate(() => ({
          about: document.querySelector("#about")!.getBoundingClientRect().top + scrollY,
          parts: [...document.querySelectorAll("#top h1, #top h1 + ul, #top p, #top ul")].map((part) => part.getBoundingClientRect().height),
          loaded: [...document.fonts].filter((font) => font.status === "loaded").length,
        }));
      const early = await measure();
      expect(await page.evaluate(() => document.fonts.status), "measured before the fonts arrived").toBe("loading");

      release();
      await page.evaluate(() => document.fonts.ready);
      await settle(page);
      const late = await measure();
      expect(late.loaded, "the web fonts arrived afterwards").toBeGreaterThan(early.loaded);
      expect(late.about, "the hero keeps its height").toBe(early.about);
      expect(late.parts, "every text block keeps its height").toEqual(early.parts);
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThanOrEqual(0.02);
    });
  }
});

test.describe("script budget", () => {
  // A touch phone: the playful layer's margins and eggs never load there, so the first input fetches the home chunk alone.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the monogram is the only home script before input; the rest arrives on the first input", async ({ page }) => {
    // Muted, so the tap does not also fetch the sound engine (its own budget is in the sound spec).
    await page.addInitScript(() => localStorage.setItem("sound", "off"));
    await page.goto("/");
    await settle(page);
    const scripts = (await resources(page)).filter((resource) => resource.type === "script");
    const source = (url: string) => readFileSync(`.next/${new URL(url).pathname.replace("/_next/", "")}`, "utf8");
    const monogram = scripts.filter((script) => source(script.url).includes("ad-hatch"));
    expect(monogram).toHaveLength(1);
    // Nothing of the lazy chunk may be in what has loaded so far.
    for (const script of scripts) expect(source(script.url), script.url).not.toContain("data-calendar");

    const added = await scriptBytesAddedBy(page, () => page.touchscreen.tap(195, 700));
    console.log(`home ${JSON.stringify({ "monogram chunk": kb(scriptBrotli(monogram[0]!.url)), "lazy effects": kb(added) })}`);
    expect(scriptBrotli(monogram[0]!.url), "monogram chunk").toBeLessThanOrEqual(LIMIT.monogram);
    expect(added, "the effects chunk loads on the first input").toBeGreaterThan(0);
    expect(added, "lazy effects").toBeLessThanOrEqual(LIMIT.effects);
  });
});

test.describe("hero actions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("resume and booking sit on one row at 390px and go where they should", async ({ page }) => {
    await page.goto("/");
    const resume = page.locator('#top a[href="/Anupam-Das-Resume.pdf"]');
    const call = page.locator("#top").getByRole("link", { name: /book a call/i });
    await expect(resume).toHaveAttribute("download", "Anupam-Das-Resume.pdf");
    await expect(call).toHaveAttribute("href", "https://cal.com/itsmrad");
    await expect(call).toHaveAttribute("target", "_blank");
    await expect(call).toHaveAttribute("rel", "noopener");
    const [first, second] = [(await resume.boundingBox())!, (await call.boundingBox())!];
    expect(second.y).toBe(first.y);
    expect(second.x + second.width).toBeLessThanOrEqual(390 - 8 - 16);
    // The first screen still ends inside the hero's facts: nothing was pushed out by the new row.
    await expect(page.locator("#top [data-clock]")).toBeInViewport();
  });
});

test.describe("experience", () => {
  test("three roles from the resume, the current one open, then the community group", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    const roles = page.locator("#experience ol > li");
    await expect(roles.locator("h3")).toHaveText(["PlanCover Current", "Dasgupta Maiti & Associates", "Syuniqe"]);
    // A summary may hold only phrasing content and a heading.
    await expect(roles.locator("summary div")).toHaveCount(0);
    expect(await roles.locator("details").evaluateAll((all) => all.map((details) => (details as HTMLDetailsElement).open))).toEqual([true, false, false]);

    const plancover = roles.first();
    await expect(plancover).toContainText("AI/LLM Intern");
    await expect(plancover.locator("time")).toHaveAttribute("datetime", "2026-09");
    await expect(plancover.locator("summary")).toContainText("present");
    // Named, never linked; the security finding is one line with no detail of the attack.
    await expect(plancover.locator("a")).toHaveCount(0);
    await expect(plancover.locator("li", { hasText: "vulnerability" })).toHaveText("Found and responsibly disclosed an authentication vulnerability in the first week.");
    await expect(page.locator("#experience")).not.toContainText(/OTP|bypass|impersonat/i);

    // Closed rows open from the keyboard, with no script involved.
    const dasgupta = roles.nth(1);
    await expect(dasgupta.locator("time")).toHaveText(["Jun 2026", "Jul 2026"]);
    await expect(dasgupta.locator("a").first()).toBeHidden();
    await dasgupta.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(dasgupta.getByRole("link", { name: /dasguptamaitiassociates\.com/ })).toBeVisible();
    await expect(dasgupta).toContainText("40%");
    await expect(roles.nth(2).locator("time")).toHaveText(["Jun 2025", "Aug 2025"]);

    const community = page.locator("#experience h4");
    await expect(community).toHaveText(["SheBuilds Hackathon", "Namespace"]);
    await expect(page.locator("#experience")).toContainText("2,000+ registrations");
    expect(errors).toEqual([]);
  });
});

test.describe("activity", () => {
  test("a server-drawn calendar that reads out days, or the fallback link", async ({ page, request }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    const calendar = page.locator("[data-calendar]");
    if ((await calendar.count()) === 0) {
      // The contribution API was unreachable while the page was built.
      await expect(page.locator("#activity").getByRole("link", { name: /itsmrad on GitHub/ })).toBeVisible();
      return;
    }
    // It is in the HTML itself: no client fetch, a handful of elements for the whole year.
    expect(await (await request.get("/")).text()).toContain("data-calendar=");
    expect(await calendar.locator("svg *").count()).toBeLessThanOrEqual(LIMIT.calendarElements);
    await expect(page.locator("#activity")).toContainText(/[\d,]+\s*in the last year/);
    await expect(calendar).toHaveAttribute("aria-label", /[\d,]+ contributions between .+ and .+/);

    const status = page.locator("#activity [role=status]");
    await expect(status).toBeHidden();
    await calendar.scrollIntoViewIfNeeded();
    const box = (await calendar.locator("svg").boundingBox())!;
    const day = /^(No|\d+) contributions? on [A-Z][a-z]{2} \d{1,2}, \d{4}$/;
    // This is the first input on the page: it fetches the chunk that reads days out, and is replayed to it.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(status).toHaveText(day);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 80);
    await expect(status).toBeHidden();

    // By keyboard: arriving starts on the last day; the arrows step by day and by week.
    await page.keyboard.press("Tab");
    await calendar.focus();
    await page.keyboard.press("End");
    const last = await status.textContent();
    expect(last).toMatch(day);
    await page.keyboard.press("ArrowLeft");
    await expect(status).not.toHaveText(last!);
    await page.keyboard.press("ArrowRight");
    await expect(status).toHaveText(last!);
    await page.keyboard.press("Escape");
    await expect(status).toBeHidden();
    expect(errors).toEqual([]);
  });
});

test.describe("activity on a phone", () => {
  for (const width of [360, 390, 430]) {
    test(`month labels never touch at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      const labels = page.locator("[data-calendar] > div span");
      if ((await labels.count()) === 0) return; // the fallback link: no calendar was built
      const boxes = await labels.evaluateAll((all) => all.map((label) => label.getBoundingClientRect()).map(({ left, right }) => ({ left, right })));
      expect(boxes.length).toBeGreaterThanOrEqual(10);
      boxes.slice(1).forEach((box, index) => expect(box.left - boxes[index]!.right, `gap before label ${index + 1}`).toBeGreaterThanOrEqual(3));
      // The last label ends inside the calendar.
      const calendar = (await page.locator("[data-calendar]").boundingBox())!;
      expect(boxes.at(-1)!.right).toBeLessThanOrEqual(calendar.x + calendar.width + 1);
      for (const label of await labels.allTextContents()) expect(label).toMatch(/^[A-Z][a-z]{2}$/);
    });
  }
});

test.describe("stack, education, contact", () => {
  test("numbered stack rows and the education entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#stack dt")).toHaveText([
      "01Languages",
      "02Backend & APIs",
      "03Frontend",
      "04Databases & Data",
      "05AI/LLM",
      "06Engineering",
      "07Libraries & Platforms",
    ]);
    await expect(page.locator("#stack li").first()).toHaveText("Rust");
    // The mark is a pseudo-element of pills that carry a slot.
    const mark = (text: string) =>
      page.locator("#stack li", { hasText: text }).evaluate((li) => getComputedStyle(li, "::before").maskImage);
    expect(await mark("TypeScript")).toContain("stack-marks");
    const education = page.locator("#education");
    await expect(education).toContainText("B.Tech in Information Technology");
    await expect(education.locator("time")).toHaveText(["Aug 2023", "Aug 2027"]);
    await expect(education).toContainText("Final year");
    await expect(education.locator("ul").last().locator("li")).toHaveText([/national-level hackathons/, /^150\+ data structures and algorithms problems/]);
  });

  test("contact shows the email, the booking and resume actions and the socials, and never a phone", async ({ page }) => {
    await page.goto("/");
    const contact = page.locator("#contact");
    await expect(contact.locator('a[href="mailto:itsmrad@gmail.com"]')).toHaveText("itsmrad@gmail.com");
    await expect(contact.getByRole("link", { name: /book a call/i })).toHaveAttribute("href", "https://cal.com/itsmrad");
    await expect(contact.locator('a[href="/Anupam-Das-Resume.pdf"]')).toBeVisible();
    const links = contact.locator("ul a");
    expect(await links.evaluateAll((all) => all.map((a) => a.getAttribute("href")))).toEqual([
      "https://github.com/itsmrad",
      "https://x.com/AnupamIO",
      "https://www.linkedin.com/in/itsmrad",
    ]);
    for (const link of await links.all()) await expect(link).toHaveAttribute("rel", /\bme\b/);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    // No third-party script or frame comes with the booking link, and no hire questions without answers.
    await expect(page.locator('script[src*="cal.com"], iframe')).toHaveCount(0);
    await expect(page.getByText("Before you hire me")).toHaveCount(0);
  });

  test.describe("copying the email", () => {
    test.use({ permissions: ["clipboard-read", "clipboard-write"] });

    test("the very first click copies, says so for two seconds, then resets", async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto("/");
      await settle(page);
      // No input has happened yet, so the click itself fetches the code that handles it.
      const button = page.locator("#contact [data-copy]");
      await button.click();
      await expect(button).toHaveAttribute("data-copied", "");
      await expect(button.locator("[role=status]")).toHaveText("Copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("itsmrad@gmail.com");
      await expect(button).not.toHaveAttribute("data-copied", "", { timeout: 4000 });
      await expect(button.locator("[role=status]")).toHaveText("");
      // The address in the hero's facts copies too.
      await page.locator("#top [data-copy]").click();
      await expect(page.locator("#top [data-copy]")).toHaveAttribute("data-copied", "");
      expect(errors).toEqual([]);
    });
  });

  test("a refused copy selects the address and says so", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
    });
    await page.goto("/");
    for (const where of ["#top", "#contact"]) {
      await page.locator(`${where} [data-copy]`).click();
      await expect(page.locator(`${where} [data-copy] [role=status]`)).toHaveText(/Copy failed/);
      expect(await page.evaluate(() => getSelection()?.toString())).toBe("itsmrad@gmail.com");
    }
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("no control that needs a script is shown", async ({ page }) => {
      await page.goto("/");
      const shown = await page.locator("[data-js], [data-sound-control]").evaluateAll((items) => items.filter((item) => getComputedStyle(item).display !== "none").length);
      expect(shown).toBe(0);
      // The addresses themselves stay: the hero's line and the contact link.
      await expect(page.locator('#contact a[href^="mailto:"]')).toBeVisible();
    });
  });
});

/**
 * The booking action in both states. The page is built with whatever the
 * content file holds, so the component itself is compiled here and rendered
 * with and without an address.
 */
test("Book a call renders nothing without an address and a plain new-tab link with one", () => {
  type Exports = Record<string, unknown>;
  const packages = createRequire(path.resolve("package.json"));
  const load = (file: string): Exports => {
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    });
    const unit: { exports: Exports } = { exports: {} };
    const local = (id: string) => (id.startsWith("@/") ? path.resolve("src", id.slice(2)) : id.startsWith(".") ? path.resolve(path.dirname(file), id) : null);
    const resolve = (id: string) => {
      const base = local(id);
      return base ? load([".tsx", ".ts"].map((extension) => base + extension).find(existsSync)!) : packages(id);
    };
    new Function("require", "module", "exports", outputText)(resolve, unit, unit.exports);
    return unit.exports;
  };
  const BookCall = load("src/components/sections/book-call.tsx").BookCall as (props: { href: string }) => React.ReactNode;

  expect(renderToStaticMarkup(createElement(BookCall, { href: "" }))).toBe("");
  const html = renderToStaticMarkup(createElement(BookCall, { href: "https://cal.com/example" }));
  expect(html).toMatch(/^<a [^>]*href="https:\/\/cal\.com\/example"/);
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener"');
  expect(html).toContain("Book a call");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<iframe");
});
