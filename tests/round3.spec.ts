import { expect, test, type Page } from "@playwright/test";

import { collectErrors } from "./helpers";

/**
 * Owner review round 3: WASD in every game (and letters still type), the padlock's open and close, the
 * commit readings as scroll loaders, Redline's layout grid, and the banner's tech glyphs.
 */

async function wake(page: Page) {
  await page.addInitScript(() => localStorage.setItem("sound", "off"));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.mouse.move(700 + Math.random() * 20, 400);
    await expect(page.locator("[data-margin]")).toHaveCount(2, { timeout: 300 });
  }).toPass();
  await page.evaluate(() => document.getElementById("experience")!.scrollIntoView());
}

async function play(page: Page, id: string) {
  const card = page.locator(`[data-arcade-card="${id}"]`);
  await card.getByRole("button", { name: /^Play / }).click();
  const canvas = card.locator("canvas");
  await expect(canvas).toBeFocused();
  await canvas.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  return { card, canvas, frame: () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()) };
}

test.describe("controls", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("WASD steers, while the site's a, e, w, d shortcuts and eggs wait; all of them work again after Esc", async ({ page }) => {
    const errors = collectErrors(page);
    await wake(page);
    const game = await play(page, "snake");
    const theme = await page.evaluate(() => document.documentElement.className);
    const before = await game.frame();
    const scroll = await page.evaluate(() => scrollY);
    // D starts the line moving right; W, A, S turn it. None of them is a site shortcut while the game has focus.
    for (const key of ["d", "s", "a", "w", "e"]) await page.keyboard.press(key);
    await expect.poll(game.frame).not.toBe(before);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    expect(await page.evaluate(() => document.documentElement.className)).toBe(theme);
    await page.keyboard.press("Escape");
    await expect(game.canvas).toHaveCount(0);
    await page.keyboard.press("d");
    await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe(theme);
    await page.keyboard.press("w");
    await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById("work")!.getBoundingClientRect().top) < 120)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("games that take letters still get W, A, S and D as letters", async ({ page }) => {
    await wake(page);
    await play(page, "words");
    await page.keyboard.type("wasde");
    await page.keyboard.press("Enter");
    await expect(page.locator('section[aria-label="Arcade"] [role=status]')).toContainText(/^W .*, A .*, S .*, D .*, E /);
  });

  test("Enter restarts a finished round, as Space does", async ({ page }) => {
    await wake(page);
    const game = await play(page, "plane");
    const over = game.card.locator('[data-phase="over"]');
    await page.keyboard.press("w");
    await expect(over).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);
    await page.keyboard.press("Enter");
    await expect(over).toHaveCount(0);
  });
});

test.describe("the padlock", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const shackle = (page: Page) => page.locator('[data-toy="lock"] path').first();
  const transform = (page: Page) => shackle(page).evaluate((element) => getComputedStyle(element).transform);
  // Keyframe motion only (the press's own small scale transition is not the padlock's motion).
  const motion = (page: Page) =>
    shackle(page).evaluate((element) => element.getAnimations().flatMap((a) => (a instanceof CSSAnimation ? [a.animationName] : [])));

  test("lifts and swings open round its long leg, then closes the same way, as one piece", async ({ page }) => {
    await wake(page);
    const lock = page.locator('[data-toy="lock"]');
    await lock.scrollIntoViewIfNeeded();
    expect(await transform(page)).toBe("none");
    await lock.click();
    await expect(lock.locator("svg")).toHaveAttribute("data-open");
    expect((await motion(page)).join()).toMatch(/unlock/);
    await page.waitForTimeout(700);
    // Open: lifted 5 units and mirrored round the long leg; one path, so it never comes apart.
    expect(await transform(page)).toBe("matrix(-1, 0, 0, 1, 0, -5)");
    await expect(lock.locator("path")).toHaveCount(2);
    await lock.click();
    await expect(lock.locator("svg")).not.toHaveAttribute("data-open");
    expect((await motion(page)).join()).toMatch(/relock/);
    await page.waitForTimeout(700);
    expect(await transform(page)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("is open or shut at once", async ({ page }) => {
      await wake(page);
      const lock = page.locator('[data-toy="lock"]');
      await lock.scrollIntoViewIfNeeded();
      await lock.click();
      expect(await motion(page)).toEqual([]);
      expect(await transform(page)).toBe("matrix(-1, 0, 0, 1, 0, -5)");
    });
  });
});

