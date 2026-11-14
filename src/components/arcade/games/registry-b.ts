/**
 * Registry B: four games from the second arcade engineer, in page order. See
 * ../contract.ts and handoff/rebuild-arcade.md. The layout plan flips sides for
 * every card in page order, so these come in pairs between registry A's cards:
 * registry A keeps its own alternation, and each pair fills both margins of one
 * stretch. Both pairs sit where the right margin still has room at 1280 (every
 * card goes right there), so no registry A card moves at any width.
 * - Sheet sizes, right, by "Twenty-minute dictations" (after Signal lamp).
 * - Centre punch, left, by "Paste into whatever has focus": it lands where you aim.
 * - Word check, right, by the stack's "Engineering" row: its words are the stack's own.
 * - Paper plane, left, by the FAQ.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "sheets", name: "Sheet sizes", howTo: "Arrows or drag slide every sheet. Two equal sheets make the next size up. Reach A0.", section: "xflow", near: "Twenty-minute dictations", side: "right", load: () => import("./sheets") },
  { id: "punch", name: "Centre punch", howTo: "Click each mark before it shrinks away, or aim with arrows and press Space. Twenty seconds.", section: "xflow", near: "Paste into whatever", side: "left", load: () => import("./punch") },
  { id: "words", name: "Word check", howTo: "Type a five-letter word and press Enter. Six tries; the marks show what is right.", section: "stack", near: "Engineering", side: "right", load: () => import("./words") },
  { id: "plane", name: "Paper plane", howTo: "Space, click or tap to climb. Fly through the gaps; they narrow as you go.", section: "faq", side: "left", load: () => import("./plane") },
];
