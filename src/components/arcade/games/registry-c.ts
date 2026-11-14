/**
 * Registry C: a code-review game, drifting parts, a wave shooter and falling
 * blocks. See ../contract.ts and handoff/rebuild-arcade.md.
 *
 * Placement, chosen so no earlier card is pushed onto a note:
 * - Redline beside Codenaya's "A build check before it says done": a game
 *   about spotting the bug, next to the agent that checks its own build.
 * - Loose parts and Clean sheet in xflow's right margin, in the free stretches
 *   beside its decisions and its stack table (the project sections are the
 *   owner's priority for margin life).
 * - Stack layers beside the Stack section, whose items it lays down as layers;
 *   left where the margin has room, else right below the activity card.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "redline", name: "Redline", howTo: "Click the line with the bug, or arrows and Space, before the countdown ends.", section: "codenaya", near: "A build check before it says done", load: () => import("./redline") },
  { id: "parts", name: "Loose parts", howTo: "Left and right turn, Up thrusts, Space fires; or aim with the mouse. Split every part.", section: "xflow", near: "Paste into whatever has focus", load: () => import("./parts") },
  { id: "marks", name: "Clean sheet", howTo: "Arrows or the mouse move, Space or click fires. Clear the marks before they land.", section: "xflow", near: "Audio and history", load: () => import("./marks") },
  { id: "stack", name: "Stack layers", howTo: "Arrows move, Up turns, Space drops; or the mouse. Fill a row to lay a layer.", section: "stack", side: "left", load: () => import("./stack") },
];
