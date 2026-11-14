/**
 * "Play my contributions": the Activity section's calendar becomes the
 * playfield. A canvas is laid exactly over the server-rendered graph (same
 * units, same squares, so the first frame is the graph), a sheet unrolls below
 * it, and the year's active days lift out of the graph a stretch at a time to
 * form up and dive at a ship on the bottom edge. A day takes as many hits as
 * its level and scores its real contribution count. At the end every day flies
 * back to its square and the canvas lifts away, leaving the graph untouched.
 *
 * Loaded by the section's effects (sections/effects.ts) on the button press;
 * nothing here runs before. Data comes from the calendar's own markup
 * (data-counts, the per-level paths); no fetch. Loop, input, pausing, sound and
 * Esc come from the arcade host.
 */
import { host } from "../host";

const PITCH = 12;
const GH = 7 * PITCH - 2;
const DAY = 86_400_000;
const WAVES = 6;
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const out = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;

type Cell = { x: number; y: number; level: number; count: number; i: number; week: number; day: number };
type State = "lift" | "home" | "dive" | "enter" | "back" | "rest" | "dead";
type Foe = { c: Cell; hp: number; state: State; t: number; delay: number; x: number; y: number; fx: number; fy: number; flash: number; path: number[]; shot: boolean };
type Bit = { x: number; y: number; vx: number; vy: number; t: number; color: string; text?: string };

let close: (() => void) | undefined;

