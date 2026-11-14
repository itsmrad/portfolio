/**
 * The brick breaker engine, as an arcade game (components/arcade/contract.ts).
 * The 404 runs it on an 800x600 field; the arcade runs it as "Title block" in
 * a margin cartridge. Same rules in both: the classic arcade numbers the
 * catalog picked (a 21px ball at speed 10, a 96x24 paddle at speed 16, 24px
 * brick rows, 10 points a brick), drawn as a blueprint: hatched, outlined
 * bricks on the page's own colours.
 *
 * Deviations, for play: the ball is served upward (within 30 degrees of
 * vertical), so the player has time to reach it; the paddle steers the ball by
 * where it is hit; the simulation runs at a fixed 60 steps a second whatever
 * the display's refresh rate; the canvas is only redrawn when something moved.
 */
import type { SoundName } from "@/lib/sound";
import type { Colors, Game } from "@/components/arcade/contract";

export type GameCopy = {
  label: string;
  start: string;
  paused: string;
  cleared: string;
  /** Announced when a board is cleared. */
  clearedNote: string;
  /** Announced when the ball is lost, followed by the score. */
  lost: string;
};

/** A brick in field units, with an optional label and palette hue (arcade only). */
export type Brick = { x: number; y: number; w: number; h: number; label?: string; hue?: keyof Colors; hit?: number };

type Options = {
  boards: (() => Brick[])[];
  copy: Pick<GameCopy, "start" | "cleared" | "clearedNote" | "lost"> & { paused?: string };
  /** The 404: given a function that pauses play mid-rally (tab hidden, scrolled away); Space resumes. */
  onPause?: (pause: () => void) => void;
  /** Balls before the round is over; endless on the 404. */
  lives?: number;
  /** Arcade cartridge: score in the shell's readout, larger prompt, wider paddle, coloured bricks. */
  cartridge?: boolean;
};

const W = 800;
const H = 600;
const BALL = 21;
const R = BALL / 2;
const PADDLE_H = 24;
const PADDLE_SPEED = 16;
const BRICK_H = 24;
const SCORE = 10;

/** The 404's boards: a character grid, each X a column of `rows` bricks `brick` wide. */
export const grid = (brick: number, rows: number, pattern: string[]) => () => {
  const x0 = (W - pattern[0]!.length * brick) / 2;
  const bricks: Brick[] = [];
  pattern.forEach((line, py) =>
    [...line].forEach((cell, px) => {
      if (cell !== "X") return;
      for (let dy = 0; dy < rows; dy++) bricks.push({ x: x0 + px * brick, y: (1 + py * rows + dy) * BRICK_H, w: brick, h: BRICK_H });
    }),
  );
  return bricks;
};

