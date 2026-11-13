/**
 * SLOT (margins + playful branch): the two margins outside the column.
 *
 * Both render nothing until filled. Each is mounted by the root layout inside
 * a <Gutter>: a box as tall as <main>, as wide as the empty margin
 * (calc(50% - var(--frame-width) / 2)), absolutely positioned, clipped, shown
 * only from 64rem (the `gutter:` variant), aria-hidden and pointer-events-none.
 * Contract:
 * - Decoration only. The page must read the same with the gutters removed.
 * - Nothing focusable inside (the region is aria-hidden); add
 *   `pointer-events-auto` to a child that should react to the cursor.
 * - Zero cost on phones: no client JS for this layer may load below 64rem or
 *   without a fine pointer. Gate the dynamic import on
 *   matchMedia("(min-width: 64rem) and (pointer: fine)").
 * - No layout shift: position children absolutely or sticky inside the box.
 *   To sit beside a section, read its offsetTop by id (ids: top, about,
 *   experience, work, building, activity, stack, education, contact).
 * - Animate transform and opacity only; pause loops off-screen; honour
 *   prefers-reduced-motion.
 */
export function GutterLeft() {
  return null;
}

export function GutterRight() {
  return null;
}
