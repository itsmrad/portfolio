/**
 * The 404 brick breaker, on a plain 2D canvas. The rules and numbers are the
 * classic arcade ones the catalog picked: an 800x600 field, a 21px ball at
 * speed 10, a 96x24 paddle at speed 16, 24px brick rows, 10 points a brick.
 * The board spells the AD monogram, then "404". Drawn as a blueprint: hatched,
 * outlined bricks on the page's own colours, re-read when the theme changes.
 *
 * Deviations, for play: the ball is served upward (within 30 degrees of
 * vertical), so the player has time to reach it; the paddle steers the ball by
 * where it is hit; the simulation runs at a fixed 60 steps a second whatever
 * the display's refresh rate; the canvas is only redrawn when something moved.
 */
import { play, type SoundName } from "@/lib/sound";

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

const W = 800;
const H = 600;
const BALL = 21;
const R = BALL / 2;
const PADDLE_W = 96;
const PADDLE_H = 24;
const PADDLE_SPEED = 16;
const BRICK_H = 24;
const SCORE = 10;

type Board = { brick: number; rows: number; pattern: string[] };
const BOARDS: Board[] = [
  {
    brick: 80,
    rows: 2,
    pattern: [".XX..XXX.", "X..X.X..X", "XXXX.X..X", "X..X.X..X", "X..X.X..X", "X..X.XXX."],
  },
  {
    brick: 56,
    rows: 2,
    pattern: ["X.X.XXX.X.X", "X.X.X.X.X.X", "XXX.X.X.XXX", "..X.X.X...X", "..X.XXX...X"],
  },
];

type Brick = { x: number; y: number; w: number; hit?: number };

