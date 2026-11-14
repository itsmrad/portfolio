/**
 * "Loose parts": irregular parts drift off the drawing, each with its centre
 * mark and a diameter callout (Ø32, Ø18). You fly a dimension arrowhead:
 * turn, thrust, and rule short strokes that split every part in two until the
 * pieces are too small to dimension. The edges of the sheet wrap.
 */
import type { Game } from "../contract";

const SIZES = [16, 9, 5];
const HUES = ["amber", "green", "teal", "blue", "violet"] as const;

type Rock = { x: number; y: number; vx: number; vy: number; size: number; hue: number; turn: number; spin: number; edge: number[] };
type Bolt = { x: number; y: number; vx: number; vy: number; life: number };

const parts: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  let x = W / 2;
  let y = H / 2;
  let vx = 0;
  let vy = 0;
  let angle = -Math.PI / 2;
  let aim: [number, number] | null = null;
  let pressed = false;
  let lives = 3;
  let safe = 0;
  let gone = 0;
  let cool = 0;
  let wave = 0;
  let points = 0;
  let started = false;
  let dead = false;
  let rocks: Rock[] = [];
  let bolts: Bolt[] = [];
  let rings: [number, number, number][] = [];

  const rock = (rx: number, ry: number, size: number): Rock => {
    const a = Math.random() * Math.PI * 2;
    const speed = (14 + Math.random() * 14 + size * 9 + wave * 2) * (ctx.reduced ? 0.7 : 1);
    return {
      x: rx,
      y: ry,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size,
      hue: Math.floor(Math.random() * HUES.length),
      turn: 0,
      spin: (Math.random() - 0.5) * 1.2,
      edge: Array.from({ length: 9 }, () => 0.72 + Math.random() * 0.3),
    };
  };
  const newWave = () => {
    wave++;
    // Spawn on the frame's edge, away from the ship.
    rocks = Array.from({ length: 2 + wave }, (_, i) => (i % 2 ? rock(Math.random() * W, 0, 0) : rock(0, Math.random() * H, 0)));
  };
  newWave();

  const fire = () => {
    if (cool > 0 || bolts.length > 3 || gone) return;
    bolts.push({ x: x + Math.cos(angle) * 7, y: y + Math.sin(angle) * 7, vx: vx + Math.cos(angle) * 190, vy: vy + Math.sin(angle) * 190, life: 0.75 });
    cool = 160;
    ctx.play("tap", { x });
  };
  const wrap = (o: { x: number; y: number }, m: number) => {
    o.x = ((o.x + m) % (W + 2 * m) + W + 2 * m) % (W + 2 * m) - m;
    o.y = ((o.y + m) % (H + 2 * m) + H + 2 * m) % (H + 2 * m) - m;
  };

  ctx.onKey((key, down) => {
    if (!down || dead) return;
    started = true;
    aim = null;
    if (key === "action") fire();
  });
  // Pointer: the ship turns to face it; a click fires, holding the button thrusts.
  ctx.onPointer((type, px, py) => {
    if (dead) return;
    aim = [px, py];
    if (type === "down") {
      if (started) fire();
      started = true;
      pressed = true;
    } else if (type === "up") pressed = false;
  });

  const step = (dt: number) => {
    const s = dt / 1000;
    cool -= dt;
    safe = Math.max(0, safe - dt);
    if (gone) {
      gone = Math.max(0, gone - dt);
      if (!gone) {
        x = W / 2;
        y = H / 2;
        vx = vy = 0;
        safe = 2000;
      }
    } else {
      const turn = 4.2 * s;
      if (ctx.held("left")) angle -= turn;
      if (ctx.held("right")) angle += turn;
      if (aim && Math.hypot(aim[0] - x, aim[1] - y) > 8) {
        const to = Math.atan2(aim[1] - y, aim[0] - x);
        const d = Math.atan2(Math.sin(to - angle), Math.cos(to - angle));
        angle += Math.max(-turn * 1.4, Math.min(turn * 1.4, d));
      }
      if (ctx.held("up") || pressed) {
        vx += Math.cos(angle) * 130 * s;
        vy += Math.sin(angle) * 130 * s;
      }
      if (ctx.held("action")) fire();
      const drag = Math.pow(0.55, s);
      vx *= drag;
      vy *= drag;
      const sp = Math.hypot(vx, vy);
      if (sp > 120) {
        vx *= 120 / sp;
        vy *= 120 / sp;
      }
      x += vx * s;
      y += vy * s;
      const ship = { x, y };
      wrap(ship, 4);
      ({ x, y } = ship);
    }

    for (const r of rocks) {
      r.x += r.vx * s;
      r.y += r.vy * s;
      r.turn += r.spin * s;
      wrap(r, SIZES[r.size]!);
    }
    bolts = bolts.filter((b) => {
      b.x += b.vx * s;
      b.y += b.vy * s;
      wrap(b, 0);
      b.life -= s;
      const hit = rocks.find((r) => Math.hypot(r.x - b.x, r.y - b.y) < SIZES[r.size]! + 1);
      if (hit) {
        rocks.splice(rocks.indexOf(hit), 1);
        if (hit.size < 2) rocks.push(rock(hit.x, hit.y, hit.size + 1), rock(hit.x, hit.y, hit.size + 1));
        points += [20, 50, 100][hit.size]!;
        ctx.score(points);
        rings.push([hit.x, hit.y, 0]);
        ctx.play(hit.size < 2 ? "break" : "pop", { x: hit.x });
        return false;
      }
      return b.life > 0;
    });
    rings = rings.filter((ring) => (ring[2] += dt / 320) < 1);

    if (!gone && !safe && rocks.some((r) => Math.hypot(r.x - x, r.y - y) < SIZES[r.size]! * 0.85 + 3)) {
      lives--;
      rings.push([x, y, 0]);
      ctx.play("error", { x });
      if (!lives) {
        dead = true;
        ctx.play("gameOver");
        return ctx.over(`Wave ${wave}, ${points} points.`);
      }
      ctx.announce(`Hit. ${lives} left.`);
      gone = 900;
    }
    if (!rocks.length) {
      ctx.play("success");
      ctx.announce(`Wave ${wave} cleared.`);
      newWave();
      safe = 1500;
    }
  };

  ctx.frame((dt) => {
    if (started && !dead) step(dt);

    g.clearRect(0, 0, W, H);
    g.font = `8px ${ctx.fonts.mono}`;
    g.textAlign = "left";
    for (const r of rocks) {
      const size = SIZES[r.size]!;
      g.strokeStyle = colors[HUES[r.hue]!];
      g.lineWidth = 1.5;
      g.beginPath();
      r.edge.forEach((k, i) => {
        const a = r.turn + (i / r.edge.length) * Math.PI * 2;
        g.lineTo(r.x + Math.cos(a) * size * k, r.y + Math.sin(a) * size * k);
      });
      g.closePath();
      g.stroke();
      // Centre mark, and a diameter callout on the two larger sizes.
      g.lineWidth = 1;
      g.strokeStyle = colors.line;
      g.beginPath();
      g.moveTo(r.x - 3, r.y);
      g.lineTo(r.x + 3, r.y);
      g.moveTo(r.x, r.y - 3);
      g.lineTo(r.x, r.y + 3);
      if (r.size < 2) {
        g.moveTo(r.x + size * 0.6, r.y - size * 0.6);
        g.lineTo(r.x + size + 4, r.y - size - 3);
        g.lineTo(r.x + size + 10, r.y - size - 3);
      }
      g.stroke();
      if (r.size < 2) {
        g.fillStyle = colors.muted;
        g.fillText(`Ø${size * 2}`, r.x + size + 11, r.y - size);
      }
    }
    g.strokeStyle = colors.muted;
    for (const [rx, ry, t] of rings) {
      g.globalAlpha = 1 - t;
      g.beginPath();
      g.arc(rx, ry, 3 + t * (ctx.reduced ? 2 : 12), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = colors.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    for (const b of bolts) {
      g.moveTo(b.x, b.y);
      g.lineTo(b.x - b.vx / 60, b.y - b.vy / 60);
    }
    g.stroke();

    // The ship: a dimension arrowhead with its line trailing; blinks while it is safe.
    if (!gone && !(safe && !ctx.reduced && Math.floor(safe / 150) % 2)) {
      const c = Math.cos(angle);
      const sn = Math.sin(angle);
      const pt = (f: number, side: number) => [x + c * f - sn * side, y + sn * f + c * side] as const;
      g.strokeStyle = dead ? colors.accent : colors.signal;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(...pt(7, 0));
      g.lineTo(...pt(-5, 4));
      g.lineTo(...pt(-5, -4));
      g.closePath();
      g.moveTo(...pt(-5, 0));
      g.lineTo(...pt(-10, 0));
      g.stroke();
      if ((ctx.held("up") || pressed) && started && !dead) {
        g.strokeStyle = colors.muted;
        g.lineWidth = 1;
        g.setLineDash([2, 2]);
        g.beginPath();
        g.moveTo(...pt(-11, 0));
        g.lineTo(...pt(-17, 0));
        g.stroke();
        g.setLineDash([]);
      }
    }

    g.font = `9px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.fillText(`wave ${wave}`, 8, 11);
    g.textAlign = "right";
    g.fillText(`${lives} ${lives === 1 ? "ship" : "ships"}`, W - 8, 11);
    if (!started) {
      g.textAlign = "center";
      g.fillStyle = colors.ink;
      g.fillText("arrows to fly, space to fire", W / 2, H - 14);
    }
  });

  return () => {};
};

export default parts;
