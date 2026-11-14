/**
 * "Sheet sizes": the tile-merging game, played with drawing sheets. Two equal
 * sheets side by side make the next ISO size up, exactly as two A4 make an A3,
 * so the doubling numbers are sheet areas: 2 is an A10, 2048 the full A0. Every
 * size has its own hue and both its number and its name are always written on
 * it; from A5 up a tile carries the drawing frame a real sheet has. Beside the
 * board, the classic A-series diagram fills in as each size is reached.
 */
import type { Game } from "../contract";

const N = 4;
const CELL = 38;
const GAP = 4;
const X0 = 6;
const Y0 = 4;
const SLIDE = 90;
const HUE5 = ["amber", "green", "teal", "blue", "violet"] as const;
const TOP = 11; // 2^11 = 2048, the A0

type Tile = { k: number; x: number; y: number; fx: number; fy: number; pop: number; gone?: boolean };

const sheets: Game = (ctx) => {
  const { g, colors, width: W } = ctx;
  const hue = (k: number) => colors[k >= TOP ? "accent" : HUE5[(k - 1) % 5]!];
  let tiles: Tile[] = [];
  let t = 1;
  let total = 0;
  let largest = 1;
  let done = false;

  const at = (x: number, y: number) => tiles.find((tile) => !tile.gone && tile.x === x && tile.y === y);
  const spawn = () => {
    const free: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!at(x, y)) free.push([x, y]);
    const [x, y] = free[Math.floor(Math.random() * free.length)]!;
    tiles.push({ k: Math.random() < 0.9 ? 1 : 2, x, y, fx: x, fy: y, pop: -1 });
  };
  spawn();
  spawn();

  const stuck = () => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const k = at(x, y)?.k;
        if (!k || at(x + 1, y)?.k === k || at(x, y + 1)?.k === k) return false;
      }
    return true;
  };

  const move = (dx: number, dy: number) => {
    if (done) return;
    tiles = tiles.filter((tile) => !tile.gone);
    for (const tile of tiles) Object.assign(tile, { fx: tile.x, fy: tile.y, pop: 0 });
    let moved = false;
    let merged = 0;
    for (let i = 0; i < N; i++) {
      // The cells of one row or column, from the edge the tiles slide towards.
      const line = [0, 1, 2, 3].map((j): [number, number] => {
        const k = dx + dy > 0 ? N - 1 - j : j;
        return dx ? [k, i] : [i, k];
      });
      const row = line.map(([x, y]) => at(x, y)).filter((tile) => tile) as Tile[];
      let slot = 0;
      let last: Tile | undefined;
      for (const tile of row) {
        if (last && last.k === tile.k && !last.pop) {
          last.k++;
          last.pop = 1;
          Object.assign(tile, { gone: true, x: last.x, y: last.y });
          total += 2 ** last.k;
          merged = Math.max(merged, last.k);
          moved = true;
        } else {
          const [x, y] = line[slot++]!;
          if (x !== tile.x || y !== tile.y) moved = true;
          Object.assign(tile, { x, y });
          last = tile;
        }
      }
    }
    if (!moved) return ctx.play("tap");
    t = 0;
    spawn();
    if (merged) {
      // A bigger sheet, a higher note.
      ctx.play("note", { index: Math.min(8, merged - 2) });
      ctx.score(total);
      if (merged > largest) {
        largest = merged;
        ctx.announce(`Made an A${TOP - merged}.`);
      }
    } else ctx.play("tick");
    if (largest >= TOP) {
      done = true;
      ctx.play("success");
      ctx.over(`A0 reached. ${total} points.`);
    } else if (stuck()) {
      done = true;
      ctx.play("gameOver");
      ctx.over(`No moves left. Largest sheet A${TOP - largest}, ${total} points.`);
    }
  };

  const DIRS: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  ctx.onKey((key, down) => {
    if (down && key && DIRS[key]) move(...DIRS[key]);
  });
  // Drag or swipe: one move per stroke, as soon as it is 14 units long.
  let from: [number, number] | null = null;
  ctx.onPointer((type, x, y, event) => {
    if (type === "down") {
      from = [x, y];
      try {
        ctx.canvas.setPointerCapture(event.pointerId);
      } catch {}
    } else if (type === "up") from = null;
    else if (from) {
      const dx = x - from[0];
      const dy = y - from[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
      from = null;
      if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
      else move(0, Math.sign(dy));
    }
  });

  const text = (s: string, x: number, y: number, size: number, font: string, color: string) => {
    g.font = `${size}px ${font}`;
    g.fillStyle = color;
    g.fillText(s, x, y);
  };

  ctx.frame((dt) => {
    t = ctx.reduced ? 1 : Math.min(1, t + dt / SLIDE);
    g.clearRect(0, 0, W, ctx.height);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 1;
    g.strokeStyle = colors.line;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.strokeRect(X0 + x * (CELL + GAP) + 0.5, Y0 + y * (CELL + GAP) + 0.5, CELL - 1, CELL - 1);

    // Sliding tiles under the ones that stay; a merged tile swells a little once the slide lands.
    for (const tile of [...tiles].sort((a, b) => Number(!a.gone) - Number(!b.gone))) {
      if (tile.gone && t >= 1) continue;
      const e = 1 - (1 - t) ** 2;
      const px = X0 + (tile.fx + (tile.x - tile.fx) * e) * (CELL + GAP);
      const py = Y0 + (tile.fy + (tile.y - tile.fy) * e) * (CELL + GAP);
      const s = tile.pop < 0 ? CELL * (0.4 + 0.6 * t) : CELL + (tile.pop > 0 && t < 1 ? 4 * Math.sin(t * Math.PI) : 0);
      const ox = px + (CELL - s) / 2;
      const oy = py + (CELL - s) / 2;
      const k = tile.gone ? tile.k : tile.pop > 0 && t < 0.5 ? tile.k - 1 : tile.k;
      g.fillStyle = hue(k);
      g.beginPath();
      g.roundRect(ox, oy, s, s, 2);
      g.fill();
      if (k >= 6) {
        // The drawing frame of a real sheet.
        g.strokeStyle = colors.paper;
        g.strokeRect(ox + 3.5, oy + 3.5, s - 7, s - 7);
      }
      if (s < CELL * 0.8) continue;
      const n = String(2 ** k);
      text(n, ox + s / 2, oy + s / 2 + 3, n.length > 3 ? 11 : n.length > 2 ? 13 : 16, ctx.fonts.pixel, colors.paper);
      text(`A${TOP - k}`, ox + s / 2, oy + 9, 8, ctx.fonts.mono, colors.paper);
    }

    // The A-series diagram: A0 halved again and again, each piece filled once that size is made.
    let [x, y, w, h] = [190, 16, 42, 59];
    g.lineWidth = 1;
    for (let k = TOP - 1; k >= 1; k--) {
      const wide = w > h;
      const piece = wide ? [x, y, w / 2, h] : [x, y + h / 2, w, h / 2];
      if (largest >= k) {
        g.fillStyle = hue(k);
        g.fillRect(piece[0]!, piece[1]!, piece[2]!, piece[3]!);
      }
      g.strokeStyle = largest >= k ? colors.paper : colors.line;
      g.strokeRect(piece[0]!, piece[1]!, piece[2]!, piece[3]!);
      [x, y, w, h] = wide ? [x + w / 2, y, w / 2, h] : [x, y, w, h / 2];
    }
    g.strokeStyle = largest >= TOP ? colors.accent : colors.ink;
    g.lineWidth = 1.5;
    g.strokeRect(190, 16, 42, 59);
    text("goal A0", 211, 8, 8, ctx.fonts.mono, colors.muted);
    text("largest", 211, 92, 8, ctx.fonts.mono, colors.muted);
    text(`A${TOP - largest}`, 211, 110, 18, ctx.fonts.pixel, hue(largest));
    text(String(total), 211, 134, 11, ctx.fonts.mono, colors.ink);
    text("points", 211, 146, 8, ctx.fonts.mono, colors.muted);
    if (!total) text("arrows or drag", 211, 170, 8, ctx.fonts.mono, colors.muted);
  });

  return () => {};
};

export default sheets;