/** Attaches the game to a canvas; returns a function that stops it and removes every listener. */
export function start(canvas: HTMLCanvasElement, copy: GameCopy, announce: (message: string) => void) {
  const g = canvas.getContext("2d")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const speed = () => (reduced.matches ? 7 : 10);

  let board = 0;
  let bricks: Brick[] = [];
  let score = 0;
  let running = false;
  let paused = false;
  let paddle = W / 2 - PADDLE_W / 2;
  const ball = { x: W / 2, y: H * 0.6, vx: 0, vy: 0 };
  const keys = { left: false, right: false };

  const layout = () => {
    const { brick, rows, pattern } = BOARDS[board % BOARDS.length]!;
    const x0 = (W - pattern[0]!.length * brick) / 2;
    bricks = [];
    pattern.forEach((line, py) =>
      [...line].forEach((cell, px) => {
        if (cell !== "X") return;
        for (let dy = 0; dy < rows; dy++) bricks.push({ x: x0 + px * brick, y: (1 + py * rows + dy) * BRICK_H, w: brick });
      }),
    );
    score = 0;
    board++;
  };

  const resetBall = () => {
    const angle = (Math.random() * 2 - 1) * (Math.PI / 6);
    Object.assign(ball, { x: W / 2, y: H * 0.6, vx: speed() * Math.sin(angle), vy: -speed() * Math.cos(angle) });
    dirty = true;
  };

  const sound = (name: SoundName) => {
    const box = canvas.getBoundingClientRect();
    play(name, { x: box.left + (ball.x / W) * box.width });
  };

  // Colours come from the page's tokens, so the figure follows light and dark.
  let colors: Record<"ink" | "muted" | "line" | "signal" | "paper", string>;
  let hatch: CanvasPattern | null = null;
  let font = "monospace";
  const readColors = () => {
    const read = (token: string) => {
      canvas.style.color = `var(${token})`;
      return getComputedStyle(canvas).color;
    };
    colors = {
      ink: read("--foreground"),
      muted: read("--muted-foreground"),
      line: read("--cross"),
      signal: read("--signal"),
      paper: read("--background"),
    };
    canvas.style.color = "";
    font = getComputedStyle(canvas).fontFamily;
    dirty = true;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 8;
    const t = tile.getContext("2d")!;
    t.strokeStyle = colors.line;
    t.lineWidth = 1;
    t.beginPath();
    // 315-degree hairline hatch, the same as the page's `hatch` utility.
    t.moveTo(0, 8);
    t.lineTo(8, 0);
    t.moveTo(-1, 1);
    t.lineTo(1, -1);
    t.moveTo(7, 9);
    t.lineTo(9, 7);
    t.stroke();
    hatch = g.createPattern(tile, "repeat");
  };

  let scale = 1;
  let dirty = true;
  const resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const { width } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(((width * H) / W) * dpr);
    scale = canvas.width / W;
    // Setting the size clears the canvas: paint again now, not on the next change.
    draw();
  };
  // Zoom, or a move to a screen with another pixel ratio, changes no CSS size: watch the ratio itself.
  let ratio: MediaQueryList | undefined;
  const watchRatio = () => {
    ratio?.removeEventListener("change", onRatio);
    ratio = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    ratio.addEventListener("change", onRatio);
  };
  const onRatio = () => {
    resize();
    watchRatio();
  };

  const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) => {
    g.font = `${size}px ${font}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(value, x, y);
  };

  // Field units are 0.8 CSS px in the 640px column: 20 units is the column's 16px inset.
  const draw = () => {
    dirty = false;
    g.setTransform(scale, 0, 0, scale, 0, 0);
    g.clearRect(0, 0, W, H);
    g.textBaseline = "top";
    text(String(score).padStart(3, "0"), 20, 20, 20, colors.ink, "left");

    if (!bricks.length) {
      g.textBaseline = "middle";
      text(copy.cleared, W / 2, H / 2, 80, colors.ink, "center");
      return;
    }

    for (const brick of bricks) {
      const flash = brick.hit !== undefined;
      g.fillStyle = flash ? colors.signal : colors.paper;
      g.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, BRICK_H - 4);
      if (!flash && hatch) {
        g.fillStyle = hatch;
        g.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, BRICK_H - 4);
      }
      g.strokeStyle = colors.muted;
      g.lineWidth = 1.25;
      g.strokeRect(brick.x + 2.5, brick.y + 2.5, brick.w - 5, BRICK_H - 5);
    }

    // Paddle: a solid bar with two dimension ticks.
    g.fillStyle = colors.ink;
    g.beginPath();
    g.roundRect(paddle, H - PADDLE_H, PADDLE_W, PADDLE_H, 4);
    g.fill();
    g.fillStyle = colors.paper;
    g.fillRect(paddle + 16, H - PADDLE_H + 6, 2, PADDLE_H - 12);
    g.fillRect(paddle + PADDLE_W - 18, H - PADDLE_H + 6, 2, PADDLE_H - 12);

    g.fillStyle = colors.ink;
    g.beginPath();
    g.arc(ball.x, ball.y, R, 0, Math.PI * 2);
    g.fill();

    if (!running) {
      g.textBaseline = "middle";
      text(paused ? copy.paused : copy.start, W / 2, H * 0.6 + 40, 15, colors.muted, "center");
    }
  };

  const step = (now: number) => {
    const before = paddle;
    if (keys.left) paddle -= PADDLE_SPEED;
    if (keys.right) paddle += PADDLE_SPEED;
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
      announce(`${copy.lost} ${score}.`);
      resetBall();
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
      if (ball.x + R > brick.x && ball.x - R < brick.x + brick.w && ball.y - R < brick.y + BRICK_H && ball.y + R > brick.y) {
        hit = true;
        score += SCORE;
        // The broken brick flashes in the signal colour for a moment, unless motion is reduced.
        if (reduced.matches) bricks = bricks.filter((other) => other !== brick);
        else brick.hit = now;
        sound("break");
      }
    }
    if (hit) ball.vy *= -1;
    if (!bricks.some((brick) => brick.hit === undefined)) {
      bricks = [];
      running = false;
      announce(copy.clearedNote);
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

  const pause = () => {
    if (running) {
      running = false;
      paused = true;
      dirty = true;
    }
  };

  let raf = 0;
  let visible = true;
  let last = 0;
  let lag = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    lag = Math.min(lag + now - (last || now), 100);
    last = now;
    while (lag >= 1000 / 60) {
      step(now);
      lag -= 1000 / 60;
    }
    if (dirty) draw();
  };
  const loop = (on: boolean) => {
    cancelAnimationFrame(raf);
    last = 0;
    if (on) raf = requestAnimationFrame(frame);
  };

  const onPointerMove = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    paddle = Math.min(W - PADDLE_W, Math.max(0, ((event.clientX - box.left) / box.width) * W - PADDLE_W / 2));
    dirty = true;
  };
  const onKey = (event: KeyboardEvent) => {
    const down = event.type === "keydown";
    if (event.key === "ArrowLeft") keys.left = down;
    else if (event.key === "ArrowRight") keys.right = down;
    else if (event.key === " " || event.key === "Enter") {
      if (down && !event.repeat) action();
    } else return;
    event.preventDefault();
  };
  const onBlur = () => {
    keys.left = keys.right = false;
  };
  const onVisibility = () => {
    if (document.hidden) pause();
    loop(!document.hidden && visible);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (!visible) pause();
    loop(visible && !document.hidden);
  });
  const theme = new MutationObserver(readColors);
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const sizer = new ResizeObserver(resize);

  readColors();
  layout();
  resetBall();
  resize();
  watchRatio();
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", action);
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("keyup", onKey);
  canvas.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  scheme.addEventListener("change", readColors);
  try {
    // Fires on pixel-ratio changes too (zoom, another screen), where supported.
    sizer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    sizer.observe(canvas);
  }
  observer.observe(canvas);
  // Pixel face for the score: draw again once it has loaded.
  document.fonts.load(`16px ${font}`).then(draw, () => {});

  return () => {
    loop(false);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("click", action);
    canvas.removeEventListener("keydown", onKey);
    canvas.removeEventListener("keyup", onKey);
    canvas.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    theme.disconnect();
    scheme.removeEventListener("change", readColors);
    sizer.disconnect();
    observer.disconnect();
    ratio?.removeEventListener("change", onRatio);
  };
}