export function breakout({ boards, copy, lives = Infinity, cartridge = false, onPause }: Options): Game {
  return (ctx) => {
    const { g } = ctx;
    const k = ctx.width / W;
    const speed = () => (ctx.reduced ? 7 : 10) + (cartridge ? Math.min(3, (board - 1) * 0.75) : 0);
    const PADDLE_W = cartridge ? 150 : 96;

    let board = 0;
    let bricks: Brick[] = [];
    let score = 0;
    let balls = lives;
    let running = false;
    let paused = false;
    let paddle = W / 2 - PADDLE_W / 2;
    const ball = { x: W / 2, y: H * 0.6, vx: 0, vy: 0 };
    let dirty = true;

    const layout = () => {
      bricks = boards[board % boards.length]!();
      if (!cartridge) score = 0;
      board++;
    };

    const resetBall = () => {
      const angle = (Math.random() * 2 - 1) * (Math.PI / 6);
      Object.assign(ball, { x: W / 2, y: H * 0.6, vx: speed() * Math.sin(angle), vy: -speed() * Math.cos(angle) });
      dirty = true;
    };

    const sound = (name: SoundName) => ctx.play(name, { x: ball.x * k });

    // 315-degree hairline hatch, the same as the page's `hatch` utility; rebuilt when the theme changes.
    let hatch: CanvasPattern | null = null;
    const makeHatch = () => {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 8;
      const t = tile.getContext("2d")!;
      t.strokeStyle = ctx.colors.line;
      t.beginPath();
      t.moveTo(0, 8);
      t.lineTo(8, 0);
      t.moveTo(-1, 1);
      t.lineTo(1, -1);
      t.moveTo(7, 9);
      t.lineTo(9, 7);
      t.stroke();
      hatch = g.createPattern(tile, "repeat");
    };
    makeHatch();
    ctx.onTheme(makeHatch);

    const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) => {
      g.font = `${size}px ${ctx.fonts.pixel}`;
      g.fillStyle = color;
      g.textAlign = align;
      g.fillText(value, x, y);
    };

    // Field units are 0.8 CSS px in the 404's 640px column: 20 units is the column's 16px inset.
    const draw = () => {
      const c = ctx.colors;
      dirty = false;
      g.clearRect(0, 0, ctx.width, ctx.height);
      g.save();
      g.scale(k, k);
      g.textBaseline = "top";
      if (!cartridge) text(String(score).padStart(3, "0"), 20, 20, 20, c.ink, "left");
      // Balls left, as small rings in the corner.
      if (Number.isFinite(lives)) for (let i = 0; i < balls; i++) {
        g.strokeStyle = c.muted;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(W - 30 - i * 40, 26, 10, 0, Math.PI * 2);
        g.stroke();
      }

      if (!bricks.length) {
        g.textBaseline = "middle";
        text(copy.cleared, W / 2, H / 2, cartridge ? 120 : 80, c.ink, "center");
        g.restore();
        return;
      }

      for (const brick of bricks) {
        const flash = brick.hit !== undefined;
        const { x, y, w, h } = brick;
        g.fillStyle = flash ? c.signal : brick.hue ? c[brick.hue] : c.paper;
        g.fillRect(x + 2, y + 2, w - 4, h - 4);
        if (!flash && hatch) {
          g.fillStyle = hatch;
          g.fillRect(x + 2, y + 2, w - 4, h - 4);
        }
        g.strokeStyle = brick.hue ? c.ink : c.muted;
        g.lineWidth = cartridge ? 4 : 1.25;
        g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
        if (brick.label && !flash) {
          g.textBaseline = "top";
          text(brick.label, x + 14, y + 12, 26, c.paper, "left");
        }
      }

      // Paddle: a solid bar with two dimension ticks.
      g.fillStyle = c.ink;
      g.beginPath();
      g.roundRect(paddle, H - PADDLE_H, PADDLE_W, PADDLE_H, 4);
      g.fill();
      g.fillStyle = c.paper;
      g.fillRect(paddle + 16, H - PADDLE_H + 6, 2, PADDLE_H - 12);
      g.fillRect(paddle + PADDLE_W - 18, H - PADDLE_H + 6, 2, PADDLE_H - 12);

      g.fillStyle = cartridge ? c.signal : c.ink;
      g.beginPath();
      g.arc(ball.x, ball.y, R * (cartridge ? 1.4 : 1), 0, Math.PI * 2);
      g.fill();

      if (!running) {
        g.textBaseline = "middle";
        text(paused && copy.paused ? copy.paused : copy.start, W / 2, H * 0.6 + (cartridge ? 70 : 40), cartridge ? 36 : 15, c.muted, "center");
      }
      g.restore();
    };

    const step = (now: number) => {
      const before = paddle;
      if (ctx.held("left")) paddle -= PADDLE_SPEED;
      if (ctx.held("right")) paddle += PADDLE_SPEED;
      paddle = Math.min(W - PADDLE_W, Math.max(0, paddle));
      const flashing = bricks.some((brick) => brick.hit !== undefined);
      if (flashing) bricks = bricks.filter((brick) => brick.hit === undefined || now - brick.hit < 120);
      if (paddle !== before || flashing) dirty = true;
      if (!running) return;
      dirty = true;

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < R || ball.x > W - R) {
        ball.x = Math.min(W - R, Math.max(R, ball.x));
        ball.vx *= -1;
        sound("bounce");
      }
      if (ball.y < R) {
        ball.y = R;
        ball.vy *= -1;
        sound("bounce");
      }
      if (ball.y > H) {
        running = false;
        sound("gameOver");
        resetBall();
        if (--balls <= 0) return ctx.over(`${copy.lost} ${score}.`);
        ctx.announce(`${copy.lost} ${score}.`);
        return;
      }

      const top = H - PADDLE_H;
      if (ball.vy > 0 && ball.y + R > top && ball.y < top + PADDLE_H && ball.x + R > paddle && ball.x - R < paddle + PADDLE_W) {
        // Where the ball lands on the paddle steers it, up to 60 degrees off vertical.
        const offset = Math.max(-1, Math.min(1, (ball.x - (paddle + PADDLE_W / 2)) / (PADDLE_W / 2)));
        const angle = offset * (Math.PI / 3);
        ball.vx = speed() * Math.sin(angle);
        ball.vy = -speed() * Math.cos(angle);
        ball.y = top - R;
        sound("bounce");
      }

      let hit = false;
      for (const brick of bricks) {
        if (brick.hit !== undefined) continue;
        if (ball.x + R > brick.x && ball.x - R < brick.x + brick.w && ball.y - R < brick.y + brick.h && ball.y + R > brick.y) {
          hit = true;
          score += SCORE;
          // The broken brick flashes in the signal colour for a moment, unless motion is reduced.
          if (ctx.reduced) bricks = bricks.filter((other) => other !== brick);
          else brick.hit = now;
          sound("break");
        }
      }
      if (hit) {
        ball.vy *= -1;
        if (cartridge) ctx.score(score);
      }
      if (!bricks.some((brick) => brick.hit === undefined)) {
        bricks = [];
        running = false;
        if (cartridge) sound("success");
        ctx.announce(copy.clearedNote);
      }
    };

    // Launch, resume, or move on to the next board.
    const action = () => {
      dirty = true;
      if (!bricks.length) {
        layout();
        resetBall();
        running = false;
      } else if (!running) {
        if (!paused) resetBall();
        paused = false;
        running = true;
      }
    };
    onPause?.(() => {
      if (!running) return;
      running = false;
      paused = true;
      dirty = true;
    });

    let lag = 0;
    ctx.frame((dt, now) => {
      lag = Math.min(lag + dt, 100);
      while (lag >= 1000 / 60) {
        step(now);
        lag -= 1000 / 60;
      }
      if (dirty || !dt) draw();
    });
    ctx.onPointer((type, x) => {
      if (type === "down") action();
      paddle = Math.min(W - PADDLE_W, Math.max(0, x / k - PADDLE_W / 2));
      dirty = true;
    });
    ctx.onKey((key, down, event) => key === "action" && down && !event.repeat && action());

    layout();
    resetBall();
    if (cartridge) ctx.score(0);
    return () => {};
  };
}
