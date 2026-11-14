/**
 * Builds a game's `ctx` (contract.ts) around one canvas: sizing for the pixel
 * ratio, theme colours, the frame loop and its pauses, normalised input and the
 * score plumbing. Shared by the arcade shell and the 404's figure, so a game
 * runs the same in both.
 */
import { play } from "@/lib/sound";

import { HUES, type Colors, type GameContext, type Key } from "./contract";

type Options = {
  width: number;
  height: number;
  /** Arcade: every key without a modifier belongs to the game (no shortcuts, no scrolling). 404: only the game's keys. */
  exclusive: boolean;
  /** Arcade: the loop also stops while the canvas does not have focus. */
  pauseOnBlur: boolean;
  onScore?: (value: number, text?: string) => void;
  onOver?: (result?: string) => void;
  onEscape?: () => void;
  /** Fired when the loop stops or starts for any reason, so the shell can show "paused". */
  onRunning?: (running: boolean) => void;
  announce: (message: string) => void;
};

const KEYS: Record<string, Key> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", " ": "action", Enter: "action" };
const TOKENS: Record<keyof Colors, string> = {
  ink: "--foreground",
  muted: "--muted-foreground",
  line: "--cross",
  paper: "--background",
  signal: "--signal",
  ...(Object.fromEntries(HUES.map((hue) => [hue, `--arcade-${hue}`])) as Record<(typeof HUES)[number], string>),
};

export function host(canvas: HTMLCanvasElement, options: Options) {
  const { width: W, height: H } = options;
  const g = canvas.getContext("2d")!;
  let frames: ((dt: number, now: number) => void)[] = [];
  let keys: ((key: Key, down: boolean, event: KeyboardEvent) => void)[] = [];
  let pointers: ((type: "down" | "move" | "up", x: number, y: number, event: PointerEvent) => void)[] = [];
  let themes: (() => void)[] = [];
  const held = new Set<Key>();

  const colors = {} as Colors;
  const root = getComputedStyle(document.documentElement);
  const family = (name: string, rest: string) => `${root.getPropertyValue(name).trim() || rest}, ${rest}`;
  const fonts = {
    mono: family("--font-geist-mono", "ui-monospace, monospace"),
    pixel: family("--font-geist-pixel", "ui-monospace, monospace"),
    serif: family("--font-instrument-serif", "Georgia, serif"),
  };

  let scale = 1;
  const paint = (dt: number, now: number) => {
    for (const listener of frames) {
      g.setTransform(scale, 0, 0, scale, 0, 0);
      listener(dt, now);
    }
  };
  const repaint = () => paint(0, performance.now());

  const readColors = () => {
    for (const [name, token] of Object.entries(TOKENS)) {
      // Palette hues fall back to ink where the arcade's tokens are not defined (the 404).
      canvas.style.color = `var(${token}, var(--foreground))`;
      colors[name as keyof Colors] = getComputedStyle(canvas).color;
    }
    canvas.style.color = "";
    for (const listener of themes) listener();
    repaint();
  };

  const resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const { width } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(((width * H) / W) * dpr);
    scale = canvas.width / W;
    // Setting the size clears the canvas: paint again now, not on the next frame.
    repaint();
  };
  // Zoom, or a move to a screen with another pixel ratio, changes no CSS size: watch the ratio itself.
  let ratio: MediaQueryList | undefined;
  const watchRatio = () => {
    ratio?.removeEventListener("change", onRatio);
    ratio = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    ratio.addEventListener("change", onRatio);
  };
  const onRatio = () => {
    resize();
    watchRatio();
  };

  // The loop runs while the canvas is on screen, the tab is visible and (arcade) the canvas has focus.
  let raf = 0;
  let last = 0;
  let onScreen = false;
  let running = false;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(100, now - last) : 0;
    last = now;
    paint(dt, now);
  };
  const sync = () => {
    const next = onScreen && !document.hidden && (!options.pauseOnBlur || document.activeElement === canvas);
    if (next === running) return;
    running = next;
    cancelAnimationFrame(raf);
    last = 0;
    if (running) raf = requestAnimationFrame(frame);
    else held.clear();
    options.onRunning?.(running);
  };

  const point = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return [((event.clientX - box.left) / box.width) * W, ((event.clientY - box.top) / box.height) * H] as const;
  };
  const onPointer = (event: PointerEvent) => {
    const type = event.type === "pointerdown" ? "down" : event.type === "pointermove" ? "move" : "up";
    const [x, y] = point(event);
    for (const listener of pointers) listener(type, x, y, event);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Tab" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.key === "Escape") {
      if (event.type === "keydown" && options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
      return;
    }
    const key = KEYS[event.key] ?? null;
    if (!key && !options.exclusive) return;
    // The page's shortcut listener skips prevented events; this also stops arrows and Space scrolling.
    event.preventDefault();
    const down = event.type === "keydown";
    if (key) {
      if (down) held.add(key);
      else held.delete(key);
    }
    if (running || !down) for (const listener of keys) listener(key, down, event);
  };

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = !!entry?.isIntersecting;
    sync();
  });
  const theme = new MutationObserver(readColors);
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const sizer = new ResizeObserver(resize);
  const events: [EventTarget, string, EventListener][] = [
    [canvas, "pointerdown", onPointer as EventListener],
    [canvas, "pointermove", onPointer as EventListener],
    [canvas, "pointerup", onPointer as EventListener],
    [canvas, "keydown", onKey as EventListener],
    [canvas, "keyup", onKey as EventListener],
    [canvas, "focus", sync],
    [canvas, "blur", sync],
    [document, "visibilitychange", sync],
    [scheme, "change", readColors],
  ];
  for (const [target, type, listener] of events) target.addEventListener(type, listener);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  try {
    // Fires on pixel-ratio changes too (zoom, another screen), where supported.
    sizer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    sizer.observe(canvas);
  }
  observer.observe(canvas);
  watchRatio();
  readColors();
  // Text faces swap in late: paint again once they are here.
  Promise.all([document.fonts.load(`12px ${fonts.mono}`), document.fonts.load(`12px ${fonts.pixel}`)]).then(repaint, () => {});

  const ctx: GameContext = {
    canvas,
    g,
    width: W,
    height: H,
    colors,
    fonts,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    onTheme: (listener) => themes.push(listener),
    frame: (listener) => frames.push(listener),
    onKey: (listener) => keys.push(listener),
    onPointer: (listener) => pointers.push(listener),
    held: (key) => held.has(key),
    play: (name, sound = {}) => {
      const box = canvas.getBoundingClientRect();
      play(name, { ...sound, x: box.left + ((sound.x ?? W / 2) / W) * box.width });
    },
    score: (value, text) => options.onScore?.(value, text),
    over: (result) => options.onOver?.(result),
    announce: options.announce,
  };

  return {
    ctx,
    running: () => running,
    /** Draw the field once now (dt 0), e.g. the final frame of a round. */
    repaint,
    /** Drops the game's subscriptions; clears the field too unless the last frame should stay (a result over it). */
    reset(clear = true) {
      frames = [];
      keys = [];
      pointers = [];
      themes = [];
      held.clear();
      if (!clear) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
    },
    stop() {
      // The last frame stays: a closing card folds with it.
      this.reset(false);
      cancelAnimationFrame(raf);
      for (const [target, type, listener] of events) target.removeEventListener(type, listener);
      theme.disconnect();
      sizer.disconnect();
      observer.disconnect();
      ratio?.removeEventListener("change", onRatio);
    },
  };
}
export type Host = ReturnType<typeof host>;
