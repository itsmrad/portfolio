/**
 * Registry B: four games from the second arcade engineer, in suggested page
 * order. See ../contract.ts and handoff/rebuild-arcade.md. Suggested places:
 * - Centre punch beside Work: the aim trainer opens the project stretch.
 * - Paper plane beside "Currently building": one-button flight next to what ships next.
 * - Word check beside Stack: its words are the stack's own.
 * - Sheet sizes beside Education: ISO drawing-sheet sizes, A10 to A0.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "punch", name: "Centre punch", howTo: "Click each mark before it shrinks away, or aim with arrows and press Space. Twenty seconds.", section: "work", load: () => import("./punch") },
  { id: "plane", name: "Paper plane", howTo: "Space, click or tap to climb. Fly through the gaps; they narrow as you go.", section: "building", load: () => import("./plane") },
  { id: "words", name: "Word check", howTo: "Type a five-letter word and press Enter. Six tries; the marks show what is right.", section: "stack", load: () => import("./words") },
  { id: "sheets", name: "Sheet sizes", howTo: "Arrows or drag slide every sheet. Two equal sheets make the next size up. Reach A0.", section: "education", load: () => import("./sheets") },
];
