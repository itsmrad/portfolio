/**
 * "Clean sheet": rows of registration marks march across the drawing sheet
 * and drip ink. You are the T-square on the bottom edge, ruling short pen
 * strokes up at them from behind three hatched erasers that wear away. Clear
 * the sheet before the marks reach the erasers; each sheet comes a little
 * faster and lower.
 */
import type { Game } from "../contract";

const COLS = 6;
const ROWS = 4;
// One shape, colour and value per row, top to bottom.
const ROW_HUES = ["violet", "blue", "teal", "green"] as const;
const ROW_POINTS = [30, 20, 20, 10];

type Shot = { x: number; y: number };

const marks: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const floor = H - 12;
  const shieldY = H - 40;
  let sheet = 0;
  let alive: boolean[] = [];
  let fx = 0;
  let fy = 0;
  let dir = 1;
  let phase = 0;
  let stepClock = 0;
  let dropClock = 0;
  let x = W / 2;
  let target: number | null = null;
  let cool = 0;
  let lives = 3;
  let hurt = 0;
  let points = 0;
  let started = false;
  let dead = false;
  let shots: Shot[] = [];
  let drops: Shot[] = [];
  let rings: [number, number, number][] = [];
  // Three erasers, 6 x 3 cells of 4 units each.
  const shields: boolean[][] = [0, 1, 2].map(() => Array(18).fill(true));
  const shieldX = (i: number) => W / 2 - 66 + i * 54;

  const newSheet = () => {
    alive = Array(COLS * ROWS).fill(true);
    fx = 30;
    fy = 22 + Math.min(sheet, 4) * 5;
    dir = 1;
    shots = [];
    drops = [];
    sheet++;
  };
  newSheet();
  const left = () => alive.filter(Boolean).length;
  const at = (i: number) => [fx + (i % COLS) * 24, fy + Math.floor(i / COLS) * 14] as const;

  const end = (text: string) => {
    dead = true;
    ctx.play("gameOver");
    ctx.over(text);
  };
  const fire = () => {
    if (cool > 0 || shots.length > 1) return;
    shots.push({ x, y: floor - 10 });
    cool = 280;
    ctx.play("tap", { x });
  };
  // Hits a shield cell at (sx, sy), wearing it away.
  const erase = (sx: number, sy: number) => {
    for (let s = 0; s < 3; s++) {
      const c = Math.floor((sx - shieldX(s)) / 4);
      const r = Math.floor((sy - shieldY) / 4);
      if (c >= 0 && c < 6 && r >= 0 && r < 3 && shields[s]![r * 6 + c]) {
        shields[s]![r * 6 + c] = false;
        ctx.play("tick", { x: sx });
        return true;
      }
    }
    return false;
  };

  ctx.onKey((key, down) => {
    if (!down || dead) return;
    started = true;
    target = null;
    if (key === "action") fire();
  });
  ctx.onPointer((type, px) => {
    if (dead) return;
    target = px;
    if (type === "down") {
      if (started) fire();
      started = true;
    }
  });

  const step = (dt: number) => {
    const s = dt / 1000;
    // The T-square: arrows, or toward the pointer.
    const v = 110 * s;
    if (ctx.held("left")) x -= v;
    if (ctx.held("right")) x += v;
    if (target !== null) x += Math.max(-v, Math.min(v, target - x));
    x = Math.max(12, Math.min(W - 12, x));
    cool -= dt;
    hurt = Math.max(0, hurt - dt);
    if (ctx.held("action")) fire();

    // The formation steps sideways, faster as it thins; at a side it comes down a row.
    stepClock += dt;
    const every = (40 + 460 * (left() / alive.length)) * Math.pow(0.9, sheet - 1) * (ctx.reduced ? 1.3 : 1);
    if (stepClock > every) {
      stepClock = 0;
      phase ^= 1;
      const xs = alive.flatMap((a, i) => (a ? [at(i)[0]] : []));
      if ((dir > 0 && Math.max(...xs) + 4 > W - 8) || (dir < 0 && Math.min(...xs) - 4 < 8)) {
        dir = -dir;
        fy += 6;
      } else fx += dir * 4;
      const lowest = Math.max(...alive.flatMap((a, i) => (a ? [at(i)[1]] : [])));
      if (lowest + 5 >= shieldY) return end(`The marks reached the erasers on sheet ${sheet}. ${points} points.`);
    }

    // A mark at the foot of a random column drips ink.
    dropClock += dt;
    if (dropClock > Math.max(380, 1100 - sheet * 120)) {
      dropClock = 0;
      const col = Math.floor(Math.random() * COLS);
      for (let r = ROWS - 1; r >= 0; r--)
        if (alive[r * COLS + col]) {
          const [mx, my] = at(r * COLS + col);
          drops.push({ x: mx, y: my + 6 });
          break;
        }
    }

    shots = shots.filter((shot) => {
      shot.y -= 200 * s;
      if (shot.y < 0 || erase(shot.x, shot.y)) return false;
      const hit = alive.findIndex((a, i) => a && Math.abs(at(i)[0] - shot.x) < 6 && Math.abs(at(i)[1] - shot.y) < 6);
      if (hit < 0) return true;
      alive[hit] = false;
      points += ROW_POINTS[Math.floor(hit / COLS)]! * sheet;
      ctx.score(points);
      rings.push([...at(hit), 0]);
      ctx.play("pop", { x: shot.x });
      return false;
    });
    drops = drops.filter((drop) => {
      drop.y += (60 + sheet * 6) * s;
      if (drop.y > H || erase(drop.x, drop.y)) return false;
      if (!hurt && drop.y > floor - 8 && Math.abs(drop.x - x) < 11) {
        lives--;
        hurt = 1200;
        ctx.play("error", { x });
        if (!lives) end(`Inked out on sheet ${sheet}. ${points} points.`);
        else ctx.announce(`Hit. ${lives} left.`);
        return false;
      }
      return true;
    });
    rings = rings.filter((ring) => (ring[2] += dt / 300) < 1);

    if (!left()) {
      ctx.play("success");
      ctx.announce(`Sheet ${sheet} clean.`);
      newSheet();
    }
  };

  const mark = (i: number, hue: string) => {
    const [mx, my] = at(i);
    const r = Math.floor(i / COLS);
    const arm = phase ? 6 : 5;
    g.strokeStyle = hue;
    g.lineWidth = 1.5;
    g.beginPath();
    if (r === 0) g.arc(mx, my, 3.5, 0, Math.PI * 2);
    else if (r === 1) g.rect(mx - 3.5, my - 3.5, 7, 7);
    else if (r === 2) {
      g.moveTo(mx, my - 4.5);
      g.lineTo(mx + 4.5, my + 3.5);
      g.lineTo(mx - 4.5, my + 3.5);
      g.closePath();
    } else {
      g.moveTo(mx, my - 4.5);
      g.lineTo(mx + 4.5, my);
      g.lineTo(mx, my + 4.5);
      g.lineTo(mx - 4.5, my);
      g.closePath();
    }
    g.stroke();
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(mx - arm, my);
    g.lineTo(mx + arm, my);
    g.moveTo(mx, my - arm);
    g.lineTo(mx, my + arm);
    g.stroke();
  };

  ctx.frame((dt) => {
    if (started && !dead) step(dt);

    g.clearRect(0, 0, W, H);
    g.font = `9px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.textAlign = "left";
    g.fillText(`sheet ${sheet}`, 8, 11);
    // Lives: small T-squares at the top right.
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < lives; i++) {
      const lx = W - 12 - i * 14;
      g.rect(lx - 5, 8, 10, 2);
      g.moveTo(lx, 8);
      g.lineTo(lx, 3);
    }
    g.stroke();

    alive.forEach((a, i) => a && mark(i, colors[ROW_HUES[Math.floor(i / COLS)]!]));
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    for (const [rx, ry, t] of rings) {
      g.globalAlpha = 1 - t;
      g.beginPath();
      g.arc(rx, ry, 4 + t * (ctx.reduced ? 0 : 8), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;

    // Erasers: hatched cells inside a rounded outline.
    shields.forEach((cells, s) => {
      const sx = shieldX(s);
      g.strokeStyle = colors.muted;
      g.beginPath();
      cells.forEach((on, k) => {
        if (!on) return;
        const cx = sx + (k % 6) * 4;
        const cy = shieldY + Math.floor(k / 6) * 4;
        g.moveTo(cx, cy + 4);
        g.lineTo(cx + 4, cy);
      });
      g.stroke();
      g.strokeStyle = colors.line;
      g.strokeRect(sx - 0.5, shieldY - 0.5, 25, 13);
    });

    g.strokeStyle = colors.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    for (const shot of shots) {
      g.moveTo(shot.x, shot.y);
      g.lineTo(shot.x, shot.y + 6);
    }
    g.stroke();
    g.fillStyle = colors.ink;
    for (const drop of drops) {
      g.beginPath();
      g.arc(drop.x, drop.y, 1.8, 0, Math.PI * 2);
      g.moveTo(drop.x - 1.8, drop.y);
      g.lineTo(drop.x, drop.y - 5);
      g.lineTo(drop.x + 1.8, drop.y);
      g.fill();
    }

    // The T-square: a head on the bottom edge and its blade up. Hit: red, blinking.
    if (!(hurt && !ctx.reduced && Math.floor(hurt / 120) % 2)) {
      g.strokeStyle = hurt || dead ? colors.accent : colors.signal;
      g.lineWidth = 2;
      g.strokeRect(x - 10, floor - 3, 20, 4);
      g.beginPath();
      g.moveTo(x, floor - 3);
      g.lineTo(x, floor - 11);
      g.stroke();
    }
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, floor + 3.5);
    g.lineTo(W, floor + 3.5);
    g.stroke();

    if (!started) {
      g.fillStyle = colors.ink;
      g.textAlign = "center";
      g.fillText("press space to start", W / 2, shieldY - 14);
    }
  });

  return () => {};
};

export default marks;
