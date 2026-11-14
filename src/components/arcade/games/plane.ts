/**
 * "Paper plane": a plane folded from the drawing sheet, kept up with one
 * button, through gaps in a row of hatched columns. Every gap is dimensioned
 * like a clearance on a drawing, in mm, and the clearance narrows as you go,
 * so the difficulty is written on the sheet. The first gaps are generous.
 */
import type { Game } from "../contract";

const PX = 64;
const COL_W = 20;
const SPACING = 112;
const GRAVITY = 0.00055;
const FLAP = -0.16;
const HUES = ["amber", "green", "teal", "blue", "violet"] as const;

type Column = { x: number; gap: number; size: number; hue: number; passed?: boolean };

const plane: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const FLOOR = H - 14;
  let y = H / 2 - 10;
  let v = 0;
  let started = false;
  let dead = false;
  let cleared = 0;
  let scroll = 0;
  let bob = 0;
  let made = 0;
  const columns: Column[] = [];

  const add = (x: number) => {
    // 96 down to 56 over the first two dozen gaps; each centre within reach of the last.
    const size = Math.max(56, 96 - made * 1.7);
    const last = columns.at(-1)?.gap ?? H / 2;
    const gap = Math.min(FLOOR - size / 2 - 8, Math.max(size / 2 + 8, last + (Math.random() - 0.5) * (made < 3 ? 40 : 90)));
    columns.push({ x, gap, size, hue: made++ % HUES.length });
  };
  // The first gap about two seconds after the first flap.
  add(W - 60);

  const flap = () => {
    if (dead) return;
    started = true;
    v = FLAP;
    ctx.play("tap", { x: PX });
  };
  ctx.onKey((key, down, event) => down && !event.repeat && (key === "action" || key === "up") && flap());
  ctx.onPointer((type) => type === "down" && flap());

  const crash = () => {
    dead = true;
    ctx.play("break", { x: PX });
    ctx.over(cleared ? `Cleared ${cleared} gap${cleared > 1 ? "s" : ""}.` : "No gaps cleared.");
  };

  const hatch = (x: number, top: number, bottom: number) => {
    g.save();
    g.beginPath();
    g.rect(x, top, COL_W, bottom - top);
    g.clip();
    g.beginPath();
    for (let d = top - COL_W; d < bottom; d += 5) {
      g.moveTo(x, d + COL_W);
      g.lineTo(x + COL_W, d);
    }
    g.stroke();
    g.restore();
  };

  ctx.frame((dt) => {
    // Slower under reduced motion: the same course, more time for it.
    const step = dt * (ctx.reduced ? 0.8 : 1);
    if (started && !dead) {
      v = Math.min(0.24, v + GRAVITY * step);
      y = Math.max(6, y + v * step);
      const speed = Math.min(0.075, 0.058 + cleared * 0.001);
      scroll += speed * step;
      for (const c of columns) {
        c.x -= speed * step;
        if (!c.passed && c.x + COL_W < PX - 4) {
          c.passed = true;
          cleared++;
          ctx.score(cleared);
          ctx.play("pop", { x: PX });
        }
        // A forgiving hit circle of radius 4 round the plane's middle.
        if (PX + 4 > c.x && PX - 4 < c.x + COL_W && Math.abs(y - c.gap) > c.size / 2 - 4) return crash();
      }
      if (columns[0]!.x < -COL_W) columns.shift();
      if (columns.at(-1)!.x < W - SPACING) add(columns.at(-1)!.x + SPACING);
      if (y > FLOOR - 3) return crash();
    } else if (!started) bob += dt;

    g.clearRect(0, 0, W, H);
    // The floor: a scale that runs past, a tick every 8 units.
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, FLOOR + 0.5);
    g.lineTo(W, FLOOR + 0.5);
    for (let x = -(scroll % 8); x < W; x += 8) {
      g.moveTo(x, FLOOR);
      g.lineTo(x, FLOOR + 3);
    }
    g.stroke();

    g.textAlign = "left";
    g.textBaseline = "middle";
    g.font = `8px ${ctx.fonts.mono}`;
    for (const c of columns) {
      const top = c.gap - c.size / 2;
      const bottom = c.gap + c.size / 2;
      const color = colors[HUES[c.hue]!];
      g.strokeStyle = color;
      hatch(c.x, 0, top);
      hatch(c.x, bottom, FLOOR);
      g.lineWidth = 1.5;
      g.strokeRect(c.x, -2, COL_W, top + 2);
      g.strokeRect(c.x, bottom, COL_W, FLOOR - bottom);
      // The clearance, dimensioned: a line with arrowheads and its size in mm.
      const dx = c.x + COL_W + 6;
      g.lineWidth = 1;
      g.strokeStyle = colors.muted;
      g.beginPath();
      g.moveTo(c.x + COL_W + 2, top);
      g.lineTo(dx + 3, top);
      g.moveTo(c.x + COL_W + 2, bottom);
      g.lineTo(dx + 3, bottom);
      g.moveTo(dx, top + 1);
      g.lineTo(dx, bottom - 1);
      for (const [ay, s] of [[top + 1, 1], [bottom - 1, -1]] as const) {
        g.moveTo(dx - 2, ay + 4 * s);
        g.lineTo(dx, ay);
        g.lineTo(dx + 2, ay + 4 * s);
      }
      g.stroke();
      g.fillStyle = colors.muted;
      g.fillText(String(Math.round(c.size)), dx + 4, c.gap);
    }

    // The plane, nose up as it climbs: a folded dart in the signal colour, its fold line in ink.
    const py = started ? y : y + (ctx.reduced ? 0 : Math.sin(bob / 300) * 3);
    g.save();
    g.translate(PX, py);
    g.rotate(Math.max(-0.5, Math.min(0.7, v * 3)));
    g.beginPath();
    g.moveTo(9, 0);
    g.lineTo(-8, -6);
    g.lineTo(-4, 0);
    g.lineTo(-8, 5);
    g.closePath();
    g.fillStyle = colors.paper;
    g.fill();
    g.strokeStyle = dead ? colors.accent : colors.signal;
    g.lineWidth = 2;
    g.lineJoin = "round";
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = dead ? colors.accent : colors.ink;
    g.beginPath();
    g.moveTo(9, 0);
    g.lineTo(-4, 0);
    g.stroke();
    g.restore();

    g.textAlign = "center";
    if (!started) {
      g.font = `11px ${ctx.fonts.mono}`;
      g.fillStyle = colors.muted;
      g.fillText("space, click or tap to fly", W / 2, FLOOR - 16);
    }
    g.font = `16px ${ctx.fonts.pixel}`;
    g.fillStyle = colors.ink;
    g.fillText(String(cleared), W / 2, 16);
  });

  return () => {};
};

export default plane;