export function toggle(button: HTMLElement) {
  if (close) return close();
  const days = document.querySelector<HTMLElement>("[data-calendar]");
  const svg = days?.querySelector("svg");
  const calendar = days?.parentElement;
  if (!days || !svg || !calendar) return;

  // The graph as rendered: one zero-length square-capped stroke per day, a path per level.
  const counts = days.dataset.counts!.split(",").map(Number);
  const start = Date.parse(days.dataset.calendar!);
  const offset = new Date(start).getUTCDay();
  const paths = [...svg.querySelectorAll<SVGPathElement>("path[data-level]")];
  const cells: Cell[] = [];
  for (const path of paths)
    for (const [, sx, sy] of path.getAttribute("d")!.matchAll(/M(\d+) (\d+)/g)) {
      const week = (+sx! - 5) / PITCH;
      const day = (+sy! - 5) / PITCH;
      const i = week * 7 + day - offset;
      cells.push({ x: +sx! - 5, y: +sy! - 5, level: Number(path.dataset.level), count: counts[i] ?? 0, i, week, day });
    }
  const active = cells.filter((c) => c.level).sort((a, b) => a.i - b.i);
  const size = Math.ceil(active.length / WAVES);
  const waves = Array.from({ length: Math.ceil(active.length / size) }, (_, n) => active.slice(n * size, n * size + size));
  if (!waves.length) return;
  const total = counts.reduce((a, b) => a + b, 0);
  const label = (wave: Cell[]) => {
    const [a, b] = [wave[0]!, wave.at(-1)!].map((c) => month.format(start + c.i * DAY).toLowerCase());
    return a === b ? a : `${a} – ${b}`;
  };

  // Units are the graph's own; u is one CSS pixel in them, so text and strokes keep their size on a phone.
  const W = svg.viewBox.baseVal.width;
  const u = W / svg.getBoundingClientRect().width;
  const P = Math.max(22, 15 * u);
  const TOP = GH + 26 * u;
  const H = Math.round(TOP + 7 * P + Math.max(96, 90 * u));
  const S = P * 0.78;
  const shipY = H - 16 * u;

  const wrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const status = document.createElement("p");
  const row = calendar.nextElementSibling as HTMLElement | null;
  wrap.dataset.game = "contributions";
  wrap.style.cssText = `position:absolute;left:0;right:0;z-index:3;top:${svg.getBoundingClientRect().top - calendar.getBoundingClientRect().top}px`;
  // The page accent, as the arcade palette names it (R19): a hit, the last life.
  wrap.style.setProperty("--arcade-accent", "var(--accent)");
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Contributions game. Arrows or the mouse move, Space or click fires; on a phone drag to steer, it fires by itself. Esc returns to the graph.");
  canvas.style.cssText = `display:block;width:100%;aspect-ratio:${W}/${H};touch-action:none;outline:none;cursor:crosshair`;
  status.className = "sr-only";
  status.setAttribute("role", "status");
  wrap.append(canvas, status);
  calendar.append(wrap);
  if (row) row.inert = true;
  button.setAttribute("aria-expanded", "true");

  let running = false;
  const h = host(canvas, {
    width: W,
    height: H,
    exclusive: true,
    pauseOnBlur: true,
    announce: (text) => (status.textContent = text),
    onEscape: () => close?.(),
    onRunning: (on) => {
      running = on;
      h?.repaint();
    },
  });
  const ctx = h.ctx;
  const { g, colors, reduced } = ctx;
  let shades: string[] = [];
  const readShades = () => (shades = paths.map((path) => getComputedStyle(path).stroke));
  readShades();
  ctx.onTheme(readShades);
  let best = 0;
  try {
    best = JSON.parse(localStorage.getItem("arcade:contributions") ?? "{}").v ?? 0;
  } catch {
    // Storage blocked: no best to show.
  }

  let phase: "open" | "lift" | "play" | "clear" | "over" | "close" = "open";
  let clock = 0;
  let time = 0;
  let wave = 0;
  let foes: Foe[] = [];
  let score = 0;
  let shown = 0;
  let bump = 0;
  let lives = 3;
  let gone = 0;
  let safe = 0;
  let x = W / 2;
  let target: number | null = null;
  let firing = false;
  let touch = matchMedia("(pointer: coarse)").matches;
  let cool = 0;
  let diveClock = 0;
  let bombClock = 0;
  let won = false;
  let record = false;
  let unroll = reduced ? 1 : 0;
  let shots: { x: number; y: number }[] = [];
  let bombs: { x: number; y: number; vx: number }[] = [];
  let bits: Bit[] = [];
  const cleared = new Set<Cell>();

  const say = (text: string) => ctx.announce(text);
  const span = () => {
    const weeks = foes.map((f) => f.c.week);
    return [Math.min(...weeks), Math.max(...weeks)] as const;
  };
  // Where a day sits in the formation: its real week and weekday, swaying and breathing a little.
  const slot = (f: Foe) => {
    const [a, b] = span();
    const room = (W - (b - a + 1) * P) / 2 - P / 2;
    const breathe = 1 + (reduced ? 0 : 0.035 * (1 - Math.cos(time / 700)));
    const cx = W / 2 + Math.sin(time / 1700) * Math.min(32 * u, Math.max(0, room));
    return [cx + (f.c.week - (a + b) / 2) * P * breathe, TOP + P / 2 + f.c.day * P * breathe] as const;
  };
  const home = (c: Cell) => [c.x + 5, c.y + 5] as const;

  const startWave = (n: number) => {
    wave = n;
    foes = waves[n]!.map((c) => ({ c, hp: c.level, state: "lift", t: 0, delay: 0, x: c.x + 5, y: c.y + 5, fx: c.x + 5, fy: c.y + 5, flash: 0, path: [], shot: false }));
    const [a] = span();
    for (const f of foes) f.delay = reduced ? 0 : (f.c.week - a) * 40 + f.c.day * 12;
    phase = "lift";
    clock = diveClock = bombClock = 0;
    say(`Wave ${n + 1} of ${waves.length}: ${label(waves[n]!)}.`);
  };
  const reset = () => {
    score = shown = 0;
    lives = 3;
    gone = safe = 0;
    shots = [];
    bombs = [];
    bits = [];
    won = record = false;
    cleared.clear();
    startWave(0);
  };
  // Every day still out flies back to its square; cleared ones ink in again.
  const recall = () => {
    for (const f of foes) if (f.state !== "dead" && f.state !== "rest") Object.assign(f, { state: "back", t: 0, fx: f.x, fy: f.y });
    clock = 0;
  };
  const end = (win: boolean) => {
    phase = "over";
    won = win;
    recall();
    ctx.play(win ? "success" : "gameOver");
    if (score > best) {
      record = best > 0;
      best = score;
      try {
        localStorage.setItem("arcade:contributions", JSON.stringify({ v: score, t: fmt(score) }));
      } catch {
        // Storage blocked: the best lasts for this visit.
      }
    }
    say(`${win ? "The whole year is clear." : "Out of ships."} You cleared ${fmt(score)} of ${fmt(total)} contributions.`);
  };
  close = () => {
    if (phase === "close") return;
    if (phase !== "over") recall();
    phase = "close";
    clock = 0;
    ctx.play("close");
    // Paused (focus elsewhere, off-screen): no frames to animate the way back.
    if (!running) finish();
  };
  const finish = () => {
    h.stop();
    wrap.remove();
    if (row) row.inert = false;
    button.setAttribute("aria-expanded", "false");
    button.focus();
    close = undefined;
  };
  const fire = () => {
    if (phase !== "play" || gone || cool > 0 || shots.length > 2) return;
    shots.push({ x, y: shipY - 10 * u });
    cool = 190;
    ctx.play("tap", { x });
  };
  const restart = () => {
    if (phase === "over" && clock > 700) {
      ctx.play("open");
      reset();
    }
  };

  ctx.onKey((key, down) => {
    if (!down) return;
    if (phase === "over") return key === "action" && restart();
    if (key === "left" || key === "right") target = null;
    if (key === "action") fire();
  });
  ctx.onPointer((type, px, py, event) => {
    touch = event.pointerType !== "mouse";
    if (type === "down" && py > GH && py < TOP - 6 * u && px > W - 140 * u) return close?.();
    if (phase === "over") return type === "down" && restart();
    if (type !== "up") target = px;
    if (type === "down") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser no longer tracks: firing still stops on its up.
      }
      firing = true;
      fire();
    } else if (type === "up") firing = false;
  });

  const burst = (f: Foe) => {
    const color = shades[f.c.level]!;
    if (!reduced) for (let k = 0; k < 6; k++) bits.push({ x: f.x, y: f.y, vx: Math.cos(k * 1.05 + 0.3) * 60, vy: Math.sin(k * 1.05 + 0.3) * 60, t: 0, color });
    bits.push({ x: f.x, y: f.y - S / 2, vx: 0, vy: -24, t: 0, color: colors.ink, text: `+${f.c.count}` });
  };
  const hitShip = () => {
    lives--;
    gone = 1100;
    bombs = [];
    bits.push({ x, y: shipY, vx: 0, vy: 0, t: 0, color: colors.accent });
    ctx.play("error", { x });
    if (!lives) end(false);
    else say(`Hit. ${lives} ${lives === 1 ? "ship" : "ships"} left.`);
  };
  const bezier = (p: number[], t: number) => {
    const m = 1 - t;
    const a = m * m * m;
    const b = 3 * m * m * t;
    const c = 3 * m * t * t;
    const d = t * t * t;
    return [a * p[0]! + b * p[2]! + c * p[4]! + d * p[6]!, a * p[1]! + b * p[3]! + c * p[5]! + d * p[7]!] as const;
  };

  const update = (dt: number) => {
    const s = dt / 1000;
    time += dt;
    clock += dt;
    cool -= dt;
    bump = Math.max(0, bump - dt / 260);
    shown += (score - shown) * Math.min(1, dt / 110);
    if (Math.abs(score - shown) < 0.5) shown = score;
    if (phase === "open") {
      unroll = reduced ? 1 : clamp(clock / 480, 0, 1);
      if (unroll >= 1) reset();
    }
    if (phase === "close" && clock > (reduced ? 260 : 620)) {
      unroll = reduced ? 0 : 1 - clamp((clock - 620) / 380, 0, 1);
      if (unroll <= 0) return finish();
    }

    // The ship: arrows, or toward the pointer.
    const v = W * 0.5 * s;
    if (ctx.held("left")) x -= v;
    if (ctx.held("right")) x += v;
    if (target !== null) x += clamp(target - x, -v * 1.6, v * 1.6);
    x = clamp(x, 12 * u, W - 12 * u);
    // On a touch screen it fires by itself; the finger only steers.
    if (ctx.held("action") || firing || (touch && phase === "play")) fire();
    if (gone) {
      gone = Math.max(0, gone - dt);
      if (!gone) safe = 1600;
    }
    safe = Math.max(0, safe - dt);

    const level = wave / Math.max(1, waves.length - 1);
    const pace = reduced ? 0.75 : 1;
    let out_ = 0;
    for (const f of foes) {
      f.flash = Math.max(0, f.flash - dt / 160);
      if (f.state === "dead" || f.state === "rest") continue;
      const [sx, sy] = slot(f);
      if (f.state === "lift") {
        f.t = clamp((clock - f.delay) / (reduced ? 360 : 720), 0, 1);
        const k = inOut(f.t);
        const [hx, hy] = home(f.c);
        f.x = hx + (sx - hx) * k;
        f.y = hy + (sy - hy) * k - (reduced ? 0 : Math.sin(Math.PI * f.t) * 18 * u);
        if (f.t >= 1) f.state = "home";
      } else if (f.state === "home") {
        f.x = sx;
        f.y = sy;
      } else if (f.state === "dive") {
        f.t = Math.min(1, f.t + (s * pace * (1 + level * 0.5)) / 2.6);
        [f.x, f.y] = bezier(f.path, f.t);
        if (!f.shot && f.t > 0.42) {
          f.shot = true;
          bombs.push({ x: f.x, y: f.y, vx: clamp((x - f.x) * 0.5, -60 * u, 60 * u) });
        }
        if (f.t >= 1) Object.assign(f, { state: "enter", t: 0, fx: sx, fy: -P });
      } else if (f.state === "enter") {
        f.t = Math.min(1, f.t + s / 0.9);
        const k = out(f.t);
        f.x = f.fx + (sx - f.fx) * k;
        f.y = f.fy + (sy - f.fy) * k;
        if (f.t >= 1) f.state = "home";
      } else if (f.state === "back") {
        f.t = Math.min(1, f.t + s / (reduced ? 0.25 : 0.6));
        const k = inOut(f.t);
        const [hx, hy] = home(f.c);
        f.x = f.fx + (hx - f.fx) * k;
        f.y = f.fy + (hy - f.fy) * k;
        if (f.t >= 1) f.state = "rest";
      }
      if (f.state === "dive" || f.state === "enter") out_++;
    }
    if (phase === "lift" && foes.every((f) => f.state === "home")) phase = "play";

    if (phase === "play") {
      // Dives: one or two at a time, more often each stretch of the year.
      diveClock += dt * pace;
      if (diveClock > 2400 - level * 1300) {
        diveClock = 0;
        const ready = foes.filter((f) => f.state === "home");
        const f = ready[Math.floor(Math.random() * ready.length)];
        if (f && out_ < 1 + Math.round(level * 2)) {
          const side = f.x < W / 2 ? -1 : 1;
          const tx = clamp(x + (Math.random() - 0.5) * 80 * u, P, W - P);
          f.path = [f.x, f.y, f.x + side * 70 * u, f.y - 40 * u, tx - side * 90 * u, H * 0.8, tx + side * 40 * u, H + P];
          f.state = "dive";
          f.t = 0;
          f.shot = false;
        }
      }
      bombClock += dt * pace;
      if (bombClock > 1700 - level * 900) {
        bombClock = 0;
        const ready = foes.filter((f) => f.state === "home");
        const f = ready[Math.floor(Math.random() * ready.length)];
        if (f) bombs.push({ x: f.x, y: f.y + S / 2, vx: 0 });
      }
    }

    shots = shots.filter((shot) => {
      shot.y -= H * 1.5 * s;
      const f = foes.find((f) => (f.state === "home" || f.state === "dive" || f.state === "enter") && Math.abs(f.x - shot.x) < S / 2 + 1.5 * u && Math.abs(f.y - shot.y) < S / 2 + 2 * u);
      if (!f) return shot.y > 0;
      f.flash = 1;
      f.hp--;
      if (f.hp > 0) ctx.play("tick", { x: f.x });
      else {
        f.state = "dead";
        cleared.add(f.c);
        score += f.c.count;
        bump = 1;
        burst(f);
        ctx.play(f.c.level > 1 ? "break" : "pop", { x: f.x });
        if (foes.every((f) => f.state === "dead")) {
          phase = "clear";
          clock = 0;
          ctx.play("success");
          say(`${label(waves[wave]!)} cleared.`);
        }
      }
      return false;
    });
    if (phase === "clear" && clock > 900) {
      if (wave + 1 < waves.length) startWave(wave + 1);
      else end(true);
    }

    bombs = bombs.filter((bomb) => {
      bomb.y += H * 0.42 * pace * (1 + level * 0.3) * s;
      bomb.x += bomb.vx * s;
      if (!gone && !safe && phase === "play" && Math.abs(bomb.x - x) < 7 * u && Math.abs(bomb.y - shipY) < 9 * u) {
        hitShip();
        return false;
      }
      return bomb.y < H;
    });
    if (!gone && !safe && phase === "play" && foes.some((f) => f.state === "dive" && Math.abs(f.x - x) < S / 2 + 6 * u && Math.abs(f.y - shipY) < S / 2 + 6 * u)) hitShip();
    bits = bits.filter((bit) => {
      bit.t += dt / (bit.text ? 700 : 420);
      bit.x += bit.vx * s * u;
      bit.y += bit.vy * s * u;
      return bit.t < 1;
    });
  };

  const square = (cx: number, cy: number, side: number) => g.fillRect(cx - side / 2, cy - side / 2, side, side);

  const draw = () => {
    g.clearRect(0, 0, W, H);
    const edge = GH + 4 + out(unroll) * (H - GH - 4);
    g.fillStyle = colors.paper;
    g.fillRect(0, 0, W, edge);

    // The graph, as the page drew it. Days out in the formation leave an empty square; cleared ones a ruled outline,
    // inked in again as they come home.
    const restoring = phase === "over" || phase === "close" ? clamp(clock / 600, 0, 1) : 0;
    const out_ = new Set(foes.filter((f) => f.state !== "rest" && f.state !== "dead").map((f) => f.c));
    for (const c of cells) {
      const away = out_.has(c);
      const gone_ = cleared.has(c);
      g.fillStyle = shades[away || (gone_ && !restoring) ? 0 : c.level]!;
      if (gone_ && restoring) g.globalAlpha = clamp(restoring * 1.6 - (c.i % 14) / 40, 0, 1);
      g.fillRect(c.x, c.y, 10, 10);
      g.globalAlpha = 1;
      if (gone_ && restoring < 1) {
        g.strokeStyle = colors.muted;
        g.lineWidth = u;
        g.globalAlpha = 1 - restoring;
        g.strokeRect(c.x + 2, c.y + 2, 6, 6);
        g.globalAlpha = 1;
      }
    }

    // The sheet below: its frame, the heads-up line, the floor.
    g.font = `${10.5 * u}px ${ctx.fonts.mono}`;
    g.textBaseline = "middle";
    const focused = document.activeElement === canvas;
    g.strokeStyle = focused && running ? colors.signal : colors.line;
    g.lineWidth = u;
    g.strokeRect(u / 2, GH + 4 + u / 2, W - u, edge - GH - 4 - u);
    const hud = GH + 4 + 11 * u;
    g.fillStyle = colors.muted;
    g.textAlign = "left";
    const narrow = W / u < 480;
    g.fillText(`${wave + 1}${narrow ? "/" : " of "}${waves.length} · ${label(waves[wave]!)}`, 8 * u, hud);
    g.textAlign = "right";
    g.fillText(narrow ? "× back" : touch ? "back to the graph ×" : "esc · back to the graph", W - 8 * u, hud);
    const grow = 1 + (reduced ? 0 : out(bump) * 0.18);
    g.font = `${13 * grow * u}px ${ctx.fonts.pixel}`;
    g.fillStyle = colors.ink;
    g.textAlign = "right";
    g.fillText(fmt(shown), W / 2 - 3 * u, hud + u);
    g.font = `${10.5 * u}px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.textAlign = "left";
    g.fillText(`/ ${fmt(total)}`, W / 2 + 3 * u, hud);
    for (let k = 0; k < lives; k++) ship(W - 14 * u - k * 14 * u, H - 6 * u, 0.45, k === 0 && lives === 1 ? colors.accent : colors.muted);

    // The formation.
    for (const f of foes) {
      if (f.state === "dead" || f.state === "rest") continue;
      const k = f.state === "lift" ? inOut(f.t) : f.state === "back" ? 1 - inOut(f.t) : 1;
      const side = 10 + (S - 10) * k;
      const lift = reduced ? 0 : f.flash * 3 * u;
      g.fillStyle = shades[Math.max(1, f.hp)]!;
      if (reduced && (f.state === "lift" || f.state === "back")) {
        // Reduced motion: no flight. The square fades out of the graph and in at its place.
        const [hx, hy] = home(f.c);
        const [sx, sy] = f.state === "lift" ? slot(f) : [f.fx, f.fy];
        g.globalAlpha = k;
        square(sx, sy, S);
        g.globalAlpha = 1 - k;
        square(hx, hy, 10);
        g.globalAlpha = 1;
        continue;
      }
      square(f.x, f.y - lift, side);
      // A hairline one level stronger, so the palest days still read as targets.
      g.strokeStyle = shades[Math.min(4, f.hp + 1)]!;
      g.lineWidth = u;
      g.strokeRect(f.x - side / 2 + u / 2, f.y - lift - side / 2 + u / 2, side - u, side - u);
      if (f.flash) {
        g.strokeStyle = colors.ink;
        g.globalAlpha = f.flash;
        g.lineWidth = 1.5 * u;
        g.strokeRect(f.x - side / 2 - 2 * u, f.y - lift - side / 2 - 2 * u, side + 4 * u, side + 4 * u);
        g.globalAlpha = 1;
      }
    }

    for (const bit of bits) {
      g.globalAlpha = 1 - out(bit.t);
      g.fillStyle = bit.color;
      if (bit.text) {
        g.font = `${10 * u}px ${ctx.fonts.mono}`;
        g.fillText(bit.text, bit.x, bit.y);
      } else if (bit.vx || bit.vy) square(bit.x, bit.y, 3 * u * (1 - bit.t));
      else {
        g.strokeStyle = bit.color;
        g.lineWidth = 1.5 * u;
        g.beginPath();
        g.arc(bit.x, bit.y, (6 + out(bit.t) * (reduced ? 2 : 16)) * u, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    g.strokeStyle = colors.ink;
    g.lineWidth = 1.5 * u;
    g.beginPath();
    for (const shot of shots) {
      g.moveTo(shot.x, shot.y);
      g.lineTo(shot.x, shot.y + 7 * u);
    }
    g.stroke();
    g.fillStyle = colors.muted;
    for (const bomb of bombs) square(bomb.x, bomb.y, 3 * u);
    if (phase !== "over" && phase !== "close" && !gone && !(safe && !reduced && Math.floor(safe / 130) % 2)) ship(x, shipY, 1, colors.signal);

    if (phase === "lift" && clock < 1400) caption(`${label(waves[wave]!)}`, clamp(Math.sin((clock / 1400) * Math.PI) * 1.4, 0, 1));
    if (phase === "over" && clock > 600) {
      const a = out((clock - 600) / 320);
      const y = TOP + 22 * u + (1 - a) * 6 * u;
      g.globalAlpha = a;
      g.textAlign = "center";
      g.fillStyle = colors.ink;
      g.font = `${24 * u}px ${ctx.fonts.pixel}`;
      g.fillText(fmt(score), W / 2, y);
      g.font = `${12 * u}px ${ctx.fonts.mono}`;
      g.fillText(won ? `all ${fmt(total)} contributions of the year, cleared` : `of ${fmt(total)} contributions in the last year, cleared`, W / 2, y + 24 * u);
      g.fillStyle = colors.muted;
      g.font = `${10.5 * u}px ${ctx.fonts.mono}`;
      g.fillText(`${won ? waves.length : wave} of ${waves.length} stretches cleared · ${record ? "new best" : `best ${fmt(best)}`}`, W / 2, y + 42 * u);
      g.fillStyle = colors.signal;
      g.fillText(touch ? "tap to play again" : "space or click to play again", W / 2, y + 62 * u);
      g.globalAlpha = 1;
    }
    if (!running && phase !== "open" && phase !== "close" && unroll >= 1) caption(touch ? "paused · tap to go on" : "paused · click or press a key to go on", 1);

    // Below the unrolling edge the page shows through; the edge itself is a ruled line.
    if (unroll < 1) {
      g.clearRect(0, edge, W, H - edge);
      g.fillStyle = colors.signal;
      g.fillRect(0, edge - u, W, u);
    }
  };
  function ship(cx: number, cy: number, k: number, color: string) {
    g.strokeStyle = color;
    g.fillStyle = colors.paper;
    g.lineWidth = (k < 1 ? 1 : 2) * u;
    g.beginPath();
    g.moveTo(cx, cy - 10 * u * k);
    g.lineTo(cx + 8 * u * k, cy + 6 * u * k);
    g.lineTo(cx, cy + 2 * u * k);
    g.lineTo(cx - 8 * u * k, cy + 6 * u * k);
    g.closePath();
    g.fill();
    g.stroke();
  }
  function caption(text: string, alpha: number) {
    g.font = `${11 * u}px ${ctx.fonts.mono}`;
    const w = g.measureText(text).width + 16 * u;
    const y = TOP + 7 * P + 18 * u;
    g.globalAlpha = alpha;
    g.fillStyle = colors.paper;
    g.fillRect(W / 2 - w / 2, y - 9 * u, w, 18 * u);
    g.fillStyle = colors.ink;
    g.textAlign = "center";
    g.fillText(text, W / 2, y);
    g.globalAlpha = 1;
  }

  ctx.frame((dt) => {
    if (dt) update(dt);
    if (wrap.isConnected) draw();
  });
  ctx.play("open");
  canvas.focus({ preventScroll: true });
  wrap.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
}
