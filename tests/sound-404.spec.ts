import { expect, test, type Page } from "@playwright/test";

import { collectErrors, kb, resources, scriptBrotli, scriptBytesAddedBy, settle } from "./helpers";
import { VOICES, db, distance, engineModule, renderVoices, type VoiceReport } from "./voices";

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
      // Buffer sources (noise) have their own start(), so patch both prototypes.
      for (const proto of [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype]) {
        const start = proto.start as (this: AudioScheduledSourceNode, ...args: unknown[]) => void;
        proto.start = function (this: AudioScheduledSourceNode, ...args: unknown[]) {
          if (!(this.context instanceof OfflineAudioContext)) audio.starts++;
          start.apply(this, args);
        };
      }
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
  test("every voice renders offline: audible, short, unclipped alone and doubled, and distinct", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("about:blank");
    const seeds = [1, 2, 3, 4];
    const reports: VoiceReport[] = await page.evaluate(renderVoices, { code: engineModule(), voices: VOICES, seeds });
    // Long voices by design; every other voice is a click or a short chime.
    const longest: Record<string, number> = { note: 0.5, scratch: 0.95, gameOver: 0.8 };
    for (const { name, seed, peak, seconds, overlapPeak } of reports) {
      const label = `${name} (seed ${seed}): peak ${db(peak).toFixed(1)} dBFS, doubled ${db(overlapPeak).toFixed(1)} dBFS, ${Math.round(seconds * 1000)} ms`;
      // -24 dBFS is clearly audible on laptop speakers at a normal volume; the quietest voice measures about -20.
      expect(db(peak), `${label} is audible`).toBeGreaterThan(-24);
      // A single voice stays in the bus's linear range (below -4.4 dBFS) with headroom.
      expect(db(peak), `${label} leaves headroom`).toBeLessThan(-6);
      // Two of the same voice on one instant (the worst common overlap) still never clips.
      expect(overlapPeak, `${label} never clips when doubled`).toBeLessThan(1);
      expect(seconds, `${label} is short`).toBeLessThanOrEqual(longest[name] ?? 0.35);
    }

    // Distinct: two different voices must differ more than either voice differs from itself across seeds
    // (only its pitch jitter and noise change). Measured: the closest pair is about 1.75 times its own spread.
    const names = VOICES.map(([name]) => name);
    const of = (name: string) => reports.filter((report) => report.name === name);
    const spread = Object.fromEntries(
      names.map((name) => [name, Math.max(...of(name).flatMap((a) => of(name).map((b) => (a === b ? 0 : distance(a.features, b.features)))))]),
    );
    let closest = { pair: "", ratio: Infinity };
    names.forEach((x, i) =>
      names.slice(i + 1).forEach((y) => {
        const between = Math.min(...of(x).flatMap((a) => of(y).map((b) => distance(a.features, b.features))));
        const ratio = between / Math.max(spread[x]!, spread[y]!);
        if (ratio < closest.ratio) closest = { pair: `${x}/${y}`, ratio };
        expect(ratio, `${x} and ${y} sound alike: ${between.toFixed(2)} dB apart, own spread ${Math.max(spread[x]!, spread[y]!).toFixed(2)} dB`).toBeGreaterThan(1.25);
      }),
    );
    const level = (name: string) => db(Math.min(...of(name).map((report) => report.peak)));
    console.log(`voices: ${names.length} x ${seeds.length} seeds; quietest peak ${Math.min(...names.map(level)).toFixed(1)} dBFS; closest pair ${closest.pair} at ${closest.ratio.toFixed(2)}x its own spread`);
  });

  test.describe("engine safety", () => {
    /** The real engine module in a blank page, with a clickable body for user activation. */
    async function engineIn(page: Page) {
      await page.goto("about:blank");
      await page.mouse.click(10, 10);
      await page.evaluate(async (code) => {
        const w = window as unknown as Record<string, unknown>;
        w.__engine = await import(/* @vite-ignore */ URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
        w.__starts = 0;
        for (const proto of [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype]) {
          const start = proto.start as (this: AudioScheduledSourceNode, ...args: unknown[]) => void;
          proto.start = function (this: AudioScheduledSourceNode, ...args: unknown[]) {
            (w.__starts as number)++;
            start.apply(this, args);
          };
        }
      }, engineModule());
    }

    test("a context that will not start never releases a burst of queued sounds", async ({ page }) => {
      await engineIn(page);
      const starts = await page.evaluate(async () => {
        const w = window as unknown as { __engine: typeof import("../src/lib/sound-engine"); __starts: number };
        // Hold the context the way a browser does before a gesture: suspended, resume() pending.
        const realState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state")!.get!;
        const realResume = AudioContext.prototype.resume;
        let blocked = true;
        const pending: (() => void)[] = [];
        Object.defineProperty(BaseAudioContext.prototype, "state", {
          configurable: true,
          get() {
            return blocked ? "suspended" : realState.call(this);
          },
        });
        AudioContext.prototype.resume = function () {
          return new Promise<void>((resolve) => pending.push(() => realResume.call(this).then(resolve)));
        };
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        // A second of game sounds while blocked, then a click releases the context.
        for (let i = 0; i < 40; i++) {
          w.__engine.play("bounce", 0, {}, performance.now());
          await sleep(25);
        }
        await sleep(200);
        const before = w.__starts;
        blocked = false;
        pending.forEach((release) => release());
        await sleep(300);
        // And a sound whose engine chunk arrived a second late is dropped outright.
        w.__engine.play("thump", 0, {}, performance.now() - 1000);
        await sleep(100);
        return w.__starts - before;
      });
      expect(starts, "sounds started when the blocked context was released").toBe(0);
    });

    test("hostile options after the context has idled never throw or reject", async ({ page }) => {
      const errors = collectErrors(page);
      await engineIn(page);
      const state = await page.evaluate(async () => {
        const w = window as unknown as { __engine: typeof import("../src/lib/sound-engine"); __starts: number };
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        w.__engine.play("tap", 0, {});
        await sleep(3300); // suspended 2.5 s after the last sound
        const hostile: [string, number, object][] = [
          ["note", 0, { index: NaN }],
          ["note", 0, { index: -3 }],
          ["note", 0, { index: 99.5 }],
          ["scratch", 0, { duration: -5 }],
          ["scratch", 0, { duration: Infinity }],
          ["tap", NaN, { delay: -1 }],
          ["open", Infinity, { delay: Infinity, duration: NaN }],
          ["copy", 0, { delay: "soon", x: "left" }],
        ];
        for (const [name, pan, options] of hostile) w.__engine.play(name as "tap", pan, options);
        await sleep(600);
        return w.__starts;
      });
      expect(state, "the guarded sounds still played").toBeGreaterThan(2);
      expect(errors).toEqual([]);
    });
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

    test("a muted page stays silent and fetches nothing", async ({ page }) => {
      await instrument(page);
      await page.addInitScript(() => localStorage.setItem("sound", "off"));
      await page.goto("/");
      await settle(page);
      const scripts = (await resources(page)).length;
      await page.getByRole("button", { name: "Toggle light and dark theme", exact: true }).click();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(600);
      expect(await audio(page)).toMatchObject({ contexts: 0, starts: 0 });
      expect((await resources(page)).length, "no engine download while muted").toBe(scripts);
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

    test("follows the pixel ratio: zoom or a move between screens keeps the figure sharp", async ({ page }) => {
      // Record the resolution queries the game watches, so the test can play the browser's part.
      await page.addInitScript(() => {
        const queries: MediaQueryList[] = [];
        (window as unknown as { __resolution: MediaQueryList[] }).__resolution = queries;
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query: string) => {
          const list = original(query);
          if (query.includes("resolution")) queries.push(list);
          return list;
        };
      });
      await page.goto("/no-such-page");
      const canvas = page.locator("canvas[role=application]");
      await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width)).toBe(638);
      // Zooming to 200% (or moving to a 2x screen): the ratio changes and the query reports it.
      // (An emulated ratio change in headless Chromium paints no frame, so it cannot stand in.)
      await page.evaluate(() => {
        Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => 2 });
        // The game re-subscribes on every change, so only the newest query is live.
        (window as unknown as { __resolution: MediaQueryList[] }).__resolution.at(-1)!.dispatchEvent(new Event("change"));
      });
      await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width)).toBe(1276);
    });
  });

  test.describe("crossing the breakpoint", () => {
    test.use({ viewport: { width: 900, height: 900 } });

    test("a window widened after load starts the game", async ({ page }) => {
      await page.goto("/no-such-page");
      await settle(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      const canvas = page.locator("canvas[role=application]");
      await expect(canvas).toBeVisible();
      await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width)).toBe(638);
    });

    test("if the game chunk fails, the figure goes and the plain 404 remains", async ({ page }) => {
      await page.goto("/no-such-page");
      await settle(page);
      await page.route("**/_next/static/chunks/**", (route) => route.abort());
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(page.locator("figure[data-game]")).toBeHidden();
      await expect(page.locator('main a[href="/"]')).toBeVisible();
    });
  });
});
