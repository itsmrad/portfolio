import type { SoundName } from "@/lib/sound";

/**
 * Vibration paired with each voice (ms, or an on/off pattern). Voices left out
 * stay silent to the hand: release, key, scratch and the game's rapid hits.
 */
export const HAPTICS: Partial<Record<SoundName, number | number[]>> = {
  tick: 8,
  tap: 8,
  toggle: 14,
  toggleOff: 14,
  detent: 14,
  open: 8,
  close: 8,
  pop: 8,
  note: 8,
  thump: 20,
  copy: [10, 50, 10],
  success: [10, 50, 10],
  error: [15, 40, 20],
  gameOver: [15, 40, 20],
};

/** Phones only. Feature-detected; silent wherever unsupported. Call it from an input event. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (!matchMedia("(pointer: coarse)").matches) return;
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
      return;
    }
    // iOS Safari has no Vibration API, but toggling a native switch control plays the system tick.
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.ariaHidden = "true";
    label.style.display = "none";
    label.append(input);
    document.head.append(label);
    label.click();
    label.remove();
  } catch {
    // Never let feedback break the action it accompanies.
  }
}