test.describe("the commit readings", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /** Scroll so the reading is `q` of the way through its loading range (0 starts filling, 1 lands on the value). */
  const at = async (page: Page, value: number, q: number) => {
    await page.evaluate(
      ({ value, q }) => {
        const reading = document.querySelector(`[data-ratio="${value}"]`)!;
        const box = reading.getBoundingClientRect();
        const cover = innerHeight + box.height;
        scrollTo(0, box.top + scrollY - innerHeight + (0.1 + 0.3 * q) * cover);
      },
      { value, q },
    );
    await page.waitForTimeout(250);
    const reading = page.locator(`[data-ratio="${value}"]`);
    return {
      n: Number(await reading.evaluate((element) => getComputedStyle(element).getPropertyValue("--n"))),
      hit: await reading.getAttribute("data-hit"),
      hits: Number((await reading.getAttribute("data-hits")) ?? 0),
    };
  };

  for (const [value, of] of [
    [777, 801],
    [494, 494],
  ] as const) {
    test(`${value} / ${of}: fills and counts with the scroll, strikes once per arrival, and runs back`, async ({ page }) => {
      await wake(page);
      await page.locator(`[data-ratio="${value}"]`).waitFor({ state: "attached" });
      // From well above its range (so it is armed), counting hits from here.
      const { hits: base } = await at(page, value, -0.5);
      expect((await at(page, value, -0.3)).n).toBe(0);
      const half = await at(page, value, 0.5);
      expect(half.n).toBeGreaterThan(value * 0.3);
      expect(half.n).toBeLessThan(value * 0.7);
      expect(half.hit).toBeNull();
      const landed = await at(page, value, 1.2);
      expect(landed.n).toBe(value);
      expect(landed.hit).toBe("");
      expect(landed.hits).toBe(base + 1);
      // A small jiggle at the end is not a new arrival.
      await at(page, value, 0.9);
      expect((await at(page, value, 1.1)).hits).toBe(base + 1);
      // Back up the page: it empties and re-arms; down again: a second hit.
      const back = await at(page, value, 0.1);
      expect(back.hit).toBeNull();
      expect(back.n).toBeLessThan(value * 0.2);
      expect((await at(page, value, 1.2)).hits).toBe(base + 2);
    });
  }

  test("loads the same where CSS scroll-driven animations are missing (Safari before 26, Firefox)", async ({ page }) => {
    // Round 4: the owner's browser showed the end state. Report no support for scroll timelines at all.
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = ((...args: [string, string?]) => (/timeline|view\(/.test(args.join(" ")) ? false : supports(...(args as [string])))) as typeof CSS.supports;
    });
    await wake(page);
    await page.locator('[data-ratio="777"]').waitFor({ state: "attached" });
    expect(await page.evaluate(() => CSS.supports("animation-timeline: view()"))).toBe(false);
    const { hits: base } = await at(page, 777, -0.5);
    expect((await at(page, 777, -0.3)).n).toBe(0);
    const half = await at(page, 777, 0.5);
    expect(half.n).toBeGreaterThan(777 * 0.3);
    expect(half.n).toBeLessThan(777 * 0.7);
    const landed = await at(page, 777, 1.2);
    expect(landed).toMatchObject({ n: 777, hit: "", hits: base + 1 });
  });

  test("rests with the bar and its tick at 777 of 801, not at the end of the scale", async ({ page }) => {
    await wake(page);
    const reading = page.locator('[data-ratio="777"]');
    await reading.waitFor({ state: "attached" });
    await at(page, 777, 1.3);
    const geometry = await reading.evaluate((element) => {
      const width = element.clientWidth;
      // The first background layer is the bar: its width, as a share of the scale (computed as a percentage or px).
      const size = getComputedStyle(element).backgroundSize.split(",")[0]!.trim().split(" ")[0]!;
      const fill = size.endsWith("%") ? parseFloat(size) / 100 : parseFloat(size) / width;
      const tick = element.querySelector("i")!;
      return { fill, tick: (tick.offsetLeft + tick.offsetWidth / 2) / width };
    });
    expect(geometry.fill).toBeCloseTo(777 / 801, 2);
    expect(geometry.tick).toBeCloseTo(777 / 801, 2);
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("stays a still reading with its numbers", async ({ page }) => {
      await wake(page);
      const reading = page.locator('[data-ratio="777"]');
      await reading.scrollIntoViewIfNeeded();
      await expect(reading).not.toHaveAttribute("data-reading");
      await expect(reading).toContainText("777 / 801");
    });
  });
});

