/**
 * "Ruler and rivet": table tennis on the drawing board. You hold a steel rule
 * (ticked like the page's dimension lines); the drafting machine opposite
 * holds its protractor head. The ball is a rivet. First to five. The machine
 * gets a little quicker with every point you take, and it misjudges sharp
 * angles, so it can always be beaten.
 */
import type { Game } from "../contract";

const WIN = 5;
const PH = 36;
const PW = 6;
const BALL = 3.5;

const pong: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const you = { y: H / 2, score: 0 };
  const cpu = { y: H / 2, score: 0, aim: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 0 };
  let serve = 900;
  let shake = 0;
  let pointer: number | null = null;
  let serveTo = 1;

  const launch = (toward: number) => {
    const angle = (Math.random() * 0.8 - 0.4) * Math.PI * 0.5;
    ball.speed = ctx.reduced ? 100 : 120;
    Object.assign(ball, { x: W / 2, y: H / 2, vx: Math.cos(angle) * ball.speed * toward, vy: Math.sin(angle) * ball.speed });
  };
  const point = (yours: boolean) => {
    if (yours) you.score++;
    else cpu.score++;
    ctx.play(yours ? "success" : "error", { x: yours ? W : 0 });
    ctx.score(you.score, `${you.score}–${cpu.score}`);
    shake = 1;
    // Back to the centre at once: left outside the frame it would score again on every frame (and on the final repaint).
    Object.assign(ball, { x: W / 2, y: H / 2, vx: 0, vy: 0 });
    if (you.score === WIN || cpu.score === WIN) {
      ctx.play("gameOver");
      return ctx.over(you.score === WIN ? `You win, ${you.score} to ${cpu.score}.` : `The machine wins, ${cpu.score} to ${you.score}.`);
    }
    serve = 700;
    // The loser of the point serves next: the ball goes towards them.
    serveTo = yours ? 1 : -1;
  };

  const hit = (paddleY: number, side: 1 | -1) => {
    const offset = Math.max(-1, Math.min(1, (ball.y - paddleY) / (PH / 2)));
    ball.speed = Math.min(ball.speed * 1.06, ctx.reduced ? 170 : 230);
    const angle = offset * (Math.PI / 3.4);
    ball.vx = Math.cos(angle) * ball.speed * side;
    ball.vy = Math.sin(angle) * ball.speed;
    ctx.play("bounce", { x: ball.x });
    // The machine aims at a slightly wrong spot each rally; sharper shots fool it more.
    cpu.aim = (Math.random() - 0.5) * (14 + Math.abs(offset) * 26);
  };

  ctx.onPointer((type, _x, y) => {
    if (type === "move" || type === "down") pointer = y;
  });
  ctx.onKey((key) => key && (pointer = null));

  ctx.frame((dt) => {
    const s = dt / 1000;
    // You: pointer follows directly; arrows move at a steady speed.
    if (pointer !== null) you.y += (pointer - you.y) * Math.min(1, s * 18);
    if (ctx.held("up")) you.y -= 190 * s;
    if (ctx.held("down")) you.y += 190 * s;
    you.y = Math.max(PH / 2, Math.min(H - PH / 2, you.y));

    // The machine tracks the rivet only on its half, at a capped speed that rises with your points.
    const target = ball.vx > 0 && ball.x > W * 0.3 ? ball.y + cpu.aim : H / 2;
    const reach = (70 + you.score * 14) * s;
    cpu.y += Math.max(-reach, Math.min(reach, target - cpu.y));
    cpu.y = Math.max(PH / 2, Math.min(H - PH / 2, cpu.y));

    if (serve > 0 && dt) {
      serve -= dt;
      if (serve <= 0) launch(serveTo);
    }
    ball.x += ball.vx * s;
    ball.y += ball.vy * s;
    if (ball.y < BALL || ball.y > H - BALL) {
      ball.y = Math.max(BALL, Math.min(H - BALL, ball.y));
      ball.vy *= -1;
      ctx.play("tick", { x: ball.x });
    }
    if (ball.vx < 0 && ball.x - BALL < 12 + PW && ball.x > 8 && Math.abs(ball.y - you.y) < PH / 2 + BALL) {
      ball.x = 12 + PW + BALL;
      hit(you.y, 1);
    }
    if (ball.vx > 0 && ball.x + BALL > W - 12 - PW && ball.x < W - 8 && Math.abs(ball.y - cpu.y) < PH / 2 + BALL) {
      ball.x = W - 12 - PW - BALL;
      hit(cpu.y, -1);
    }
    if (ball.x < -BALL * 2) point(false);
    else if (ball.x > W + BALL * 2) point(true);
    shake = Math.max(0, shake - s * 4);

    g.clearRect(0, 0, W, H);
    // Centre line: the section rule, dashed, with a registration mark.
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.setLineDash([4, 5]);
    g.beginPath();
    g.moveTo(W / 2, 0);
    g.lineTo(W / 2, H);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(W / 2 - 5, H / 2);
    g.lineTo(W / 2 + 5, H / 2);
    g.stroke();

    g.font = `24px ${ctx.fonts.pixel}`;
    g.textAlign = "center";
    g.fillStyle = colors.muted;
    const nudge = ctx.reduced ? 0 : shake * 3;
    g.fillText(String(you.score), W / 2 - 24, 30 - nudge);
    g.fillText(String(cpu.score), W / 2 + 24, 30 - nudge);
    g.font = `9px ${ctx.fonts.mono}`;
    g.fillText("you", W / 2 - 24, 42);
    g.fillText("machine", W / 2 + 24, 42);

    // Your steel rule: a bar with ticks every 4 units, in the signal colour.
    g.fillStyle = colors.signal;
    g.fillRect(12, you.y - PH / 2, PW, PH);
    g.fillStyle = colors.paper;
    for (let t = 4; t < PH; t += 4) g.fillRect(12 + (t % 12 ? 3 : 1), you.y - PH / 2 + t, PW, 1);

    // The machine's protractor head: an L of two arms and a pivot.
    const cx = W - 12 - PW;
    g.strokeStyle = colors.ink;
    g.lineWidth = 1.5;
    g.strokeRect(cx + 0.75, cpu.y - PH / 2 + 0.75, PW - 1.5, PH - 1.5);
    g.beginPath();
    g.moveTo(cx + PW, cpu.y);
    g.lineTo(W, cpu.y);
    g.arc(cx + PW / 2, cpu.y, 2, 0, Math.PI * 2);
    g.stroke();

    // The rivet: an amber disc with a cross head.
    if (serve <= 0 || Math.floor(serve / 120) % 2 || ctx.reduced) {
      g.fillStyle = colors.amber;
      g.beginPath();
      g.arc(ball.x, ball.y, BALL, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = colors.ink;
      g.lineWidth = 1;
      g.stroke();
    }
    if (!you.score && !cpu.score && serve > 0) {
      g.font = `10px ${ctx.fonts.mono}`;
      g.fillStyle = colors.muted;
      g.fillText("mouse or arrows · first to five", W / 2, H - 14);
    }
  });

  ctx.score(0, "0–0");
  return () => {};
};

export default pong;
