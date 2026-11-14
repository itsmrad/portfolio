/**
 * "Redline": short Rust and TypeScript functions in the owner's stack, each
 * with exactly one planted bug. Pick the line that needs the fix before the
 * countdown (a dimension line) runs out; the answer is marked the way a
 * checker marks a drawing, with a revision cloud and a delta, and a one-line
 * note says why. Five functions a round; points for speed, times the streak.
 *
 * Every bug was checked with rustc and tsc --strict: each snippet fails
 * (compile error, panic or wrong result) and passes with only its marked line
 * changed (handoff/rebuild-games-c.md lists the fixes).
 */
import type { Game } from "../contract";

// [label, buggy line (1-based), why, code]
const SNIPPETS: [string, number, string, string][] = [
  ["rust · sum", 3, "0..=len reads one past the end and panics. Use 0..v.len().", "fn sum(v: &[u32]) -> u32 {\n  let mut total = 0;\n  for i in 0..=v.len() {\n    total += v[i];\n  }\n  total\n}"],
  ["rust · gain", 5, "Backwards: that zeroes every normal level. It should be v < 0.0.", "fn gain(v: f32) -> f32 {\n  if v > 1.0 {\n    return 1.0;\n  }\n  if v > 0.0 {\n    return 0.0;\n  }\n  v\n}"],
  ["rust · providers", 2, "list is not mut, so push cannot borrow it mutably. let mut list.", "fn providers() -> Vec<&'static str> {\n  let list = Vec::new();\n  list.push(\"groq\");\n  list.push(\"openai\");\n  list\n}"],
  ["rust · words", 6, "The semicolon makes the body return (), not n. Drop it.", "/// Words in a transcript.\nfn words(text: &str) -> usize {\n  let n = text\n    .split_whitespace()\n    .count();\n  n;\n}"],
  ["ts · saveKey", 2, "fetch returns a promise: res.ok needs await fetch(...).", "async function saveKey(key: string) {\n  const res = fetch(\"/api/keys\", {\n    method: \"POST\", body: key,\n  });\n  if (!res.ok) throw new Error(\"save\");\n}"],
  ["ts · lastLine", 3, "lines[length] is past the end: undefined. Use length - 1.", "function lastLine(text: string) {\n  const lines = text.split(\"\\n\");\n  return lines[lines.length];\n}"],
  ["ts · labels", 3, "A block body needs return; this maps every model to undefined.", "function labels(models: Model[]) {\n  return models.map((m) => {\n    `${m.provider} · ${m.name}`;\n  });\n}"],
  ["ts · fresh", 4, "Backwards: a fresh entry is younger than the TTL, age < TTL.", "const TTL = 60_000;\nfunction fresh(cachedAt: number) {\n  const age = Date.now() - cachedAt;\n  return age > TTL;\n}"],
];
const ROUND = 5;