test.describe("Redline's layout", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("for all eight functions: the cloud stays in the buggy line's row and no code enters the marker column", async ({ page }) => {
    test.setTimeout(300_000);
    const seen = new Map<string, { rows: number; marker: number; top: number }>();
    for (let seed = 1; seen.size < 8 && seed < 15; seed++) {
      await page.addInitScript((seed) => {
        let a = seed;
        Math.random = () => {
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }, seed);
      await wake(page);
      await play(page, "redline");
      await page.keyboard.press("s");
      for (let k = 0; k < 5; k++) {
        // Line 1 is never the bug: a wrong pick shows the strike, the cloud and the marker together.
        await page.keyboard.press("1");
        await page.waitForTimeout(500);
        const said = await page.locator('section[aria-label="Arcade"] [role=status]').innerText();
        const measured = await page.locator('[data-arcade-card="redline"] canvas').evaluate((canvas: HTMLCanvasElement) => {
          const probe = document.createElement("canvas").getContext("2d")!;
          const rgb = (css: string) => {
            probe.fillStyle = css;
            probe.fillRect(0, 0, 1, 1);
            return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)];
          };
          const style = getComputedStyle(canvas);
          const accent = rgb(style.getPropertyValue("--accent") || "red");
          canvas.style.color = "var(--foreground)";
          const ink = rgb(getComputedStyle(canvas).color);
          canvas.style.color = "";
          const k = canvas.width / 240;
          const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
          // Opaque pixels only: what the game never drew is transparent black, which would read as ink in the light theme.
          const near = (i: number, c: number[]) =>
            data[i + 3]! > 160 && Math.abs(data[i]! - c[0]!) + Math.abs(data[i + 1]! - c[1]!) + Math.abs(data[i + 2]! - c[2]!) < 60;
          let top = Infinity;
          let bottom = -Infinity;
          let marker = 0;
          for (let y = Math.round(18 * k); y < Math.round(136 * k); y++)
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              if (near(i, accent)) [top, bottom] = [Math.min(top, y), Math.max(bottom, y)];
              else if (x >= (240 - 18) * k && near(i, ink)) marker++;
            }
          return { rows: (bottom - top) / k, marker, top: top / k };
        });
        const name = said.split(".")[1]?.trim().slice(0, 24) ?? said;
        seen.set(name, measured);
        await page.keyboard.press("Space");
        await page.waitForTimeout(250);
      }
    }
    console.log("redline layout", JSON.stringify([...seen]));
    expect(seen.size).toBe(8);
    for (const [name, { rows, marker }] of seen) {
      // The cloud and its delta: one row (14 units at most) and its antialiased edge, never the lines above or below.
      expect(rows, name).toBeLessThanOrEqual(15.5);
      expect(marker, name).toBe(0);
    }
  });
});

