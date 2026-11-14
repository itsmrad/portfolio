import { expect, test, type Page } from "@playwright/test";

import { collectErrors } from "./helpers";

/**
 * The accent (see "Highlights" in globals.css): its contrast, measured on the
 * colours the browser actually paints, and the resume download as the one
 * accent-filled action.
 */

/** Painted sRGB of each token, read back from a 1px canvas so OKLCH and light-dark() resolve as the browser renders them. */
function painted(page: Page, tokens: string[]) {
  return page.evaluate((names) => {
    const probe = document.body.appendChild(document.createElement("i"));
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const result: Record<string, number[]> = {};
    for (const name of names) {
      probe.style.color = `var(${name})`;
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      result[name] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    }
    probe.remove();
    return result;
  }, tokens);
}

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** The ratios reported in the handoff, per theme: accent text on the page, its foreground on the fill, ink on the marker tint. */
const MEASURED = {
  light: { text: 5.15, fill: 5.15, marker: 15.5 },
  dark: { text: 7.5, fill: 7.5, marker: 11.7 },
};

for (const theme of ["light", "dark"] as const) {
  test(`accent tokens meet AA in the ${theme} theme, chosen from the system or the toggle`, async ({ page }) => {
    for (const via of ["system", "class"] as const) {
      // The toggle stores a class that beats the system: emulate the opposite system to prove the class wins.
      const system = via === "system" ? theme : theme === "light" ? "dark" : "light";
      await page.emulateMedia({ colorScheme: system });
      await page.goto("/");
      if (via === "class") await page.evaluate((name) => document.documentElement.classList.add(name), theme);
      const c = await painted(page, ["--accent", "--accent-foreground", "--accent-soft", "--background", "--foreground"]);
      const text = ratio(c["--accent"]!, c["--background"]!);
      const fill = ratio(c["--accent-foreground"]!, c["--accent"]!);
      const marker = ratio(c["--foreground"]!, c["--accent-soft"]!);
      expect(text, `${via}: accent text on the page`).toBeGreaterThanOrEqual(4.5);
      expect(fill, `${via}: foreground on the accent fill`).toBeGreaterThanOrEqual(4.5);
      expect(marker, `${via}: ink on the marker tint`).toBeGreaterThanOrEqual(4.5);
      expect(text).toBeCloseTo(MEASURED[theme].text, 1);
      expect(fill).toBeCloseTo(MEASURED[theme].fill, 1);
      expect(marker).toBeCloseTo(MEASURED[theme].marker, 0);
    }
  });
}

test("the resume download is the one accent-filled action, in the header, the hero and contact", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  const accent = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement("i"));
    probe.style.backgroundColor = "var(--accent)";
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  const filled = await page.locator('[data-slot="button"]').evaluateAll(
    (buttons, fill) =>
      buttons
        .filter((button) => getComputedStyle(button).backgroundColor === fill)
        .map((button) => `${button.closest("header, section")?.id || button.closest("header")?.tagName}:${button.getAttribute("href")}`),
    accent,
  );
  expect(filled).toEqual(["HEADER:/Anupam-Das-Resume.pdf", "top:/Anupam-Das-Resume.pdf", "contact:/Anupam-Das-Resume.pdf"]);
  // Its partner stays the quiet outline.
  for (const book of await page.getByRole("link", { name: /Book a call/ }).all())
    expect(await book.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(accent);
  expect(errors).toEqual([]);
});

test("every configured highlight still finds its text", async ({ page }) => {
  await page.goto("/");
  // Two project pitches and three experience outcomes; two accent numerals per featured project.
  await expect(page.locator("strong.highlight")).toHaveCount(5);
  await expect(page.locator("#codenaya [data-accent]")).toHaveCount(2);
  await expect(page.locator("#xflow [data-accent]")).toHaveCount(2);
  await expect(page.locator("#xflow [data-accent] dd").first()).toHaveText("3.0 MiB");
});
