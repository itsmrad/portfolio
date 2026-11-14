/**
 * SLOT (margins + playful branch): the two margins outside the column.
 *
 * Each is mounted by the root layout inside a <Gutter>: a box as tall as
 * <main>, as wide as the empty margin (calc(50% - var(--frame-width) / 2)),
 * absolutely positioned, clipped, shown only from 64rem (the `gutter:`
 * variant), aria-hidden and pointer-events-none.
 *
 * The two margins are one composition, the drawing's working notes (see
 * margins.tsx). The server renders nothing for them: the whole piece is one
 * lazy chunk that loads on the visitor's first input, and only where a margin
 * and a mouse exist, so a phone downloads none of it, the handwriting font
 * included.
 *
 * Contract kept:
 * - Decoration only. The page reads the same with the gutters removed.
 * - Nothing focusable inside (the region is aria-hidden).
 * - No layout shift: every child is absolute or sticky inside the box, placed
 *   from the measured position of the section it sits beside.
 * - Transform and opacity only; loops pause off-screen; reduced motion is
 *   honoured.
 */
import { playful } from "@/content/playful";

import { Lazy } from "./lazy";

const WIDE = "(min-width: 64rem) and (pointer: fine)";
const notes = (side: "left" | "right") => playful.notes.filter((note) => note.side === side);

export function GutterLeft() {
  return <Lazy piece="left" when={WIDE} data={{ notes: notes("left"), cat: playful.cat }} />;
}

export function GutterRight() {
  return <Lazy piece="right" when={WIDE} data={{ notes: notes("right"), timer: playful.timer }} />;
}
