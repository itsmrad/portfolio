/**
 * Registry C: a code-review game, drifting parts and falling blocks. The
 * wave shooter is not a cartridge: it is the Activity section's own game
 * (./contributions.ts, opened from that section). See ../contract.ts and
 * handoff/rebuild-arcade.md.
 *
 * Placement (the shell's layout plan picks the side and keeps every card clear
 * of notes and other cards):
 * - Redline beside Codenaya's "A build check before it says done": a game
 *   about spotting the bug, next to the agent that checks its own build.
 * - Loose parts in xflow's right margin, in the free stretch beside its
 *   decisions (the project sections are the owner's priority for margin life).
 * - Stack layers beside the Stack section, whose items it lays down as layers.
 * - The contribution-graph game is not here: it lives in the Activity section.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "redline", name: "Redline", howTo: "Click the buggy line, or pick it with W/S or the arrows and Space, before time runs out.", section: "codenaya", near: "A build check before it says done", load: () => import("./redline") },
  { id: "parts", name: "Loose parts", howTo: "A/D or the arrows turn, W thrusts, Space fires; or aim with the mouse. Split every part.", section: "xflow", near: "Paste into whatever has focus", load: () => import("./parts") },
  { id: "stack", name: "Stack layers", howTo: "A/D or the arrows move, W turns, S lowers, Space drops; or the mouse. Fill rows.", section: "stack", load: () => import("./stack") },
];
