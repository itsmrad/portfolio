/**
 * "Word check": guess the five-letter word in six tries. The words come from
 * this site (the owner's stack, his projects and the trade), each with a short
 * note on where it is from, shown when the round ends. Clues are a checker's
 * marks on a drawing: a filled box for the right letter in the right place, a
 * circle for a letter that belongs elsewhere, a strike through one that is not
 * in the word. The on-screen keys carry the same marks.
 */
import type { Game } from "../contract";

// shortcut: any five letters count as a guess (no dictionary); add one only if visitors game it.
const WORDS: [string, string][] = [
  ["REACT", "codenaya's\nfront end"],
  ["CLERK", "codenaya's\nsign-in"],
  ["AGENT", "codenaya's,\n15 tools"],
  ["MODEL", "15 hosted\nin codenaya"],
  ["LAYER", "codenaya\nhas five"],
  ["BUILD", "vite build,\nthe gate"],
  ["SWIFT", "in xflow's\nstack"],
  ["CARGO", "builds the\nrust daemon"],
  ["CRATE", "a rust\npackage"],
  ["TRAIT", "rust's\ninterfaces"],
  ["PANIC", "rust, when\nall fails"],
  ["SHELL", "where xflow\nruns"],
  ["QUERY", "tanstack\nquery"],
  ["PARSE", "zod's job"],
  ["TOKEN", "jwt and\nllm alike"],
  ["KIOSK", "a pi kiosk,\nat syuniqe"],
  ["MERGE", "git, daily"],
  ["DEBUG", "most of\nthe job"],
  ["CACHE", "every layer\nhas one"],
  ["ASYNC", "rust and ts\nalike"],
];
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "<ZXCVBNM>"];
const TILE = 16;
const STEP = 19;
const GX = 74;
const KEY_W = 21;
const KEY_H = 16;