test.describe("the banner's glyphs", () => {
  for (const width of [360, 390, 640, 768, 1024, 1280, 1440, 1920])
    test(`at ${width}: off the monogram, its 30° note, the stickers and each other, inside the banner`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const report = await page.evaluate(() => {
        // The glyph host: the monogram's box, the one element in the hero whose ::before carries masks.
        const mark = [...document.querySelectorAll("#top div")].find((element) => getComputedStyle(element, "::before").maskImage !== "none")!;
        const svg = document.querySelector<SVGSVGElement>("#top svg[viewBox]")!;
        const host = mark.getBoundingClientRect();
        const glyphs: { left: number; top: number; right: number; bottom: number }[] = [];
        for (const which of ["::before", "::after"]) {
          const style = getComputedStyle(mark, which);
          const x0 = host.left + parseFloat(style.left);
          const y0 = host.top + parseFloat(style.top);
          const sizes = style.maskSize.split(",").map((size) => parseFloat(size));
          style.maskPosition.split(",").forEach((pair, i) => {
            const [x, y] = pair.trim().split(" ").map(parseFloat);
            const size = sizes[i] ?? sizes[0]!;
            glyphs.push({ left: x0 + x!, top: y0 + y!, right: x0 + x! + size, bottom: y0 + y! + size });
          });
        }
        const hits = (a: (typeof glyphs)[number], b: DOMRect | (typeof glyphs)[number], pad = 3) =>
          a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;
        const found: string[] = [];
        glyphs.forEach((a, i) => glyphs.slice(i + 1).forEach((b, j) => hits(a, b) && found.push(`glyph ${i} / glyph ${i + j + 1}`)));
        for (const sticker of document.querySelectorAll<HTMLElement>("[data-sticker]")) {
          const box = sticker.getBoundingClientRect();
          if (box.width && getComputedStyle(sticker).visibility !== "hidden") glyphs.forEach((g, i) => hits(g, box) && found.push(`glyph ${i} / sticker ${sticker.dataset.sticker}`));
        }
        const angle = svg.querySelector("g[class]:has(text)")?.getBoundingClientRect();
        if (angle) glyphs.forEach((g, i) => hits(g, angle) && found.push(`glyph ${i} / 30° note`));
        // The monogram itself, by its geometry: sample every glyph box on a 2px grid against each face and edge.
        const matrix = svg.getScreenCTM()!.inverse();
        const shapes = [...svg.querySelectorAll<SVGGeometryElement>("path, polygon, polyline, line")].filter(
          (shape) => !shape.closest("g[class]:has(text), defs, pattern, clipPath, mask"),
        );
        glyphs.forEach((g, i) => {
          for (let x = g.left; x <= g.right; x += 2)
            for (let y = g.top; y <= g.bottom; y += 2) {
              const point = new DOMPoint(x, y).matrixTransform(matrix);
              if (shapes.some((shape) => shape.isPointInFill(point) || shape.isPointInStroke(point))) {
                found.push(`glyph ${i} / monogram`);
                return;
              }
            }
        });
        const banner = mark.parentElement!.getBoundingClientRect();
        glyphs.forEach((g, i) => (g.left < banner.left || g.right > banner.right) && found.push(`glyph ${i} outside the banner`));
        return { count: glyphs.length, found };
      });
      console.log(`glyphs at ${width}: ${report.count}`, report.found);
      expect(report.count).toBeGreaterThanOrEqual(3);
      expect(report.count).toBeLessThanOrEqual(9);
      expect(report.found).toEqual([]);
    });

  test("are in the server's CSS, drawn before any script runs", async ({ browser }) => {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await page.goto("/");
    const masks = await page.evaluate(() =>
      [...document.querySelectorAll("#top div")].map((element) => getComputedStyle(element, "::before").maskImage).find((mask) => mask !== "none") ?? "",
    );
    expect(masks.split("url(").length - 1).toBeGreaterThanOrEqual(5);
    await page.close();
  });
});
