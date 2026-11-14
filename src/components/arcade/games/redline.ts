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
  const top = 26;
  const pitch = () => Math.min(14, 118 / lines().length);
  const lineAt = (y: number) => Math.floor((y - top + pitch() * 0.75) / pitch());

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

  // A revision cloud: scallops round a box.
  const cloud = (x: number, y: number, w: number, h: number) => {
    g.beginPath();
    for (let i = 0; i < w; i += 6) {
      g.moveTo(x + i, y);
      g.arc(x + i + 3, y, 3, Math.PI, 0);
      g.moveTo(x + i + 6, y + h);
      g.arc(x + i + 3, y + h, 3, 0, Math.PI);
    }
    g.moveTo(x + w, y);
    g.arc(x + w, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
    g.moveTo(x, y + h);
    g.arc(x, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5);
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
      g.fillText("click its line, or arrows and space,", W / 2, 84);
      g.fillText("before the line runs out.", W / 2, 98);
      g.fillStyle = colors.signal;
      g.fillText("press space to start", W / 2, 124);
      return;
    }

    // The code, sized to fit the widest line.
    const widest = rows.reduce((a, b) => (b.length > a.length ? b : a));
    // Step down until the widest line fits: canvas text does not scale smoothly with the size.
    let size = 10.5;
    do g.font = `${(size -= 0.5)}px ${ctx.fonts.mono}`;
    while (size > 7 && g.measureText(widest).width > W - 32);
    rows.forEach((row, i) => {
      const y = top + i * p;
      g.textAlign = "right";
      g.fillStyle = colors.line;
      g.fillText(String(i + 1), 17, y);
      g.textAlign = "left";
      g.fillStyle = answered && i === pick && i + 1 !== bug ? colors.muted : colors.ink;
      g.fillText(row, 24, y);
      if (answered && i === pick && i + 1 !== bug) {
        g.strokeStyle = colors.muted;
        g.beginPath();
        g.moveTo(24 + g.measureText(row.match(/^ */)![0]).width, y - size * 0.3);
        g.lineTo(24 + g.measureText(row).width, y - size * 0.3);
        g.stroke();
      }
    });

    if (!answered) {
      // Your cursor: a bracket in the gutter and a rule under the line.
      const y = top + hover * p;
      g.strokeStyle = colors.signal;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(21, y - p + 3);
      g.lineTo(21, y + 2);
      g.stroke();
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(24, y + 2.5);
      g.lineTo(W - 8, y + 2.5);
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

    // The answer: a revision cloud round the buggy line, a delta at the margin, the note below.
    const y = top + (bug - 1) * p;
    const right = pick + 1 === bug;
    g.strokeStyle = right ? colors.green : colors.accent;
    g.lineWidth = 1.5;
    const grow = ctx.reduced ? 0 : pulse * 3;
    const code = rows[bug - 1]!;
    const indent = 24 + g.measureText(code.match(/^ */)![0]).width;
    cloud(indent - 3 - grow, y - p + 2 - grow, Math.min(W - 36 - indent, g.measureText(code.trim()).width + 6) + grow * 2, p + grow * 2);
    const dx = W - 14;
    g.beginPath();
    g.moveTo(dx, y - 9);
    g.lineTo(dx + 6, y + 2);
    g.lineTo(dx - 6, y + 2);
    g.closePath();
    g.stroke();
    g.font = `7px ${ctx.fonts.mono}`;
    g.textAlign = "center";
    g.fillStyle = g.strokeStyle;
    g.fillText(String(n + 1), dx, y);

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
