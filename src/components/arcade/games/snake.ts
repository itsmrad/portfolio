/**
 * "Dimension line": the snake is a dimension line on the drawing, ticked at
 * every cell, arrowhead first. It measures points (crosshair marks in the
 * arcade palette): each one adds a cell, a tick and 10 mm to the reading. The
 * frame and the line itself are the walls. Speed ramps gently with length.
 */
import type { Game } from "../contract";

const CELL = 12;
const HUES = ["accent", "amber", "green", "teal", "violet"] as const;
type Point = [number, number];

const snake: Game = (ctx) => {
  const { g, colors, width, height } = ctx;
  const cols = Math.floor(width / CELL);
  const rows = Math.floor(height / CELL);
  const ox = (width - cols * CELL) / 2;
  const oy = (height - rows * CELL) / 2;

  let body: Point[] = [
    [5, 7],
    [4, 7],
    [3, 7],
  ];
  let dir: Point = [1, 0];
  const turns: Point[] = [];
  let food: Point = [0, 0];
  let hue = 0;
  let clock = 0;
  let started = false;
  let dead = false;
  let flash = 0;

  const free = (x: number, y: number) => !body.some(([bx, by]) => bx === x && by === y);
  const place = () => {
    do food = [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)];
    while (!free(...food));
    hue = (hue + 1) % HUES.length;
  };
  place();

  // Up to two queued turns, so a quick double press is not lost; reversing is ignored.
  const turn = (next: Point) => {
    const last = turns.at(-1) ?? dir;
    if (turns.length < 2 && last[0] !== -next[0] && last[1] !== -next[1] && (last[0] !== next[0] || last[1] !== next[1])) {
      turns.push(next);
      ctx.play("tick", { x: ox + body[0]![0] * CELL });
    }
    started = true;
  };
  const DIRS: Record<string, Point> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  ctx.onKey((key, down) => down && key && DIRS[key] && turn(DIRS[key]));
  // Click: turn towards the point, on the axis across the current heading.
  ctx.onPointer((type, x, y) => {
    if (type !== "down") return;
    const [hx, hy] = body[0]!;
    const dx = x - (ox + hx * CELL + CELL / 2);
    const dy = y - (oy + hy * CELL + CELL / 2);
    turn(dir[0] ? [0, dy < 0 ? -1 : 1] : [dx < 0 ? -1 : 1, 0]);
  });

  const step = () => {
    dir = turns.shift() ?? dir;
    const [hx, hy] = body[0]!;
    const head: Point = [hx + dir[0], hy + dir[1]];
    const eats = head[0] === food[0] && head[1] === food[1];
    // The tail moves away this step, so the head may take its cell.
    const rest = eats ? body : body.slice(0, -1);
    if (head[0] < 0 || head[1] < 0 || head[0] >= cols || head[1] >= rows || rest.some(([x, y]) => x === head[0] && y === head[1])) {
      dead = true;
      ctx.play("gameOver", { x: ox + hx * CELL });
      ctx.over(`Measured ${(body.length - 3) * 10} mm.`);
      return;
    }
    body = [head, ...rest];
    if (eats) {
      ctx.play("pop", { x: ox + head[0] * CELL });
      ctx.score(body.length - 3, `${(body.length - 3) * 10} mm`);
      flash = 1;
      place();
    }
  };

  const center = ([x, y]: Point): Point => [ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2];

  ctx.frame((dt) => {
    if (started && !dead) {
      // 6 cells a second, up to 12 as the line grows; slower under reduced motion.
      const rate = Math.min(12, 6 + (body.length - 3) * 0.3) * (ctx.reduced ? 0.75 : 1);
      clock += dt;
      while (clock > 1000 / rate && !dead) {
        clock -= 1000 / rate;
        step();
      }
      flash = Math.max(0, flash - dt / 240);
    }

    g.clearRect(0, 0, width, height);
    // Grid of construction dots.
    g.fillStyle = colors.line;
    for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) g.fillRect(ox + x * CELL - 0.5, oy + y * CELL - 0.5, 1, 1);

    // The point to measure: a crosshair in a hue with a ring that pulses once when a point is taken.
    const [fx, fy] = center(food);
    g.strokeStyle = colors[HUES[hue]!];
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(fx - 5, fy);
    g.lineTo(fx + 5, fy);
    g.moveTo(fx, fy - 5);
    g.lineTo(fx, fy + 5);
    g.stroke();
    g.beginPath();
    g.arc(fx, fy, 3 + (ctx.reduced ? 0 : flash * 4), 0, Math.PI * 2);
    g.stroke();

    // The line through the cell centres, a tick across it at every cell, the arrowhead at the head.
    const points = body.map(center);
    g.strokeStyle = dead ? colors.accent : colors.ink;
    g.lineWidth = 1.5;
    g.lineJoin = "round";
    g.beginPath();
    points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < body.length; i++) {
      const [x, y] = points[i]!;
      const across = body[i - 1]![0] === body[i]![0];
      if (across) {
        g.moveTo(x - 3, y);
        g.lineTo(x + 3, y);
      } else {
        g.moveTo(x, y - 3);
        g.lineTo(x, y + 3);
      }
    }
    // Extension line at the tail, as a dimension starts.
    const [tx, ty] = points.at(-1)!;
    const tail = body.at(-1)!;
    const prev = body.at(-2)!;
    if (tail[0] === prev[0]) {
      g.moveTo(tx - 6, ty);
      g.lineTo(tx + 6, ty);
    } else {
      g.moveTo(tx, ty - 6);
      g.lineTo(tx, ty + 6);
    }
    g.stroke();
    const [hx, hy] = points[0]!;
    g.fillStyle = dead ? colors.accent : colors.signal;
    g.beginPath();
    g.moveTo(hx + dir[0] * 6, hy + dir[1] * 6);
    g.lineTo(hx - dir[0] * 2 + dir[1] * 4, hy - dir[1] * 2 + dir[0] * 4);
    g.lineTo(hx - dir[0] * 2 - dir[1] * 4, hy - dir[1] * 2 - dir[0] * 4);
    g.fill();

    if (!started) {
      g.font = `11px ${ctx.fonts.mono}`;
      g.fillStyle = colors.muted;
      g.textAlign = "center";
      g.fillText("press an arrow to start", width / 2, height - 14);
    }
  });

  return () => {};
};

export default snake;
