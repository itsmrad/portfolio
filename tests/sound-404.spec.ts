import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, resources, scriptBrotli, scriptBytesAddedBy, settle } from "./helpers";
import { VOICES, engineModule, renderVoices, similarity } from "./voices";

const ENGINE_BUDGET = 4 * 1024;
const GAME_BUDGET = 12 * 1024;

/** Counts live AudioContexts, started sources, panners and animation frames. */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const audio = { contexts: 0, starts: 0, pans: [] as AudioParam[], frames: 0, ctx: null as AudioContext | null };
    (window as unknown as { __audio: typeof audio }).__audio = audio;
    if (window.AudioContext) {
      const Base = window.AudioContext;
      window.AudioContext = class extends Base {
        constructor(options?: AudioContextOptions) {
          super(options);
          audio.contexts++;
          audio.ctx = this;
        }
      };
      const start = AudioScheduledSourceNode.prototype.start as (this: AudioScheduledSourceNode, ...args: unknown[]) => void;
      AudioScheduledSourceNode.prototype.start = function (this: AudioScheduledSourceNode, ...args: unknown[]) {
        if (!(this.context instanceof OfflineAudioContext)) audio.starts++;
        start.apply(this, args);
      };
      const panner = BaseAudioContext.prototype.createStereoPanner;
      BaseAudioContext.prototype.createStereoPanner = function () {
        const node = panner.call(this);
        audio.pans.push(node.pan);
        return node;
      };
    }
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      audio.frames++;
      return raf(callback);
    };
  });
}

const audio = (page: Page) =>
  page.evaluate(() => {
    const state = (window as unknown as { __audio: { contexts: number; starts: number; pans: AudioParam[]; frames: number; ctx: AudioContext | null } }).__audio;
    return { contexts: state.contexts, starts: state.starts, pans: state.pans.map((pan) => pan.value), frames: state.frames, state: state.ctx?.state };
  });

const soundButton = (page: Page) => page.locator("header button[aria-keyshortcuts='m']");

test.describe("sound engine", () => {
  test("every voice renders offline: audible, short, unclipped and distinct", async ({ page }) => {
    await page.goto("about:blank");
    const reports = await page.evaluate(renderVoices, { code: engineModule(), voices: VOICES });
    const longest: Record<string, number> = { note: 0.5, scratch: 0.9, gameOver: 0.8 };
    for (const { name, peak, seconds, clipped } of reports) {
      const level = `${name}: peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS, ${Math.round(seconds * 1000)} ms`;
      expect(peak, `${level} is audible`).toBeGreaterThan(10 ** (-60 / 20));
      expect(peak, `${level} stays under the limiter`).toBeLessThan(0.9);
      expect(clipped, `${level} never clips`).toBe(0);
      expect(seconds, `${level} is short`).toBeLessThanOrEqual(longest[name] ?? 0.3);
    }
    const pairs = reports.flatMap((a, i) => reports.slice(i + 1).map((b) => ({ pair: `${a.name}/${b.name}`, value: similarity(a.features, b.features) })));
    const closest = pairs.reduce((max, pair) => (pair.value > max.value ? pair : max));
    console.log(`voices: ${reports.length}, closest pair ${closest.pair} at ${closest.value.toFixed(3)}`);
    for (const { pair, value } of pairs) expect(value, `${pair} sound alike`).toBeLessThan(0.9);
  });

  test.describe("in the page", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("silent until a gesture, then a small lazy engine plays panned voices and suspends when idle", async ({ page }) => {
      const errors = collectErrors(page);
      await instrument(page);
      await page.goto("/");
      await settle(page);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
      expect((await audio(page)).contexts, "no audio on load or scroll").toBe(0);

      const button = soundButton(page);
      await expect(button).toHaveAttribute("aria-pressed", "true");
      // Muting plays its own "off" voice, then nothing more.
      const added = await scriptBytesAddedBy(page, () => button.click());
      console.log(`sound engine chunk: ${kb(added)} brotli`);
      expect(added).toBeGreaterThan(0);
      expect(added).toBeLessThanOrEqual(ENGINE_BUDGET);
      const muted = await audio(page);
      expect(muted.contexts).toBe(1);
      expect(muted.starts).toBeGreaterThan(0);
      // The button sits on the right of the screen, so the voice pans right.
      expect(muted.pans.at(-1)).toBeGreaterThan(0.2);
      await expect(button).toHaveAttribute("aria-pressed", "false");
      expect(await page.evaluate(() => [localStorage.getItem("sound"), document.documentElement.dataset.sound])).toEqual(["off", "off"]);

      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const on = await audio(page);
      expect(on.starts, "enabling plays the toggle voice").toBeGreaterThan(muted.starts);
      // Idle: suspended 2.5 s after the last sound ends.
      await expect.poll(async () => (await audio(page)).state, { timeout: 6000 }).toBe("suspended");
      expect(errors).toEqual([]);
    });

    test("the mute choice persists and paints before hydration without warnings", async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto("/");
      await soundButton(page).click();
      await page.reload();
      await expect(soundButton(page)).toHaveAttribute("aria-pressed", "false");
      expect(await page.evaluate(() => document.documentElement.dataset.sound)).toBe("off");
      await settle(page);
      await expect(soundButton(page)).toHaveAttribute("aria-pressed", "false");
      expect(errors).toEqual([]);
    });

    test("never throws when Web Audio is missing", async ({ page }) => {
      const errors = collectErrors(page);
      await page.addInitScript(() => {
        // @ts-expect-error simulating a browser without Web Audio
        delete window.AudioContext;
      });
      await page.goto("/");
      await soundButton(page).click();
      await soundButton(page).click();
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  });

  test.describe("haptics", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("phones vibrate with the voice pairs and stay still when muted", async ({ page }) => {
      await page.addInitScript(() => {
        const calls: unknown[] = [];
        (window as unknown as { __vibrations: unknown[] }).__vibrations = calls;
        Object.defineProperty(Navigator.prototype, "vibrate", { configurable: true, value: (pattern: unknown) => calls.push(pattern) > 0 });
      });
      await page.goto("/");
      const vibrations = () => page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations);
      await soundButton(page).tap(); // muting: the "off" pair fires, then silence
      await soundButton(page).tap(); // enabling
      expect(await vibrations()).toEqual([14, 14]);
    });
  });
});

