import { expect, test, type Page } from "@playwright/test";

import { collectErrors } from "./helpers";

/**
 * Owner review round 2: nothing in the margins may collide, collapsed or with
 * any one cartridge open. At 1280, 1440 and 1920 wide, in both themes, it
 * collects the box of every margin item (notes with their arrows, readings,
 * callouts, toys, the cat, the timer, the stickers, dimension labels, every
 * cartridge card) and fails on:
 * - two items overlapping (stickers among themselves excepted: the hero's set is drawn that way);
 * - an item touching the reading column (8px of paper kept) or the viewport edge;
 * - an item in the scroll ruler's band (its ticks and tracker), anywhere down the page;
 * - any line of margin text crossing a ruled, dashed or hatched full-bleed line.
 * Then it opens each card in turn and checks the open card the same way.
 */
const WIDTHS = [1280, 1440, 1920];
const THEMES = ["light", "dark"] as const;

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("sound", "off"));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.mouse.move(700 + Math.random() * 20, 400);
    await expect(page.locator("[data-margin]")).toHaveCount(2, { timeout: 300 });
  }).toPass();
  // Walk the page so every lazy piece mounts and every note is written in.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(60);
  }
  await expect(page.locator('[data-arcade-card="arcade"]')).toBeAttached();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

/** Every problem on the page as it stands, as readable strings. `only`: check just this card against the rest. */
function problems(page: Page, only?: string) {
  return page.evaluate((only) => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
    };
    const page = (box: DOMRect) => ({ left: box.left, right: box.right, top: box.top + scrollY, bottom: box.bottom + scrollY });
    type Box = ReturnType<typeof page> & { name: string; kind: string };
    const name = (element: Element) =>
      element.getAttribute("data-arcade-card") ??
      element.getAttribute("data-note") ??
      element.getAttribute("data-toy") ??
      element.getAttribute("data-measures") ??
      (element.hasAttribute("data-cat-bed") ? "cat" : (element.textContent ?? "").trim().slice(0, 24) || element.tagName);

    const items: Box[] = [];
    const add = (selector: string, kind: string) => {
      for (const element of document.querySelectorAll(selector)) if (visible(element)) items.push({ ...page(element.getBoundingClientRect()), name: name(element), kind });
    };
    add("[data-arcade-card]", "card");
    add("[data-margin] :is([data-note], [data-life], [data-cat-bed], [data-timer])", "note");
    add("[data-margin] :is([data-measures], [data-axis]) > span", "label");
    add("[data-sticker]", "sticker");

    const column = document.querySelector('[data-slot="frame"]')!.getBoundingClientRect();
    const rail = document.querySelector("[data-rail]")?.parentElement;
    const ruler = rail && visible(rail) ? rail.getBoundingClientRect() : null;

    // Full-bleed lines: pseudo-elements wider than the viewport (rules, screen lines, hatch bands).
    const lines: [number, number][] = [];
    for (const element of document.querySelectorAll("body *")) {
      for (const which of ["::before", "::after"]) {
        const style = getComputedStyle(element, which);
        // Wider than the viewport, and thin or a band: inline counters and labels ("auto" wide) are not lines.
        if (style.content === "none" || !(parseFloat(style.width) >= innerWidth)) continue;
        const box = element.getBoundingClientRect();
        const height = parseFloat(style.height) || 1;
        const top = parseFloat(style.top);
        const bottom = parseFloat(style.bottom);
        const y = !Number.isNaN(top) && style.top !== "auto" ? box.top + top : box.bottom - (Number.isNaN(bottom) ? 0 : bottom) - height;
        lines.push([y + scrollY, y + scrollY + Math.max(1, height)]);
      }
    }
    // Each run of margin text, as laid out.
    const texts: Box[] = [];
    for (const root of document.querySelectorAll('[data-slot="gutter"], [data-arcade-card]')) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || !visible(node.parentElement!)) continue;
        // Cards are opaque paper laid over the sheet; the margin's own width label sits on its dimension line by design.
        if (node.parentElement!.closest("[data-arcade-card], [data-axis]")) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width > 0) texts.push({ ...page(rect), name: node.textContent.trim().slice(0, 24), kind: "text" });
      }
    }

    const found: string[] = [];
    const hits = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const mine = (box: Box) => !only || (box.kind === "card" && box.name === only);
    items.forEach((a, i) =>
      items.slice(i + 1).forEach((b) => {
        if ((mine(a) || mine(b)) && !(a.kind === "sticker" && b.kind === "sticker") && hits(a, b)) found.push(`overlap: ${a.name} / ${b.name}`);
      }),
    );
    for (const box of items.filter(mine)) {
      if (box.right > column.left - 8 && box.left < column.right + 8) found.push(`column: ${box.name}`);
      if (box.left < 8 || box.right > innerWidth - 8) found.push(`edge: ${box.name}`);
      if (ruler && box.kind !== "sticker" && box.left < ruler.right + 8 && box.right > ruler.left) found.push(`ruler: ${box.name}`);
    }
    if (!only)
      for (const text of texts)
        if (lines.some(([from, to]) => text.top < to + 1 && text.bottom > from - 1)) found.push(`line: "${text.name}" at ${Math.round(text.top)}`);
    return [...new Set(found)];
  }, only);
}

for (const theme of THEMES)
  for (const width of WIDTHS)
    test.describe(`margins, ${width} ${theme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme });

      test("no collisions, collapsed and with each card open", async ({ page }) => {
        test.setTimeout(120_000);
        const errors = collectErrors(page);
        await open(page);
        const all: string[] = [];
        all.push(...(await problems(page)).map((problem) => `collapsed ${problem}`));
        for (const id of await page.locator("[data-arcade-card]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-arcade-card")!))) {
          const play = page.locator(`[data-arcade-card="${id}"]`).getByRole("button", { name: /^Play / });
          if (!(await play.count())) continue;
          await play.click();
          await expect(page.locator(`[data-arcade-card="${id}"] canvas`)).toBeVisible();
          await page.waitForTimeout(420);
          all.push(...(await problems(page, id)).map((problem) => `${id} open ${problem}`));
          await page.keyboard.press("Escape");
          await expect(page.locator(`[data-arcade-card="${id}"] canvas`)).toHaveCount(0);
        }
        console.log(`margins ${width} ${theme}: ${all.length} problems${all.length ? `\n  ${all.join("\n  ")}` : ""}`);
        expect(all).toEqual([]);
        expect(errors).toEqual([]);
      });
    });
