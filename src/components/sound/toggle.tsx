/**
 * SLOT (sound + 404 branch): the header's mute button.
 *
 * Renders nothing until filled. Contract:
 * - One 32px ghost icon button (`<Button variant="ghost" size="icon">`) with
 *   `aria-pressed` and an accessible name; `m` toggles it from anywhere.
 * - Sound is on by default; the choice is stored in localStorage and read by
 *   lib/sound. Paint the stored state without a flash or a hydration mismatch.
 * - Client island of about 0.5 KB. The audio engine must not load from here:
 *   it loads inside lib/sound on the first sound after a user gesture.
 */
export function SoundToggle() {
  return null;
}