test.describe("404", () => {
  test("reads fine without JavaScript and links home", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/no-such-page");
    await expect(page.locator("h1")).toContainText("404");
    await expect(page.locator('main a[href="/"]')).toBeVisible();
    await expect(page.locator("figure[data-game]")).toBeHidden();
    await context.close();
  });

  test("numerals settle in, and do not move under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/no-such-page");
    const animations = await page.locator("h1 > span:first-child > span").evaluateAll((digits) => digits.map((digit) => getComputedStyle(digit).animationName));
    expect(animations).toEqual(["none", "none", "none"]);
  });

  test("phones get the page without the game", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/no-such-page");
    await settle(page);
    await expect(page.locator("figure[data-game]")).toBeHidden();
    // A canvas the game never attached to keeps its default 300px backing store.
    expect(await page.evaluate(() => document.querySelector("canvas")?.width)).toBe(300);
  });

  test.describe("desktop game", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("loads lazily within budget, draws in the page colours, plays by keyboard with sound, pauses when hidden", async ({ page, browser }) => {
      const errors = collectErrors(page);
      await instrument(page);

      // The game's own chunk: scripts on the desktop 404 that a phone never loads.
      const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await phone.goto("/no-such-page");
      await settle(phone);
      const phoneScripts = new Set((await resources(phone)).filter((resource) => resource.type === "script").map((script) => new URL(script.url).pathname));
      await phone.close();

      await page.goto("/no-such-page");
      await settle(page);
      const lazy = (await resources(page)).filter((resource) => resource.type === "script" && !phoneScripts.has(new URL(resource.url).pathname));
      const bytes = lazy.reduce((total, script) => total + scriptBrotli(script.url), 0);
      console.log(`game chunk: ${kb(bytes)} brotli in ${lazy.length} file(s)`);
      expect(lazy.length).toBeGreaterThan(0);
      expect(bytes).toBeLessThanOrEqual(GAME_BUDGET);

      const canvas = page.locator("canvas[role=application]");
      await expect(canvas).toBeVisible();
      const inked = () =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
          let count = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) count++;
          return count;
        });
      expect(await inked(), "bricks, paddle and ball are drawn").toBeGreaterThan(10_000);

      // Keyboard: focus, launch with Space; the ball soon meets a wall, the paddle or the floor.
      await canvas.focus();
      await page.waitForTimeout(600); // the page scrolls smoothly to the focused canvas
      const scrolled = await page.evaluate(() => window.scrollY);
      const before = (await audio(page)).starts;
      await page.keyboard.press("Space");
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(400);
      await page.keyboard.up("ArrowRight");
      await expect.poll(async () => (await audio(page)).starts, { timeout: 5000 }).toBeGreaterThan(before);
      expect(await page.evaluate(() => window.scrollY), "Space does not scroll while playing").toBe(scrolled);

      // Hidden tab: the loop stops.
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const frames = (await audio(page)).frames;
      await page.waitForTimeout(500);
      expect((await audio(page)).frames).toBe(frames);

      expect(errors.filter((error) => !error.includes("404"))).toEqual([]);
    });
  });
});
