/**
 * "Title block": the 404's brick breaker, through the contract, clearing the
 * drawing's title block. Its cells are the footer's own (drawn by, rev, date,
 * sheet ...), each a coloured tile with its label. Three balls; each cleared
 * sheet comes back a little faster.
 */
import { breakout, type Brick } from "@/components/game/breakout";

import type { Colors } from "../contract";

// Spelled out rather than imported: a runtime import from ../contract would pull a shared chunk into this one.
const HUES: (keyof Colors)[] = ["accent", "amber", "green", "teal", "blue", "violet"];

const ROWS: [string, number][][] = [
  [["DRAWN BY", 3], ["REV", 2], ["DATE", 3], ["SHEET", 2]],
  [["LICENSE", 3], ["TYPEFACE", 3], ["DEPLOYED", 2], ["AGENTS", 2]],
  [["STACK", 6], ["SOUND", 4]],
];
const UNIT = 76;
const CELL_H = 44;

const sheet = () => {
  const bricks: Brick[] = [];
  let n = 0;
  ROWS.forEach((row, r) => {
    let x = 20;
    for (const [label, units] of row) {
      const w = units * UNIT;
      const hue = HUES[n++ % HUES.length];
      // Each cell is two tiles: the label strip, then the value under it.
      bricks.push({ x, y: 70 + r * CELL_H * 2, w, h: CELL_H, label, hue }, { x, y: 70 + r * CELL_H * 2 + CELL_H, w, h: CELL_H, hue });
      x += w;
    }
  });
  return bricks;
};

export default breakout({
  boards: [sheet],
  copy: { start: "click or space to launch", cleared: "APPROVED", clearedNote: "Title block cleared. Space for the next sheet.", lost: "Ball lost. Score" },
  lives: 3,
  cartridge: true,
});