const words: Game = (ctx) => {
  const { g, colors, width: W, fonts } = ctx;
  const [answer, note] = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const tries: string[] = [];
  const marks: number[][] = [];
  const known: Record<string, number> = {};
  let typed = "";
  let reveal = 5;
  let shake = 0;
  let pressed = "";
  let flash = 0;
  // The solved row's wave, in ms; the round ends when it has passed.
  let hop = -1;
  let done = false;

  // 2 right place, 1 elsewhere, 0 not in the word; repeated letters count only as often as the answer has them.
  const check = (guess: string) => {
    const left = [...answer];
    const m = [...guess].map((c, i) => Number(c === answer[i]) * 2);
    m.forEach((v, i) => v && (left[i] = ""));
    [...guess].forEach((c, i) => {
      const j = left.indexOf(c);
      if (!m[i] && j >= 0) {
        m[i] = 1;
        left[j] = "";
      }
    });
    return m;
  };

  const press = (k: string) => {
    // Letters may run ahead of the reveal; only Enter waits for it.
    if (done || (k === ">" && reveal < 5)) return;
    pressed = k;
    flash = 1;
    if (k === "<") {
      if (typed) typed = typed.slice(0, -1);
      return ctx.play("tick");
    }
    if (k !== ">") {
      if (typed.length < 5) {
        typed += k;
        ctx.play("key");
      }
      return;
    }
    if (typed.length < 5) {
      shake = 1;
      ctx.announce("Five letters, please.");
      return ctx.play("error");
    }
    const m = check(typed);
    tries.push(typed);
    marks.push(m);
    [...typed].forEach((c, i) => (known[c] = Math.max(known[c] ?? 0, m[i]!)));
    typed = "";
    reveal = ctx.reduced ? 5 : 0;
    ctx.announce(m.map((v, i) => `${tries.at(-1)![i]} ${["no", "elsewhere", "yes"][v]}`).join(", "));
    // Without the animated reveal (reduced motion) the frame loop never reaches its end-of-row step: end here.
    if (ctx.reduced) finish();
  };

  const finish = () => {
    const won = marks.at(-1)!.every((v) => v === 2);
    if (!won && tries.length < 6) return;
    done = true;
    typed = "";
    if (won) {
      ctx.play("success");
      ctx.score(7 - tries.length, `${tries.length}/6`);
      if (ctx.reduced) ctx.over(`${answer} in ${tries.length} of 6.`);
      else hop = 0;
    } else {
      ctx.play("gameOver");
      ctx.over(`The word was ${answer}.`);
    }
  };

  ctx.onKey((key, down, event) => {
    if (!down) return;
    if (event.key === "Enter") press(">");
    else if (event.key === "Backspace") press("<");
    else if (/^[a-z]$/i.test(event.key)) press(event.key.toUpperCase());
  });

  const keys = ROWS.flatMap((row, r) => {
    const widths = [...row].map((k) => (k === "<" || k === ">" ? 32 : KEY_W));
    let x = (W - widths.reduce((a, b) => a + b + 2, -2)) / 2;
    return [...row].map((k, i) => {
      const box = { k, x, y: 122 + r * (KEY_H + 2), w: widths[i]! };
      x += box.w + 2;
      return box;
    });
  });
  ctx.onPointer((type, x, y) => {
    const hit = type === "down" && keys.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + KEY_H);
    if (hit) press(hit.k);
  });

  /** A box with its letter and its mark: filled green box, amber circle, struck through, or plain. */
  const cell = (x: number, y: number, w: number, h: number, c: string, m: number | undefined, size: number) => {
    g.lineWidth = 1;
    if (m === 2) {
      g.fillStyle = colors.green;
      g.fillRect(x, y, w, h);
    } else {
      g.strokeStyle = m === 1 ? colors.amber : colors.line;
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    g.font = `${size}px ${fonts.mono}`;
    g.fillStyle = m === 2 ? colors.paper : m === 0 ? colors.muted : colors.ink;
    g.fillText(c, x + w / 2, y + h / 2 + 1);
    if (m === 1) {
      g.strokeStyle = colors.amber;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, h / 2 - 2.5, 0, Math.PI * 2);
      g.stroke();
    }
    if (m === 0) {
      g.strokeStyle = colors.muted;
      g.beginPath();
      g.moveTo(x + 3, y + h - 3);
      g.lineTo(x + w - 3, y + 3);
      g.stroke();
    }
  };

  const small = (s: string, x: number, y: number, color = colors.muted) => {
    g.font = `8px ${fonts.mono}`;
    g.fillStyle = color;
    s.split("\n").forEach((line, i) => g.fillText(line, x, y + i * 10));
  };

  ctx.frame((dt) => {
    if (reveal < 5) {
      const before = Math.floor(reveal);
      reveal = Math.min(5, reveal + dt / 160);
      if (Math.floor(reveal) > before) ctx.play("note", { index: [0, 4, 8][marks.at(-1)![before]!] });
      if (reveal === 5) finish();
    }
    if (hop >= 0 && (hop += dt) > 700) {
      hop = -1;
      ctx.over(`${answer} in ${tries.length} of 6.`);
    }
    shake = Math.max(0, shake - dt / 300);
    flash = Math.max(0, flash - dt / 150);

    g.clearRect(0, 0, W, ctx.height);
    g.textAlign = "center";
    g.textBaseline = "middle";
    const sx = ctx.reduced ? 0 : Math.sin(shake * 20) * 3 * shake;
    for (let r = 0; r < 6; r++) {
      const row = tries[r] ?? (r === tries.length ? typed : "");
      for (let i = 0; i < 5; i++) {
        const latest = r === marks.length - 1;
        // The newest row turns over tile by tile, its mark showing from the half-turn.
        const p = latest ? reveal - i : 1;
        const m = r < marks.length && p >= 0.5 ? marks[r]![i] : undefined;
        const live = r === tries.length;
        const y = 4 + r * STEP - (latest && hop > 0 ? 3 * Math.max(0, Math.sin(Math.min(1, Math.max(0, (hop - i * 70) / 220)) * Math.PI)) : 0);
        g.save();
        g.translate(0, y + TILE / 2);
        g.scale(1, p > 0 && p < 1 ? Math.max(0.05, Math.abs(Math.cos(p * Math.PI))) : 1);
        cell(GX + i * STEP + (live ? sx : 0), -TILE / 2, TILE, TILE, row[i] ?? "", m, 11);
        g.restore();
        if (live && i === typed.length && !done) {
          g.fillStyle = colors.signal;
          g.fillRect(GX + i * STEP + 3, 4 + r * STEP + TILE - 3, TILE - 6, 1.5);
        }
      }
    }

    for (const b of keys) {
      const label = b.k === "<" ? "del" : b.k === ">" ? "enter" : b.k;
      const lift = b.k === pressed && !ctx.reduced ? flash : 0;
      cell(b.x, b.y + lift, b.w, KEY_H, label, known[b.k], b.w > KEY_W ? 8 : 9);
    }

    // Legend on the right, try count and the word's note on the left.
    g.textAlign = "left";
    const legend: [string, number][] = [["in place", 2], ["elsewhere", 1], ["not in it", 0]];
    legend.forEach(([s, m], i) => {
      cell(176, 8 + i * 16, 11, 11, "", m, 8);
      small(s, 191, 14 + i * 16);
    });
    small(`try ${Math.min(tries.length + 1, 6)}/6`, 8, 10, colors.ink);
    small(done ? `${answer}:\n${note}` : tries.length ? "" : "type a\nfive-letter\nword from\nthe stack", 8, 30, done ? colors.ink : colors.muted);
  });

  return () => {};
};

export default words;
