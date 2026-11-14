import type { Cell } from "./visits";

/**
 * A deterministic stand-in for the visitor store, for a local preview build
 * only: `GLOBE_PREVIEW_STAND_IN=1 npm run build && GLOBE_PREVIEW_STAND_IN=1
 * npm start`. It answers the shared numbers with a believable spread of map
 * cells and places every viewer in New York, so "you're here" and the
 * distance line show. It never activates on Vercel (any VERCEL variable
 * turns it off), and it writes nothing.
 */
export function standIn() {
  if (process.env.GLOBE_PREVIEW_STAND_IN !== "1" || process.env.VERCEL || process.env.VERCEL_ENV) return null;
  return (made ??= make());
}

let made: ReturnType<typeof make> | undefined;

function make() {
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // [lat, lon, spread in degrees, cells]: clusters where a developer's portfolio gets read, and a scatter.
  const clusters = [
    [28, 77, 9, 16], // India
    [51, 3, 12, 18], // Europe
    [39, -98, 26, 20], // United States
    [45, -75, 6, 4], // Canada
    [37, 128, 6, 5], // Korea and Japan
    [1, 104, 6, 5], // Singapore and around
    [-26, 135, 22, 5], // Australia
    [-20, -50, 16, 6], // Brazil
    [6, 4, 10, 4], // West Africa
    [-1, 37, 6, 3], // East Africa
    [25, 52, 8, 4], // the Gulf
    [55, 37, 10, 3], // Russia
    [35, 105, 18, 5], // China
    [-38, 175, 4, 2], // New Zealand
  ];
  const cells = new Map<string, Cell>();
  for (const [lat, lon, spread, count] of clusters) {
    for (let i = 0; i < count!; i++) {
      const cell: Cell = [
        Math.round(Math.max(-80, Math.min(80, lat! + (random() - 0.5) * spread!))),
        Math.round(((lon! + (random() - 0.5) * spread! + 540) % 360) - 180),
        1 + Math.floor(random() ** 3 * 60),
      ];
      cells.set(`${cell[0]}:${cell[1]}`, cell);
    }
  }
  const list = [...cells.values()].sort((a, b) => b[2] - a[2]);
  return {
    stats: { count: list.reduce((total, [, , visits]) => total + visits, 0), live: 3, cells: list },
    you: [41, -74] as [number, number],
    country: "US",
  };
}
