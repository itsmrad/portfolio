/**
 * SLOT (sound + 404 branch): the always-loaded facade for sound and haptics.
 *
 * This file is owned and edited by the sound + 404 branch ONLY. Its exports
 * are the contract every branch builds against, and this stub has the final
 * signatures:
 *   play(name, options?)   haptic(pattern?)
 *   soundOn()   setSound(next)   toggleSound()   subscribeSound(listener)
 *
 * Rules for every other branch:
 * - Never edit this file. Use the voice names below (pen on paper is
 *   "scratch"). A voice that is missing is requested in your handoff.
 * - Play a voice only from a deliberate action (a click, a key, a drag).
 * - The `m` shortcut and any mute control call `toggleSound()`; read the
 *   state with `soundOn()` and `subscribeSound()` (useSyncExternalStore).
 *   Never click the header button through the DOM.
 *
 * Until the slot is filled nothing is audible: `play` and `haptic` are safe
 * no-ops and the mute state lives in memory. The real facade stays tiny (it
 * is in first-load JS) and fetches the Web Audio engine with `import()` on
 * the first gesture (4 KB lazy budget). Sound is on by default; no audio files.
 */
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

let on = true;
const listeners = new Set<() => void>();

/** Whether sound (and with it, haptics) is on. Defaults to on. */
export function soundOn(): boolean {
  return on;
}

export function setSound(next: boolean): void {
  on = next;
  listeners.forEach((listener) => listener());
}

/** Flip sound on or off (the `m` key and the header button call this). */
export function toggleSound(): boolean {
  setSound(!on);
  return on;
}

/** For useSyncExternalStore: called whenever the mute state changes. */
export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function play(name: SoundName, options: SoundOptions = {}): void {
  void name;
  void options;
}

/** A bare vibration for phones, outside the voice pairs. Follows the mute setting. */
export function haptic(pattern: number | number[] = 8): void {
  void pattern;
}
