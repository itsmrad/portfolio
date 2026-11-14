/**
 * Registry B: four games from the second arcade engineer, in page order. See
 * ../contract.ts and handoff/rebuild-arcade.md. Each sits in a stretch of the
 * right margin that is free at rest, so no card of registry A moves and no
 * note is covered (measured at 1280, 1440 and 1920):
 * - Centre punch beside Codenaya's build check: an inspector's game by the gate that checks the work.
 * - Sheet sizes beside xflow's memory footprint: sizes that double, 2 to 2048.
 * - Paper plane beside "Paste into whatever has focus": it lands wherever it can.
 * - Word check beside Stack: its words are the stack's and the projects' own.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "punch", name: "Centre punch", howTo: "Click each mark before it shrinks away, or aim with arrows and press Space. Twenty seconds.", section: "codenaya", near: "A build check before", load: () => import("./punch") },
  { id: "sheets", name: "Sheet sizes", howTo: "Arrows or drag slide every sheet. Two equal sheets make the next size up. Reach A0.", section: "xflow", near: "Memory footprint", load: () => import("./sheets") },
  { id: "plane", name: "Paper plane", howTo: "Space, click or tap to climb. Fly through the gaps; they narrow as you go.", section: "xflow", near: "Paste into whatever", load: () => import("./plane") },
  { id: "words", name: "Word check", howTo: "Type a five-letter word and press Enter. Six tries; the marks show what is right.", section: "stack", load: () => import("./words") },
];
