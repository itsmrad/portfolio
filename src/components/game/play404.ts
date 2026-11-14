/** The 404's figure: the brick breaker on an 800x600 field, the AD monogram then "404". */
import { host } from "@/components/arcade/host";

import { breakout, grid, type GameCopy } from "./breakout";

const BOARDS = [
  grid(80, 2, [".XX..XXX.", "X..X.X..X", "XXXX.X..X", "X..X.X..X", "X..X.X..X", "X..X.XXX."]),
  grid(56, 2, ["X.X.XXX.X.X", "X.X.X.X.X.X", "XXX.X.X.XXX", "..X.X.X...X", "..X.XXX...X"]),
];

/** Attaches the game to a canvas; returns a function that stops it and removes every listener. */
export function start(canvas: HTMLCanvasElement, copy: GameCopy, announce: (message: string) => void) {
  // Only the game's keys are taken: "/" still opens the search on this page.
  const h = host(canvas, { width: 800, height: 600, exclusive: false, pauseOnBlur: false, announce });
  const stop = breakout({ boards: BOARDS, copy })(h.ctx);
  return () => {
    stop();
    h.stop();
  };
}
