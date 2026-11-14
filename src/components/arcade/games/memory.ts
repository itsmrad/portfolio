/**
 * "Repeat after me": four registration marks, the crosshairs that sit on the
 * drawing's rules, set out like a compass. Each has its own place, colour,
 * arrow key and note from the site's name melody. Listen, then play it back;
 * every round adds one mark and plays a little faster.
 */
import type { Game } from "../contract";

const MARKS = [
  { key: "up", dx: 0, dy: -1, hue: "accent", note: 0 },
  { key: "right", dx: 1, dy: 0, hue: "amber", note: 2 },
  { key: "down", dx: 0, dy: 1, hue: "green", note: 4 },
  { key: "left", dx: -1, dy: 0, hue: "blue", note: 7 },
] as const;

const memory: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = 52;
  const sequence: number[] = [];
  let mode: "listen" | "play" | "miss" = "listen";
  let step = 0;
  let clock = -600;
  let lit = -1;
  let glow = 0;

  const flash = (mark: number) => {
    lit = mark;
    glow = 1;
    ctx.play("note", { index: MARKS[mark]!.note, x: cx + MARKS[mark]!.dx * R });
  };
  const grow = () => {
    sequence.push(Math.floor(Math.random() * 4));
    mode = "listen";
    step = 0;
    clock = -700;
  };
  // A note every 560 ms at first, down to 300 ms by round ten.
  const gap = () => Math.max(300, 560 - (sequence.length - 1) * 28) * (ctx.reduced ? 1.2 : 1);

  const press = (mark: number) => {
    if (mode !== "play") return;
    flash(mark);
    if (mark !== sequence[step]) {
      mode = "miss";
      lit = sequence[step]!;
      ctx.play("error");
      ctx.over(`Remembered ${sequence.length - 1}.`);
      return;
    }
    if (++step === sequence.length) {
      ctx.score(sequence.length);
      grow();
    }
  };

  ctx.onKey((key, down, event) => {
    if (!down || event.repeat) return;
    const mark = MARKS.findIndex((m) => m.key === key);
    if (mark >= 0) press(mark);
  });
  ctx.onPointer((type, x, y) => {
    if (type !== "down") return;
    let best = -1;
    let distance = 26;
    MARKS.forEach((m, i) => {
      const d = Math.hypot(x - (cx + m.dx * R), y - (cy + m.dy * R * 0.75));
      if (d < distance) [best, distance] = [i, d];
    });
    if (best >= 0) press(best);
  });

  ctx.frame((dt) => {
    if (mode === "listen" && dt) {
      clock += dt;
      if (clock >= 0) {
        if (step < sequence.length) {
          flash(sequence[step++]!);
          clock -= gap();
        } else {
          mode = "play";
          step = 0;
        }
      }
    }
    glow = Math.max(0, glow - dt / 260);
    if (!glow && mode !== "miss") lit = -1;

    g.clearRect(0, 0, W, H);
    // The compass's construction circle and axes.
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(cx, cy, R, R * 0.75, 0, 0, Math.PI * 2);
    g.moveTo(cx - R - 14, cy);
    g.lineTo(cx + R + 14, cy);
    g.moveTo(cx, cy - R * 0.75 - 14);
    g.lineTo(cx, cy + R * 0.75 + 14);
    g.stroke();

    MARKS.forEach((m, i) => {
      const x = cx + m.dx * R;
      const y = cy + m.dy * R * 0.75;
      const on = i === lit;
      const size = 13 + (on && !ctx.reduced ? glow * 3 : 0);
      // A crosshair and its ring; lit, the ring fills with the mark's colour.
      g.beginPath();
      g.arc(x, y, size * 0.62, 0, Math.PI * 2);
      g.fillStyle = on ? colors[m.hue] : colors.paper;
      g.fill();
      g.strokeStyle = on ? colors.ink : colors[m.hue];
      g.lineWidth = 1.5;
      g.stroke();
      g.beginPath();
      g.moveTo(x - size, y);
      g.lineTo(x + size, y);
      g.moveTo(x, y - size);
      g.lineTo(x, y + size);
      g.strokeStyle = colors.ink;
      g.lineWidth = 1;
      g.stroke();
    });

    g.textAlign = "center";
    g.font = `20px ${ctx.fonts.pixel}`;
    g.fillStyle = mode === "miss" ? colors.accent : colors.ink;
    g.fillText(String(sequence.length).padStart(2, "0"), cx, cy + 7);
    g.font = `10px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.fillText(mode === "listen" ? "listen…" : mode === "play" ? "your turn · arrows or click" : "that was the one", cx, H - 8);
  });

  grow();
  return () => {};
};

export default memory;
