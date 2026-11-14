/**
 * Registry A: the first six games, in page order (it numbers the cartridges).
 * One line per game; the shell merges
 * registry-a, -b and -c in that order (see ../contract.ts for the fields).
 * Each `load` is its own lazy chunk, fetched only when the visitor presses Play.
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "pong", name: "Ruler and rivet", howTo: "Mouse or up and down arrows move your rule. First to five beats the machine.", section: "experience", load: () => import("./pong") },
  { id: "typing", name: "Cursor race", howTo: "Type the code as it is shown; Enter for a new line. Beat the ghost cursor.", section: "codenaya", near: "codenaya.tech", load: () => import("./typing") },
  { id: "memory", name: "Repeat after me", howTo: "Listen, then play the marks back with the arrows or a click. One more each round.", section: "xflow", near: "xflowcli.vercel.app", load: () => import("./memory") },
  { id: "reaction", name: "Signal lamp", howTo: "Space or click to arm; press again the moment the lamp lights. Five tries.", section: "xflow", near: "Stop to text, p50", lower: true, load: () => import("./reaction") },
  { id: "snake", name: "Dimension line", howTo: "Arrows or click to steer. Measure every point; don't hit the frame or yourself.", section: "activity", load: () => import("./snake") },
  { id: "breakout", name: "Title block", howTo: "Mouse or arrows move the bar, click or Space launches. Clear every cell.", section: "contact", load: () => import("./breakout") },
];
