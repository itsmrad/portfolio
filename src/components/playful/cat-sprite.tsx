/**
 * An original pixel cat on a 16 by 16 grid, shown at 32px. `#` is ink (the
 * text colour) and `o` is the coat (the page colour), so it follows the theme.
 * Run frames face right; the chaser mirrors them to run left.
 */
const ART = {
  sit: `
................
...#......#.....
..#o#....#o#....
..#oo####oo#....
..#oooooooo#....
..#o#oooo#o#....
..#oooooooo#....
..#ooo##ooo#....
...#oooooo#.....
..#oooooooo#.##.
..#oooooooo##oo#
.#oooooooooo#o#.
.#oooooooooo#o#.
.#oo#oooo#oooo#.
.#oo#oooo#ooo#..
..############..`,
  sleepA: `
................
................
................
...........###..
.............#..
............#...
...........###..
...#..#.........
..#o##o####.....
..#oooooooo##...
.#o##oooooooo#..
.#ooooooooooo#..
.#oo########oo#.
.#ooooooooooooo#
..#############.
................`,
  sleepB: `
................
............###.
..............#.
.............#..
............###.
................
................
...#..#.........
..#o##o#####....
..#ooooooooo##..
.#o##ooooooooo#.
.#oooooooooooo#.
.#oo########oo#.
.#ooooooooooooo#
..#############.
................`,
  runA: `
................
................
................
..........#...#.
.#.......#o#.#o#
#o#......#ooooo#
#o#......#o#o#o#
.#o######oooooo#
..#oooooooooo##.
..#ooooooooooo#.
..#oooooooooo#..
..#oo######oo#..
.#oo#......#oo#.
#oo#........#oo#
###..........###
................`,
  runB: `
................
................
..........#...#.
.##......#o#.#o#
#oo#.....#ooooo#
.#o#.....#o#o#o#
..#o#####oooooo#
..#ooooooooooo#.
..#oooooooooo#..
..#oooooooooo#..
...#oo####oo#...
...#o#o#.#o#o#..
...#o#o#.#o#o#..
...####..####...
................
................`,
};

export type Pose = keyof typeof ART;

/** One path of unit squares for every cell of `art` holding `mark`. */
const cells = (art: string, mark: string) =>
  art
    .trim()
    .split("\n")
    .map((row, y) => [...row].map((cell, x) => (cell === mark ? `M${x} ${y}h1v1h-1z` : "")).join(""))
    .join("");

export const FRAMES = Object.fromEntries(
  Object.entries(ART).map(([pose, art]) => [pose, [cells(art, "o"), cells(art, "#")]]),
) as Record<Pose, [coat: string, ink: string]>;

/** Every pose stacked in one 32px box; the parent's CSS shows one through `data-pose`. */
export function Sprite({ poses, className }: { poses: Pose[]; className?: string }) {
  return (
    <svg className={className} width={32} height={32} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {poses.map((pose) => (
        <g key={pose} data-pose={pose}>
          <path fill="var(--background)" d={FRAMES[pose][0]} />
          <path fill="currentColor" d={FRAMES[pose][1]} />
        </g>
      ))}
    </svg>
  );
}
