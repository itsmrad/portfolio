/**
 * "Stack layers": falling blocks drawn as hatched drafting tiles, with a
 * dashed projection line showing where a piece will land. Every full row is
 * laid down as a layer of the owner's stack and written into the section
 * legend beside the board (rust, typescript, react ...). Speed rises gently
 * every six layers.
 */
import type { Game } from "../contract";

const COLS = 10;
const ROWS = 18;
const CELL = 9;
// Cells of each piece inside its n x n box; rotation turns the box.
const PIECES: [number, number[]][] = [
  [4, [0, 1, 1, 1, 2, 1, 3, 1]],
  [2, [0, 0, 1, 0, 0, 1, 1, 1]],
  [3, [1, 0, 0, 1, 1, 1, 2, 1]],
  [3, [1, 0, 2, 0, 0, 1, 1, 1]],
  [3, [0, 0, 1, 0, 1, 1, 2, 1]],
  [3, [0, 0, 0, 1, 1, 1, 2, 1]],
  [3, [2, 0, 0, 1, 1, 1, 2, 1]],
];
const TINTS = ["teal", "amber", "violet", "green", "blue", "teal", "amber"] as const;
const LAYERS = ["rust", "typescript", "react", "next.js", "node.js", "convex", "postgresql", "tailwind", "sqlite", "docker", "zod", "langgraph"];

type Piece = { kind: number; cells: number[]; x: number; y: number };

