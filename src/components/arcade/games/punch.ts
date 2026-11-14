/**
 * "Centre punch": the hole centres of a part appear one at a time as centre
 * marks (a circle with its crosshair) that shrink away. Punch each before it
 * goes; every hit leaves its hole on the sheet with how far off centre it
 * landed, in tenths of a mm, as an inspector would note it. Twenty seconds;
 * the readout is hits, accuracy (hits per punch) and the average time to hit.
 */
import type { Game } from "../contract";

const ROUND = 20000;
const R = 13;
const HUES = ["amber", "green", "teal", "blue", "violet"] as const;
const TOP = 20;

const punch: Game = (ctx) => {
  const { g, colors, width: W, height: H, fonts } = ctx;
  let left = ROUND;
  let started = false;
  let done = false;
  let hits = 0;
  let shots = 0;
  let spent = 0;
  let made = 0;
  // The live mark: centre, age and lifetime in ms.
  let mark = { x: W / 2, y: H / 2 + 8, age: 0, life: 1 };
  let aim = { x: W / 2, y: H / 2 };
  const holes: { x: number; y: number; off: number; age: number; miss?: boolean }[] = [];
  let missed = 0;

  const next = () => {
    // 1.7 s at first, down to 1 s by the end of a round; a little longer under reduced motion.
    const life = Math.max(1000, 1700 - made++ * 30) * (ctx.reduced ? 1.25 : 1);
    let x: number;
    let y: number;
    do {
      x = R + 6 + Math.random() * (W - 2 * R - 12);
      y = TOP + R + 4 + Math.random() * (H - TOP - 2 * R - 8);
    } while (Math.hypot(x - mark.x, y - mark.y) < 50);
    mark = { x, y, age: 0, life };
  };
  const radius = () => R * (1 - mark.age / mark.life);

  const plural = () => `${hits} hit${hits === 1 ? "" : "s"}`;
  const stats = () => `${plural()} · ${shots ? Math.round((hits / shots) * 100) : 0}% · ${hits ? Math.round(spent / hits) : 0} ms`;

  const shoot = (x: number, y: number) => {
    if (done) return;
    // The first punch only starts the clock, wherever it lands.
    if (!started) {
      started = true;
      ctx.play("tap", { x });
      return next();
    }
    shots++;
    const off = Math.hypot(x - mark.x, y - mark.y);
    if (off <= Math.max(radius(), 3) + 1.5) {
      hits++;
      spent += mark.age;
      holes.push({ x, y, off, age: 0 });
      ctx.play("pop", { x });
      ctx.score(hits, plural());
      next();
    } else {
      holes.push({ x, y, off, age: 0, miss: true });
      ctx.play("error", { x });
    }
    if (holes.length > 12) holes.shift();
  };

  ctx.onPointer((type, x, y) => {
    aim = { x, y };
    if (type === "down") shoot(x, y);
  });
  ctx.onKey((key, down, event) => down && key === "action" && !event.repeat && shoot(aim.x, aim.y));

  ctx.frame((dt) => {
    if (!done) {
      // Arrows steer the punch, 200 units a second: quick, so a keyboard round is playable too.
      const axis = (plus: "right" | "down", minus: "left" | "up") => dt * 0.2 * (Number(ctx.held(plus)) - Number(ctx.held(minus)));
      aim = { x: Math.min(W, Math.max(0, aim.x + axis("right", "left"))), y: Math.min(H, Math.max(TOP, aim.y + axis("down", "up"))) };
    }
    if (started && !done) {
      left -= dt;
      mark.age += dt;
      if (mark.age >= mark.life) {
        missed++;
        ctx.play("tick", { x: mark.x });
        next();
      }
      for (const h of holes) h.age += dt;
      if (left <= 0) {
        left = 0;
        done = true;
        ctx.play("success");
        const acc = shots ? Math.round((hits / shots) * 100) : 0;
        ctx.over(`${plural()}, ${acc}% accuracy, ${hits ? Math.round(spent / hits) : 0} ms average; ${missed} got away.`);
      }
    }

    g.clearRect(0, 0, W, H);
    g.textBaseline = "middle";
    // Time left as a scale across the top.
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= 20; i++) {
      g.moveTo(8 + i * 11.2, 6);
      g.lineTo(8 + i * 11.2, i % 5 ? 9 : 11);
    }
    g.stroke();
    g.fillStyle = left < 5000 ? colors.accent : colors.ink;
    g.fillRect(8, 5, (W - 16) * (left / ROUND), 1.5);
    g.font = `8px ${fonts.mono}`;
    g.textAlign = "right";
    g.fillStyle = colors.muted;
    g.fillText(stats(), W - 8, 16);
    g.textAlign = "left";
    g.fillText(`${Math.ceil(left / 1000)} s`, 8, 16);

    // Holes already punched, each with its offset from the true centre; misses as a small cross.
    g.textAlign = "left";
    for (const h of holes) {
      g.globalAlpha = Math.max(0.35, 1 - h.age / 3000);
      if (h.miss) {
        g.strokeStyle = colors.accent;
        g.beginPath();
        g.moveTo(h.x - 3, h.y - 3);
        g.lineTo(h.x + 3, h.y + 3);
        g.moveTo(h.x + 3, h.y - 3);
        g.lineTo(h.x - 3, h.y + 3);
        g.stroke();
      } else {
        g.fillStyle = colors.ink;
        g.beginPath();
        g.arc(h.x, h.y, 2.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = colors.muted;
        g.fillText(`${(h.off / 10).toFixed(1)}`, h.x + 5, h.y - 5);
      }
    }
    g.globalAlpha = 1;

    // The centre mark: a full-size dashed ring for where it started, its live circle, the crosshair.
    if (!done) {
      const color = colors[HUES[made % HUES.length]!];
      const r = radius();
      g.strokeStyle = colors.line;
      g.setLineDash([2, 2]);
      g.beginPath();
      g.arc(mark.x, mark.y, R, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = color;
      g.beginPath();
      g.arc(mark.x, mark.y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = colors.ink;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(mark.x - R - 4, mark.y);
      g.lineTo(mark.x + R + 4, mark.y);
      g.moveTo(mark.x, mark.y - R - 4);
      g.lineTo(mark.x, mark.y + R + 4);
      g.stroke();
    }

    // The punch: the player's own crosshair.
    g.strokeStyle = colors.signal;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(aim.x, aim.y, 4, 0, Math.PI * 2);
    g.moveTo(aim.x - 8, aim.y);
    g.lineTo(aim.x - 5, aim.y);
    g.moveTo(aim.x + 5, aim.y);
    g.lineTo(aim.x + 8, aim.y);
    g.moveTo(aim.x, aim.y - 8);
    g.lineTo(aim.x, aim.y - 5);
    g.moveTo(aim.x, aim.y + 5);
    g.lineTo(aim.x, aim.y + 8);
    g.stroke();

    if (!started) {
      g.textAlign = "center";
      g.font = `11px ${fonts.mono}`;
      g.fillStyle = colors.muted;
      g.fillText("click or press space to start", W / 2, H - 12);
    }
  });

  return () => {};
};

export default punch;
