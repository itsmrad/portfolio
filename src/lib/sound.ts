/**
 * SLOT (sound branch): the always-loaded facade for sound and haptics.
 *
 * Contract:
 * - Any component may call `play(name)` / `haptic()` from an event handler.
 *   Both are safe no-ops until this slot is filled, and must stay safe on the
 *   server, before a user gesture, when muted and under reduced motion.
 * - This file stays tiny (it is in the first-load bundle of every caller).
 *   The Web Audio engine goes in its own module, loaded with `import()` on the
 *   first call after a user gesture. Budget for that lazy chunk: 4 KB.
 * - Sound is on by default for deliberate clicks only; the mute preference is
 *   stored in localStorage and haptics follow it. No audio files.
 * - Keep the `SoundName` list; add names at the end.
 */
export type SoundName = "tick" | "tap" | "toggle" | "open" | "close" | "pop" | "key" | "copy";

export function play(name: SoundName): void {
  void name;
}

export function haptic(pattern: number | number[] = 8): void {
  void pattern;
}