const stack: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const ox = 16;
  const oy = (H - ROWS * CELL) / 2;
  const px = ox + COLS * CELL + 16;
  const board: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  const laid: string[] = [];
  let bag: number[] = [];
  const draw = () => {
    if (!bag.length) bag = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
    return bag.pop()!;
  };
  const make = (kind: number): Piece => {
    const [n, cells] = PIECES[kind]!;
    return { kind, cells: [...cells], x: Math.floor((COLS - n) / 2), y: kind ? 0 : -1 };
  };
  let piece = make(draw());
  let next = draw();
  let lines = 0;
  let points = 0;
  let clock = 0;
  let started = false;
  let dead = false;
  let flash: number[] = [];
  let fade = 0;
  let nudge = 0;

  const fits = (cells: number[], x: number, y: number) => {
    for (let i = 0; i < 8; i += 2) {
      const c = x + cells[i]!;
      const r = y + cells[i + 1]!;
      if (c < 0 || c >= COLS || r >= ROWS || (r >= 0 && board[r]![c]! >= 0)) return false;
    }
    return true;
  };
  const move = (dx: number) => {
    if (!fits(piece.cells, piece.x + dx, piece.y)) return false;
    piece.x += dx;
    return true;
  };
  const rotate = () => {
    const n = PIECES[piece.kind]![0];
    const turned = piece.cells.map((_, i, c) => (i % 2 ? c[i - 1]! : n - 1 - c[i + 1]!));
    // Try in place, then nudged off a wall or the stack.
    for (const dx of [0, -1, 1, -2, 2])
      if (fits(turned, piece.x + dx, piece.y)) {
        piece.cells = turned;
        piece.x += dx;
        ctx.play("tick", { x: ox + piece.x * CELL });
        return;
      }
  };
  const lock = () => {
    for (let i = 0; i < 8; i += 2) {
      const r = piece.y + piece.cells[i + 1]!;
      if (r < 0) return end();
      board[r]![piece.x + piece.cells[i]!] = piece.kind;
    }
    flash = [];
    for (let r = 0; r < ROWS; r++)
      if (board[r]!.every((c) => c >= 0)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(-1));
        flash.push(r);
        laid.push(LAYERS[(lines + flash.length - 1) % LAYERS.length]!);
      }
    const level = 1 + Math.floor(lines / 6);
    if (flash.length) {
      lines += flash.length;
      points += [0, 100, 300, 500, 800][flash.length]! * level;
      fade = 1;
      ctx.play(flash.length > 3 ? "success" : "break", { x: W / 2 });
      ctx.play("note", { index: Math.min(8, lines % 9), delay: 0.08 });
      ctx.score(points);
      if (1 + Math.floor(lines / 6) > level) ctx.announce(`Level ${level + 1}.`);
    } else ctx.play("tap", { x: ox + piece.x * CELL });
    piece = make(next);
    next = draw();
    if (!fits(piece.cells, piece.x, piece.y)) end();
  };
  const end = () => {
    dead = true;
    ctx.play("gameOver");
    ctx.over(`${lines} ${lines === 1 ? "layer" : "layers"} laid, ${points} points.`);
  };
  const fall = () => {
    if (fits(piece.cells, piece.x, piece.y + 1)) piece.y++;
    else lock();
  };
  const drop = () => {
    while (fits(piece.cells, piece.x, piece.y + 1)) piece.y++;
    nudge = 1;
    lock();
  };

  ctx.onKey((key, down, event) => {
    if (!down || dead || !key) return;
    if (!started) return void (started = true);
    if (key === "left" || key === "right") {
      if (move(key === "left" ? -1 : 1)) ctx.play("tick", { x: ox + piece.x * CELL });
    } else if (key === "down") {
      fall();
      clock = 0;
    } else if (event.repeat) return;
    else if (key === "up") rotate();
    else drop();
  });
  // The piece follows the pointer across the board; a click turns it, a click on the drop box drops it.
  ctx.onPointer((type, x) => {
    if (dead) return;
    if (type === "down" && !started) return void (started = true);
    if (!started) return;
    if (type === "move" && x < px - 8) {
      const n = PIECES[piece.kind]![0];
      const want = Math.round((x - ox) / CELL - n / 2);
      const step = Math.sign(want - piece.x);
      if (step && move(step)) ctx.play("tick", { x });
    } else if (type === "down") {
      if (x < px - 8) rotate();
      else drop();
    }
  });

  const tile = (x: number, y: number, size: number, hue: string, weight: number) => {
    g.save();
    g.beginPath();
    g.rect(x, y, size, size);
    g.clip();
    g.fillStyle = hue;
    g.globalAlpha = 0.18;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = hue;
    g.lineWidth = 1;
    g.beginPath();
    for (let d = -size; d < size; d += 3.5) {
      g.moveTo(x + d, y + size);
      g.lineTo(x + d + size, y);
    }
    g.stroke();
    g.restore();
    g.strokeStyle = hue;
    g.lineWidth = weight;
    g.strokeRect(x + weight / 2, y + weight / 2, size - weight, size - weight);
  };
  const cellsOf = (p: Piece, y = p.y) => [0, 2, 4, 6].map((i) => [p.x + p.cells[i]!, y + p.cells[i + 1]!] as const);

  ctx.frame((dt) => {
    if (started && !dead) {
      const level = 1 + Math.floor(lines / 6);
      const every = Math.max(130, 720 - (level - 1) * 60) * (ctx.reduced ? 1.25 : 1);
      clock += dt;
      while (clock > every && !dead) {
        clock -= every;
        fall();
      }
    }
    fade = Math.max(0, fade - dt / 320);
    nudge = Math.max(0, nudge - dt / 120);

    g.clearRect(0, 0, W, H);
    const shake = ctx.reduced ? 0 : nudge * 1.5;
    // The board: a ruled frame with construction dots at the cell corners.
    g.fillStyle = colors.line;
    for (let c = 1; c < COLS; c++) for (let r = 1; r < ROWS; r++) g.fillRect(ox + c * CELL - 0.5, oy + r * CELL - 0.5, 1, 1);
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.strokeRect(ox - 0.5, oy - 0.5 + shake, COLS * CELL + 1, ROWS * CELL + 1);

    board.forEach((row, r) => row.forEach((k, c) => k >= 0 && tile(ox + c * CELL, oy + r * CELL + shake, CELL, colors[TINTS[k]!], 1)));
    // Rows just laid: a ruled stroke where each one was.
    if (fade && !ctx.reduced) {
      g.strokeStyle = colors.signal;
      g.globalAlpha = fade;
      g.lineWidth = 1.5;
      g.beginPath();
      for (const r of flash) {
        g.moveTo(ox - 6, oy + r * CELL + CELL / 2);
        g.lineTo(ox + COLS * CELL + 6, oy + r * CELL + CELL / 2);
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    if (!dead) {
      // Projection: a dashed outline where the piece will land.
      let land = piece.y;
      while (fits(piece.cells, piece.x, land + 1)) land++;
      g.strokeStyle = colors.muted;
      g.setLineDash([2, 2]);
      g.lineWidth = 1;
      for (const [c, r] of cellsOf(piece, land)) if (r >= 0) g.strokeRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
      g.setLineDash([]);
      for (const [c, r] of cellsOf(piece)) if (r >= 0) tile(ox + c * CELL, oy + r * CELL, CELL, colors[TINTS[piece.kind]!], 2);
    }

    // The panel: the next piece, then the section legend of layers laid.
    g.font = `9px ${ctx.fonts.mono}`;
    g.textAlign = "left";
    g.fillStyle = colors.muted;
    g.fillText("next", px, oy + 8);
    const [n, cells] = PIECES[next]!;
    for (let i = 0; i < 8; i += 2) tile(px + 4 + cells[i]! * 7 + (4 - n) * 3.5, oy + 14 + cells[i + 1]! * 7, 7, colors[TINTS[next]!], 1);
    g.fillText("section a-a", px, oy + 54);
    g.strokeStyle = colors.line;
    g.beginPath();
    g.moveTo(px, oy + 58.5);
    g.lineTo(W - 8, oy + 58.5);
    g.stroke();
    const shown = laid.slice(-7).reverse();
    shown.forEach((word, i) => {
      const y = oy + 64 + i * 11;
      tile(px, y, 8, colors[TINTS[(laid.length - 1 - i) % 7]!], 1);
      g.fillStyle = i ? colors.muted : colors.ink;
      g.fillText(word, px + 13, y + 7);
    });
    if (!shown.length) g.fillText("no layers yet", px, oy + 71);
    g.fillStyle = colors.muted;
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.fillText(`lv ${1 + Math.floor(lines / 6)}`, px, oy + ROWS * CELL - 16);
    g.strokeRect(px + 34.5, oy + ROWS * CELL - 26.5, W - px - 42, 14);
    g.fillText("drop ↓", px + 42, oy + ROWS * CELL - 16);

    if (!started) {
      g.fillStyle = colors.paper;
      g.fillRect(ox + 2, oy + ROWS * CELL / 2 - 12, COLS * CELL - 4, 22);
      g.fillStyle = colors.ink;
      g.textAlign = "center";
      g.fillText("press an arrow", ox + (COLS * CELL) / 2, oy + ROWS * CELL / 2 - 2);
      g.fillText("to start", ox + (COLS * CELL) / 2, oy + ROWS * CELL / 2 + 8);
    }
  });

  return () => {};
};

export default stack;