const redline: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const limit = ctx.reduced ? 15000 : 12000;
  const order = [...SNIPPETS].sort(() => Math.random() - 0.5).slice(0, ROUND);
  let n = 0;
  let left = limit;
  let pick = -1;
  let hover = 0;
  let answered = false;
  let found = 0;
  let streak = 0;
  let points = 0;
  let gained = 0;
  let started = false;
  let finished = false;
  let pulse = 0;

  const lines = () => order[n]![3].split("\n");
  // The layout grid (round 3): a line-number column, the code column, and a marker column the code never enters.
  // Row i spans [top + i * p, top + (i + 1) * p]; numbers and code sit on its middle, its cloud stays inside it.
  const top = 18;
  const NUM = 17;
  const CODE = 28;
  const MARK = 18;
  const pitch = () => Math.min(14, 120 / lines().length);
  const lineAt = (y: number) => Math.floor((y - top) / pitch());

  const choose = (line: number) => {
    if (answered || line < 0 || line >= lines().length) return;
    answered = true;
    pick = line;
    pulse = 1;
    const right = line + 1 === order[n]![1];
    if (right) {
      found++;
      streak++;
      gained = Math.ceil(left / 1000) * streak;
      points += gained;
      ctx.play("success");
    } else {
      streak = 0;
      ctx.play("error");
    }
    ctx.score(points);
    ctx.announce(`${right ? `Found it, plus ${gained}.` : `Not that one: line ${order[n]![1]}.`} ${order[n]![2]}`);
  };
  const next = () => {
    if (++n < ROUND) {
      answered = false;
      left = limit;
      hover = 0;
      ctx.play("tick");
      return;
    }
    n--;
    finished = true;
    ctx.play(found >= 4 ? "success" : "release");
    ctx.over(`${found} of ${ROUND} bugs found, ${points} points.`);
  };

  ctx.onKey((key, down, event) => {
    if (!down || finished) return;
    if (!started) {
      if (key) started = true;
      return;
    }
    if (answered) return void ((key === "action" || key === "right") && next());
    const digit = Number(event.key);
    if (digit >= 1 && digit <= 9) return choose(digit - 1);
    if (key === "up" || key === "down") {
      hover = (hover + (key === "up" ? -1 : 1) + lines().length) % lines().length;
      ctx.play("tick");
    } else if (key === "action") choose(hover);
  });
  ctx.onPointer((type, _x, y) => {
    if (finished) return;
    if (type === "move" && started && !answered) {
      const line = lineAt(y);
      if (line >= 0 && line < lines().length) hover = line;
    }
    if (type !== "down") return;
    if (!started) started = true;
    else if (answered) next();
    else choose(lineAt(y));
  });

  // A revision cloud: a row-high capsule with scalloped long sides, drawn wholly inside [x, x + w] by [y, y + h].
  const cloud = (x: number, y: number, w: number, h: number) => {
    const b = Math.min(2.5, h / 6);
    const r = (h - 2 * b) / 2;
    const [cy, l, rr] = [y + h / 2, x + r + b, x + w - r - b];
    const n = Math.max(1, Math.round((rr - l) / 6));
    const step = (rr - l) / n;
    g.beginPath();
    g.arc(l, cy, r, Math.PI / 2, Math.PI * 1.5);
    for (let i = 0; i < n; i++) g.arc(l + step * (i + 0.5), cy - r, step / 2, Math.PI, 0);
    g.arc(rr, cy, r, -Math.PI / 2, Math.PI / 2);
    for (let i = n - 1; i >= 0; i--) g.arc(l + step * (i + 0.5), cy + r, step / 2, 0, Math.PI);
    g.closePath();
    g.stroke();
  };
  const wrap = (text: string, width: number) =>
    text.split(" ").reduce<string[]>((rows, word) => {
      const last = rows.at(-1);
      if (last !== undefined && g.measureText(`${last} ${word}`).width <= width) rows[rows.length - 1] = `${last} ${word}`;
      else rows.push(word);
      return rows;
    }, []);

  ctx.frame((dt) => {
    if (started && !answered && !finished) {
      left -= dt;
      if (left <= 0) {
        left = 0;
        answered = true;
        pick = -1;
        streak = 0;
        ctx.play("error");
        ctx.announce(`Time. The bug was on line ${order[n]![1]}. ${order[n]![2]}`);
      }
    }
    pulse = Math.max(0, pulse - dt / 400);

    g.clearRect(0, 0, W, H);
    const [label, bug, why] = order[n]!;
    const rows = lines();
    const p = pitch();
    g.textAlign = "left";
    g.font = `9px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.fillText(started ? label : "redline", 8, 11);
    g.textAlign = "right";
    g.fillText(`${Math.min(n + 1, ROUND)}/${ROUND} · streak ${streak}`, W - 8, 11);

    if (!started) {
      g.textAlign = "center";
      g.fillStyle = colors.ink;
      g.fillText("each function has one bug.", W / 2, 70);
      g.fillText("click its line, or w/s and space,", W / 2, 84);
      g.fillText("before the line runs out.", W / 2, 98);
      g.fillStyle = colors.signal;
      g.fillText("press space to start", W / 2, 124);
      return;
    }

    // The code: one size for every line, stepped down until the widest line fits its column and the buggy line
    // fits with its cloud (canvas text does not scale smoothly with the size).
    const widest = rows.reduce((a, b) => (b.length > a.length ? b : a));
    const room = W - MARK - 2 - CODE;
    const buggy = rows[bug - 1]!;
    // Set, measured and drawn at 4x and scaled down: at these sizes canvas snaps advances to whole pixels, so an
    // 8 and a 7.75 px line would measure the same and sizes would jump between snippets.
    let size = Math.min(9.5, p - 3);
    const font = () => (g.font = `${size * 4}px ${ctx.fonts.mono}`);
    const measure = (text: string) => g.measureText(text).width / 4;
    const write = (text: string, x: number, y: number) => {
      g.save();
      g.scale(0.25, 0.25);
      g.fillText(text, x * 4, y * 4);
      g.restore();
    };
    const fits = () => measure(widest) <= room && measure(buggy) + p <= room;
    for (font(); size > 6.5 && !fits(); font()) size -= 0.25;
    const mid = (i: number) => top + i * p + p / 2;
    g.textBaseline = "middle";
    rows.forEach((row, i) => {
      const y = mid(i);
      g.textAlign = "right";
      g.fillStyle = colors.line;
      write(String(i + 1), NUM, y);
      g.textAlign = "left";
      const struck = answered && i === pick && i + 1 !== bug;
      g.fillStyle = struck ? colors.muted : colors.ink;
      write(row, CODE, y);
      if (struck) {
        g.strokeStyle = colors.muted;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(CODE + measure(row.match(/^ */)![0]), Math.round(y) + 0.5);
        g.lineTo(CODE + measure(row), Math.round(y) + 0.5);
        g.stroke();
      }
    });
    g.textBaseline = "alphabetic";

    if (!answered) {
      // Your cursor: a bracket between the numbers and the code, and a rule along the foot of the row.
      const y = top + hover * p;
      g.strokeStyle = colors.signal;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(CODE - 5, y + 2);
      g.lineTo(CODE - 5, y + p - 2);
      g.stroke();
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(CODE, Math.round(y + p) - 0.5);
      g.lineTo(W - MARK - 2, Math.round(y + p) - 0.5);
      g.stroke();

      // The countdown: a dimension line that shortens, its length written on it.
      const end = 8 + (W - 16) * (left / limit);
      const base = H - 14;
      g.strokeStyle = left < 3000 ? colors.accent : colors.muted;
      g.beginPath();
      g.moveTo(8, base - 5);
      g.lineTo(8, base + 5);
      g.moveTo(end, base - 5);
      g.lineTo(end, base + 5);
      g.moveTo(8, base);
      g.lineTo(end, base);
      g.moveTo(12, base - 2.5);
      g.lineTo(8, base);
      g.lineTo(12, base + 2.5);
      g.moveTo(end - 4, base - 2.5);
      g.lineTo(end, base);
      g.lineTo(end - 4, base + 2.5);
      g.stroke();
      g.font = `9px ${ctx.fonts.mono}`;
      g.textAlign = "center";
      g.fillStyle = left < 3000 ? colors.accent : colors.muted;
      g.fillText(`${(left / 1000).toFixed(1)} s`, Math.max(26, (8 + end) / 2), base - 4);
      return;
    }

    // The answer: a revision cloud inside the buggy line's own row, a delta in the marker column, the note below.
    const right = pick + 1 === bug;
    g.strokeStyle = right ? colors.green : colors.accent;
    g.fillStyle = g.strokeStyle;
    g.lineWidth = 1.25;
    const grow = ctx.reduced ? 0 : pulse;
    font();
    const indent = CODE + measure(buggy.match(/^ */)![0]);
    const rowTop = top + (bug - 1) * p;
    const ends = p / 2;
    cloud(indent - ends - grow, rowTop + 0.5 - grow * 0.5, measure(buggy.trim()) + 2 * ends + grow * 2, p - 1 + grow);
    // The delta: a triangle centred in the marker column on the row's middle, its number inside.
    const dx = W - MARK / 2;
    const dy = mid(bug - 1);
    const t = Math.min(6, p / 2 - 0.5);
    g.beginPath();
    g.moveTo(dx, dy - t);
    g.lineTo(dx + t * 1.1, dy + t * 0.8);
    g.lineTo(dx - t * 1.1, dy + t * 0.8);
    g.closePath();
    g.stroke();
    g.font = `${Math.max(5.5, t)}px ${ctx.fonts.mono}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n + 1), dx, dy + t * 0.25);
    g.textBaseline = "alphabetic";

    g.font = `9px ${ctx.fonts.mono}`;
    g.textAlign = "left";
    const note = wrap(`${right ? `found it, +${gained}.` : pick < 0 ? "time." : `line ${bug}.`} ${why}`, W - 16);
    const base = H - 6 - note.length * 11;
    g.fillStyle = colors.paper;
    g.fillRect(0, base - 4, W, H - base + 4);
    g.strokeStyle = colors.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(8, base - 3.5);
    g.lineTo(W - 8, base - 3.5);
    g.stroke();
    note.forEach((row, i) => {
      g.fillStyle = colors.ink;
      g.fillText(row, 8, base + 8 + i * 11);
    });
    if (!finished) {
      g.textAlign = "right";
      g.fillStyle = colors.signal;
      g.fillText(n + 1 < ROUND ? "space: next" : "space: finish", W - 8, base - 7);
    }
  });

  return () => {};
};

export default redline;
