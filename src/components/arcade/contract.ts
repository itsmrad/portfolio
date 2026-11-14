/**
 * The arcade's game contract. A game is one module whose default export is
 * `start(ctx) => stop`; it is listed in a registry file (games/registry-*.ts)
 * and the shell (arcade.tsx) does everything else: the cartridge card, loading
 * the chunk, the framed canvas, the score readout, best scores, Esc, focus,
 * pausing the page's shortcuts and eggs, and restart.
 *
 * Rules every game keeps (see handoff/rebuild-arcade.md, "Game contract"):
 * - Draw only in `ctx.g`, in logical units (0..width, 0..height); the host
 *   has already scaled it for the canvas size and the pixel ratio.
 * - Animate only inside `ctx.frame`: it stops while the tab is hidden, the
 *   canvas is off-screen or focus has left it, and resumes by itself.
 * - Subscriptions made through `ctx` (frame, key, pointer, theme) end when the
 *   game stops; `stop` only has to undo what the game set up itself.
 * - Call `ctx.over()` once when the round ends. The shell shows the result and
 *   restarts by calling `start` again with a fresh canvas state, so a game
 *   never needs its own restart logic.
 * - Colour from `ctx.colors` only, and never as the only signal (shape,
 *   position or a label always says the same thing).
 * - Sound only from the visitor's own actions and their direct results, via
 *   `ctx.play`. Nothing moves or sounds before `start` is called.
 * - Budget: the game's own chunk <= 4 KB brotli.
 */
import type { SoundName, SoundOptions } from "@/lib/sound";

/** Page tokens (monochrome Blueprint) plus the arcade palette (R18), as canvas colour strings for the current theme. */
export type Colors = {
  /** Text and solid marks. */
  ink: string;
  /** Secondary text, outlines at rest. */
  muted: string;
  /** Construction lines, grid, hatching. */
  line: string;
  /** The page background: fill under hatches, knock-outs. */
  paper: string;
  /** The site's one state colour: the player, the live thing. */
  signal: string;
  /** Arcade palette: six hues that hold contrast on `paper` in both themes. The first is the site accent (R19): failure, misses, the one thing that must be seen. */
  accent: string;
  amber: string;
  green: string;
  teal: string;
  blue: string;
  violet: string;
};
export const HUES = ["accent", "amber", "green", "teal", "blue", "violet"] as const;

/** Arrow keys map to directions, Space and Enter to "action"; any other key is null (read `event.key`, e.g. for typing). */
export type Key = "up" | "down" | "left" | "right" | "action" | null;

export type GameContext = {
  canvas: HTMLCanvasElement;
  /** Pre-scaled 2D context: draw in logical units. */
  g: CanvasRenderingContext2D;
  /** Logical size of the field (256 x 192 in the arcade, 4:3). */
  width: number;
  height: number;
  /** Live object: re-read after `onTheme`. */
  colors: Colors;
  /** CSS font-family strings for canvas `font`. */
  fonts: { mono: string; pixel: string; serif: string };
  /** Called after the theme changed and `colors` was updated (a repaint follows). Rebuild cached patterns here. */
  onTheme(listener: () => void): void;
  /**
   * Called once per animation frame while running: `dt` in ms (capped at 100), `now` a rAF timestamp.
   * Also called with `dt` 0 to repaint (resize, theme, late font) even while paused: always draw the whole field.
   */
  frame(listener: (dt: number, now: number) => void): void;
  /** Keydown and keyup on the focused canvas. The host has already stopped page scrolling and shortcuts. */
  onKey(listener: (key: Key, down: boolean, event: KeyboardEvent) => void): void;
  /** Whether a direction or action is held now. */
  held(key: Exclude<Key, null>): boolean;
  /** Pointer on the canvas, in logical units. */
  onPointer(listener: (type: "down" | "move" | "up", x: number, y: number, event: PointerEvent) => void): void;
  /** The sound facade's `play`. `x` is in logical units (pans across the canvas); default the centre. */
  play(name: SoundName, options?: SoundOptions): void;
  /** prefers-reduced-motion: keep the rules, drop flashes, shakes and fast motion. */
  reduced: boolean;
  /** Update the readout. `text` replaces the number on screen (e.g. "48 wpm"); `value` is what best scores compare. */
  score(value: number, text?: string): void;
  /** The round is over; the shell records the best and offers an instant restart. Pass a one-line result to announce. */
  over(result?: string): void;
  /** Speak a short sentence to screen readers (polite). */
  announce(message: string): void;
};

/** A game module's default export. */
export type Game = (ctx: GameContext) => () => void;

/** One registry line. The shell merges registry-a, -b and -c in that order. */
export type Entry = {
  /** Stable id: the best-score key and the palette's target. Lowercase, a-z and dashes. */
  id: string;
  /** The site's own descriptive name (R15), never a trademarked title. */
  name: string;
  /** One line, real text: how to play, readable in three seconds. */
  howTo: string;
  /** Section id the cartridge sits beside (see app/page.tsx). */
  section: string;
  /** Text inside that section to line the card up with (the first element holding it); else just below the section title. */
  near?: string;
  /** Prefer the left gutter. Honoured only where it fits beside the scroll ruler (about 1440 px and wider); otherwise right. */
  side?: "left" | "right";
  /** Best score is the lowest (a reaction time) instead of the highest. */
  lower?: boolean;
  load: () => Promise<{ default: Game }>;
};
