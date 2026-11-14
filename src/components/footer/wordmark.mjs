// Draws the footer wordmark ("anupamdas") on a 32-unit pixel grid and writes the
// two mask files wordmark.module.css uses. Run after changing a glyph:
//   node src/components/footer/wordmark.mjs
import { writeFileSync } from "node:fs";

const CELL = 32;
// Eight rows: two for ascenders, six for the x-height. "#" is ink.
const GLYPHS = {
  a: [".....", ".....", ".####", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#", "#...#"],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", "#...#", ".####"],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#....", "#...."],
  m: [".......", ".......", "######.", "#..#..#", "#..#..#", "#..#..#", "#..#..#", "#..#..#"],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", "#...#", ".####"],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "....#", "####."],
};
const WORD = "anupamdas";

// One bitmap for the whole word, a blank column between letters.
const rows = Array.from({ length: 8 }, (_, row) => [...WORD].map((letter) => GLYPHS[letter][row]).join("."));
const ink = (x, y) => rows[y]?.[x] === "#";
const width = rows[0].length * CELL + 2;
const height = rows.length * CELL + 2;

// Fill: one rectangle per horizontal run. Outline: every cell edge between ink and paper.
let fill = "";
let line = "";
rows.forEach((row, y) => {
  for (const run of row.matchAll(/#+/g)) fill += `M${run.index * CELL + 1} ${y * CELL + 1}h${run[0].length * CELL}v${CELL}h-${run[0].length * CELL}z`;
  for (let x = 0; x < row.length; x++) {
    if (!ink(x, y)) continue;
    const [left, top] = [x * CELL + 1, y * CELL + 1];
    if (!ink(x, y - 1)) line += `M${left} ${top}h${CELL}`;
    if (!ink(x, y + 1)) line += `M${left} ${top + CELL}h${CELL}`;
    if (!ink(x - 1, y)) line += `M${left} ${top}v${CELL}`;
    if (!ink(x + 1, y)) line += `M${left + CELL} ${top}v${CELL}`;
  }
});

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>\n`;
const dir = new URL(".", import.meta.url);
writeFileSync(new URL("wordmark-fill.svg", dir), svg(`<path d="${fill}"/>`));
writeFileSync(new URL("wordmark-line.svg", dir), svg(`<path d="${line}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="square"/>`));
process.stdout.write(`viewBox 0 0 ${width} ${height}\n`);
