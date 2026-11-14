/**
 * "Signal lamp": a lamp on a control panel. Wait for it to light, then press.
 * Five tries; the gauge under it is a dimension scale from 0 to 600 ms with
 * xflow's own number marked on it: xflow returns text a median 255 ms after
 * you stop speaking (its published benchmark). Can you beat the daemon?
 */
import type { Game } from "../contract";

const TRIES = 5;
const XFLOW = 255;
const MAX = 600;

const reaction: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  type State = "idle" | "wait" | "lit" | "early" | "shown";
  let state: State = "idle";
  let wait = 0;
  let litAt = 0;
  let lastNow = 0;
  let pulse = 0;
  const times: number[] = [];
  const average = () => Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  const arm = () => {
    state = "wait";
    // 1.2 to 3.4 s, counted in frame time so a pause freezes it.
    wait = 1200 + Math.random() * 2200;
  };
  const press = (stamp: number) => {
    if (state === "idle" || state === "shown" || state === "early") return arm(), ctx.play("tap");
    if (state === "wait") {
      state = "early";
      ctx.play("error");
      ctx.announce("Too soon. Press to try again.");
      return;
    }
    // Lit: the event's own time stamp against the frame that lit the lamp.
    const ms = Math.max(1, Math.round(stamp - litAt));
    times.push(ms);
    pulse = 1;
    ctx.play(ms < XFLOW ? "success" : "tap");
    ctx.score(average(), `${average()} ms`);
    if (times.length === TRIES) {
      state = "shown";
      ctx.over(`Average ${average()} ms. xflow takes ${XFLOW}.`);
    } else state = "shown";
  };
  ctx.onKey((key, down, event) => key === "action" && down && !event.repeat && press(event.timeStamp));
  ctx.onPointer((type, _x, _y, event) => type === "down" && press(event.timeStamp));

  const scaleX = (ms: number) => 24 + (Math.min(ms, MAX) / MAX) * (W - 48);

  ctx.frame((dt, now) => {
    lastNow = now;
    if (state === "wait" && dt) {
      wait -= dt;
      if (wait <= 0) {
        state = "lit";
        litAt = lastNow;
        ctx.play("tick");
      }
    }
    pulse = Math.max(0, pulse - dt / 300);

    g.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = 64;
    // Panel plate with four screws.
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.strokeRect(cx - 52.5, cy - 44.5, 105, 89);
    for (const [sx, sy] of [[-46, -38], [46, -38], [-46, 38], [46, 38]] as const) {
      g.beginPath();
      g.arc(cx + sx, cy + sy, 2.5, 0, Math.PI * 2);
      g.moveTo(cx + sx - 2, cy + sy);
      g.lineTo(cx + sx + 2, cy + sy);
      g.stroke();
    }
    // The lamp: bezel, then the glass. Lit is filled; early is red with a cross; waiting is hatched amber.
    const lit = state === "lit";
    g.lineWidth = 2;
    g.strokeStyle = colors.ink;
    g.beginPath();
    g.arc(cx, cy, 28, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 22 + (ctx.reduced ? 0 : pulse * 3), 0, Math.PI * 2);
    g.fillStyle = lit ? colors.green : state === "early" ? colors.accent : colors.paper;
    g.fill();
    if (state === "wait") {
      g.save();
      g.clip();
      g.strokeStyle = colors.amber;
      g.lineWidth = 1;
      for (let d = -44; d < 44; d += 5) {
        g.beginPath();
        g.moveTo(cx + d, cy + 22);
        g.lineTo(cx + d + 44, cy - 22);
        g.stroke();
      }
      g.restore();
    }
    if (state === "early") {
      g.strokeStyle = colors.paper;
      g.beginPath();
      g.moveTo(cx - 8, cy - 8);
      g.lineTo(cx + 8, cy + 8);
      g.moveTo(cx + 8, cy - 8);
      g.lineTo(cx - 8, cy + 8);
      g.stroke();
    }

    g.textAlign = "center";
    g.font = `11px ${ctx.fonts.mono}`;
    g.fillStyle = state === "early" ? colors.accent : colors.ink;
    const label = {
      idle: "press space or click to arm",
      wait: "wait for it…",
      lit: "now!",
      early: "too soon · press to retry",
      shown: times.length === TRIES ? `average ${average()} ms` : `${times.at(-1)} ms · press for the next`,
    }[state];
    g.fillText(label, cx, cy + 62);

    // The gauge: a dimension scale, a tick every 100 ms, xflow's 255 ms marked, your tries as dots.
    const y = H - 24;
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(scaleX(0), y);
    g.lineTo(scaleX(MAX), y);
    for (let ms = 0; ms <= MAX; ms += 100) {
      g.moveTo(scaleX(ms), y - 3);
      g.lineTo(scaleX(ms), y + 3);
    }
    g.stroke();
    g.font = `8px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.fillText("0", scaleX(0), y + 13);
    g.fillText("600 ms", scaleX(MAX) - 8, y + 13);
    g.strokeStyle = colors.violet;
    g.beginPath();
    g.moveTo(scaleX(XFLOW), y - 8);
    g.lineTo(scaleX(XFLOW), y + 8);
    g.stroke();
    g.fillStyle = colors.violet;
    g.fillText("xflow 255", scaleX(XFLOW), y - 11);
    times.forEach((ms, i) => {
      g.fillStyle = i === times.length - 1 ? colors.signal : colors.ink;
      g.beginPath();
      g.arc(scaleX(ms), y, i === times.length - 1 ? 3.5 : 2.5, 0, Math.PI * 2);
      g.fill();
    });
    g.textAlign = "left";
    g.fillStyle = colors.muted;
    g.fillText(`try ${Math.min(times.length + (state === "shown" ? 0 : 1), TRIES)}/${TRIES}`, 8, 12);
  });

  return () => {};
};

export default reaction;
