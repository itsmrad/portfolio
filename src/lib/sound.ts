/**
 * The always-loaded facade for sound and haptics. Safe to call anywhere: it is
 * a no-op on the server, before the visitor's first gesture, when muted, and
 * when audio is blocked. It never throws.
 *
 * The Web Audio engine (lib/sound-engine.ts) is fetched with `import()` on the
 * visitor's first pointer or key press, and makes every sound from oscillators
 * and filtered noise. There are no audio files.
 *
 * Owned and edited by the sound + 404 branch only. Its exports are the
 * contract every branch builds against: play(name, options?), haptic(pattern?),
 * soundOn(), setSound(next), toggleSound(), subscribeSound(listener).
 * A missing voice is requested in a handoff, not added here.
 *
 * Rules for every caller:
 * - Play a voice only from a deliberate action: a click, a key, a drag.
 *   Never on hover, scroll, page load or a timer the visitor did not start.
 * - Sound is on by default; `m` and the header button mute it. Muting also
 *   silences haptics. Reduced motion does not mute sound.
 * - The `m` shortcut and any mute control call `toggleSound()`; read the state
 *   with `soundOn()` and `subscribeSound()`. Never click the header button
 *   through the DOM.
 * - The voice pans with the pointer's horizontal position (or the focused
 *   element's, after a key press) and its pitch varies slightly per play.
 * - On phones each voice vibrates with its pair from lib/haptics.ts.
 *
 * The vocabulary (add new names at the end; keep pairs together):
 *   tick       selection moving one step: palette rows, tabs, a stepper
 *   tap        press of a button that does something (the default click)
 *   toggle     a switch turning ON; theme toggle; sound being enabled
 *   open       a palette, menu, dialog or accordion opening
 *   close      ... and closing
 *   pop        something small appearing: a sticker, a tooltip pinned
 *   key        a keyboard shortcut firing
 *   copy       copied to the clipboard (a rising two-note tick)
 *   release    the lift after `tap`, for press-and-hold toys
 *   toggleOff  a switch turning OFF; sound being muted
 *   detent     a soft notch: accordion row, slider step
 *   success    a task finished well (form sent, download started)
 *   error      a task failed (copy blocked, network error)
 *   thump      a heavy press: the hero monogram
 *   note       one note of the name melody; pass { index } (0 to 8)
 *   scratch    pen on paper for drawn lines; pass { duration } in seconds
 *   bounce     404 game: ball off a wall or the paddle
 *   break      404 game: a brick breaks
 *   gameOver   404 game: the ball is lost
 */
import { HAPTICS, vibrate } from "@/lib/haptics";

export type SoundName =
  | "tick"
  | "tap"
  | "toggle"
  | "open"
  | "close"
  | "pop"
  | "key"
  | "copy"
  | "release"
  | "toggleOff"
  | "detent"
  | "success"
  | "error"
  | "thump"
  | "note"
  | "scratch"
  | "bounce"
  | "break"
  | "gameOver";

export type SoundOptions = {
  /** Horizontal position in CSS px for the stereo pan; defaults to the last pointer or the focused element. */
  x?: number;
  /** `note`: step in the scale, 0 to 8. */
  index?: number;
  /** `scratch`: stroke length in seconds (at most 3). */
  duration?: number;
  /** Seconds from now, for sequences such as the name melody. */
  delay?: number;
};

const KEY = "sound";
const browser = typeof window !== "undefined";
let on: boolean | undefined;
let pointerX: number | undefined;
const listeners = new Set<() => void>();
const lastPlayed: Partial<Record<SoundName, number>> = {};

type Engine = typeof import("@/lib/sound-engine");
let engine: Promise<Engine> | undefined;
/** The engine once its chunk has arrived, so gestures and sounds can reach it synchronously. */
let ready: Engine | undefined;
const load = () =>
  (engine ??= import("@/lib/sound-engine").then(
    (module) => (ready = module),
    (error) => {
      engine = undefined; // offline or a failed deploy: try again on the next sound
      throw error;
    },
  ));

const paint = (next: boolean) => {
  document.documentElement.dataset.sound = next ? "on" : "off";
  listeners.forEach((listener) => listener());
};

if (browser) {
  // Fetch the engine on the first press, so the click it ends in is not late; once it is
  // here, start the audio context inside each gesture (Safari starts it nowhere else).
  const gesture = (event: Event) => {
    if (event instanceof PointerEvent) pointerX = event.clientX;
    else if (event.type === "keydown") pointerX = undefined;
    if (!soundOn()) return;
    if (ready) ready.unlock();
    else load().catch(() => {});
  };
  for (const type of ["pointerdown", "pointerup", "keydown", "touchend"])
    addEventListener(type, gesture, { capture: true, passive: true });
  // Another tab changed the setting.
  addEventListener("storage", (event) => {
    if (event.key !== KEY && event.key !== null) return;
    on = undefined;
    paint(soundOn());
  });
}

/** Whether sound (and with it, haptics) is on. Defaults to on. */
export function soundOn(): boolean {
  if (on === undefined) {
    try {
      on = localStorage.getItem(KEY) !== "off";
    } catch {
      on = true;
    }
  }
  return on;
}

export function setSound(next: boolean): void {
  on = next;
  try {
    if (next) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // Blocked storage: the choice lasts for this page.
  }
  if (browser) paint(next);
}

/** Flip sound on or off with its paired voice (the `m` key and the header button call this). */
export function toggleSound(): boolean {
  const next = !soundOn();
  if (!next) play("toggleOff");
  setSound(next);
  if (next) play("toggle");
  return next;
}

/** For useSyncExternalStore: called whenever the mute state changes. */
export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function play(name: SoundName, options: SoundOptions = {}): void {
  if (!browser || !soundOn()) return;
  // No sound before the visitor has interacted with the page.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const now = performance.now();
  // Machine-gun guard: the same voice at most every 25 ms (key repeat: 50 ms). Sequences are exempt.
  if (!options.delay) {
    if (now - (lastPlayed[name] ?? -Infinity) < (name === "key" ? 50 : 25)) return;
    lastPlayed[name] = now;
  }
  const pattern = HAPTICS[name];
  if (pattern !== undefined && !options.delay) vibrate(pattern);
  let x = Number.isFinite(options.x) ? options.x! : pointerX;
  if (x === undefined) {
    const box = document.activeElement?.getBoundingClientRect();
    x = box && box.width ? box.left + box.width / 2 : innerWidth / 2;
  }
  const pan = innerWidth > 0 ? 0.6 * Math.min(1, Math.max(-1, (x / innerWidth) * 2 - 1)) : 0;
  // Synchronously when the engine is here, so the sound starts inside the caller's gesture.
  if (ready) ready.play(name, pan, options, now);
  else
    load().then(
      (module) => module.play(name, pan, options, now),
      () => {},
    );
}

/** A bare vibration for phones, outside the voice pairs. Follows the mute setting. */
export function haptic(pattern: number | number[] = 8): void {
  if (browser && soundOn()) vibrate(pattern);
}
