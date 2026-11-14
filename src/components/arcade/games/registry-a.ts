/**
 * Registry A: the first six games. One line per game; the shell merges
 * registry-a, -b and -c in that order (see ../contract.ts for the fields).
 * Each `load` is its own lazy chunk, fetched only when the visitor presses Play.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "breakout", name: "Title block", howTo: "Mouse or arrows move the bar, click or Space launches. Clear every cell.", section: "contact", side: "right", load: () => import("./breakout") },
  { id: "snake", name: "Dimension line", howTo: "Arrows or click to steer. Measure every point; don't hit the frame or yourself.", section: "activity", side: "right", load: () => import("./snake") },
];
