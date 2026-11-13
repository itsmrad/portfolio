/**
 * SLOT (margins + playful branch): first-screen stickers and toys.
 *
 * Renders nothing until filled. The hero mounts it inside an aria-hidden box
 * that covers the whole hero section (absolute inset-0, pointer-events-none,
 * overflow visible), so stickers may overlap the hero's edges and spill into
 * the gutters. Contract:
 * - Position children absolutely; they must never move the hero's content.
 * - Keep every sticker clear of the name, the tagline and the buttons at
 *   390px wide, or hide it below `sm`.
 * - Nothing focusable; `pointer-events-auto` on what should be touchable.
 * - The first paint stays text: lazy-load anything heavier than inline SVG.
 */
export function HeroStickers() {
  return null;
}
