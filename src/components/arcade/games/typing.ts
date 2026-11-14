/**
 * "Cursor race": type a few real lines from the owner's own code, Rust from
 * xflow and TypeScript from Codenaya, against a ghost cursor that keeps a
 * steady 35 words a minute. A live gauge reads your speed. Indentation types
 * itself; a wrong key turns the character red and counts against accuracy.
 */
import type { Game } from "../contract";

const SNIPPETS: [string, string][] = [
  ["xflow · tui/state.rs", "fn insert(&mut self, c: char) {\n  self.value.insert(self.cursor, c);\n  self.cursor += c.len_utf8();\n}"],
  ["xflow · tui/chat.rs", "fn push(&mut self, entry: Entry) {\n  self.entries.push(entry);\n  self.dirty = true;\n}"],
  ["xflow · core/text.rs", "fn folded(text: &str) -> String {\n  text.split_whitespace()\n    .map(str::to_lowercase)\n    .collect::<Vec<_>>()\n    .join(\" \")\n}"],
  ["codenaya · debounce-serial.ts", "const schedule = () => {\n  clearTimeout(timer);\n  timer = setTimeout(run, delayMs);\n};"],
  ["codenaya · command-palette.tsx", "const goTo = (href: string) => {\n  setOpen(false);\n  router.push(href);\n};"],
  ["codenaya · custom-cursor.tsx", "const onMouseDown = (e: MouseEvent) => {\n  setIsDown(true);\n  addRipple(e.clientX, e.clientY);\n};"],
];
const GHOST_WPM = 35;
const LINE = 13;
const CHAR = 5.8;

const typing: Game = (ctx) => {
  const { g, colors, width: W, height: H } = ctx;
  const [source, text] = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]!;
  const wrong = new Set<number>();
  let at = 0;
  let typed = 0;
  let mistakes = 0;
  let elapsed = 0;
  let started = false;
  let done = false;
  let shake = 0;

  // Leading spaces after a newline type themselves.
  const skip = () => {
    while (text[at] === " " && (at === 0 || text[at - 1] === "\n" || text[at - 1] === " ")) at++;
  };
  const wpm = () => (elapsed > 500 ? Math.round(at / 5 / (elapsed / 60000)) : 0);
  const accuracy = () => (typed ? Math.round(((typed - mistakes) / typed) * 100) : 100);

  ctx.onKey((_key, down, event) => {
    if (!down || done) return;
    const char = event.key === "Enter" ? "\n" : event.key;
    if (char.length !== 1) return;
    started = true;
    typed++;
    if (char === text[at]) {
      at++;
      skip();
      ctx.play("key");
    } else {
      mistakes++;
      wrong.add(at);
      shake = 1;
      ctx.play("tick");
    }
    ctx.score(wpm(), `${wpm()} wpm · ${accuracy()}%`);
    if (at >= text.length) {
      done = true;
      ctx.play("success");
      ctx.score(wpm(), `${wpm()} wpm · ${accuracy()}%`);
      ctx.over(`${wpm()} words a minute at ${accuracy()}% accuracy.`);
    }
  });
  // A click only says where to type.
  ctx.onPointer((type) => type === "down" && !started && ctx.announce("Type the code on the keyboard."));

  ctx.frame((dt) => {
    if (started && !done) elapsed += dt;
    shake = Math.max(0, shake - dt / 200);
    const ghost = started ? Math.min(text.length, (elapsed / 60000) * GHOST_WPM * 5) : 0;

    g.clearRect(0, 0, W, H);
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    g.font = `8px ${ctx.fonts.mono}`;
    g.fillStyle = colors.muted;
    g.fillText(source, 10, 14);

    // The code, character by character: typed in ink, to come in muted, misses in red.
    g.font = `10px ${ctx.fonts.mono}`;
    const nudge = ctx.reduced ? 0 : Math.sin(shake * 20) * shake * 1.5;
    let col = 0;
    let row = 0;
    const where = (i: number) => {
      let c = 0;
      let r = 0;
      for (let j = 0; j < i; j++) {
        if (text[j] !== "\n") c++;
        else {
          r++;
          c = 0;
        }
      }
      return [10 + c * CHAR, 34 + r * LINE] as const;
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (ch === "\n") {
        row++;
        col = 0;
        continue;
      }
      const x = 10 + col * CHAR + (i === at ? nudge : 0);
      const y = 34 + row * LINE;
      if (wrong.has(i)) {
        g.fillStyle = colors.accent;
        g.fillRect(x, y + 2, CHAR, 1.5);
      }
      g.fillStyle = i < at ? colors.ink : wrong.has(i) && i === at ? colors.accent : colors.muted;
      g.fillText(ch, x, y);
      col++;
    }
    // Ghost cursor (an outline) and yours (solid signal), on the character each has reached.
    const [gx, gy] = where(Math.floor(ghost));
    g.strokeStyle = colors.violet;
    g.lineWidth = 1;
    g.strokeRect(gx + 0.5, gy - 9.5, CHAR, 12);
    const [ux, uy] = where(at);
    g.fillStyle = colors.signal;
    g.fillRect(ux + nudge, uy + 3, CHAR, 2);

    // The gauge: a half dial from 0 to 100 wpm, ticks every 20, the ghost's 35 marked.
    const dx = W - 46;
    const dy = H - 14;
    const angle = (v: number) => Math.PI + (Math.min(v, 100) / 100) * Math.PI;
    g.strokeStyle = colors.muted;
    g.beginPath();
    g.arc(dx, dy, 30, Math.PI, 0);
    for (let v = 0; v <= 100; v += 20) {
      g.moveTo(dx + Math.cos(angle(v)) * 26, dy + Math.sin(angle(v)) * 26);
      g.lineTo(dx + Math.cos(angle(v)) * 30, dy + Math.sin(angle(v)) * 30);
    }
    g.stroke();
    g.strokeStyle = colors.violet;
    g.beginPath();
    g.moveTo(dx + Math.cos(angle(GHOST_WPM)) * 22, dy + Math.sin(angle(GHOST_WPM)) * 22);
    g.lineTo(dx + Math.cos(angle(GHOST_WPM)) * 32, dy + Math.sin(angle(GHOST_WPM)) * 32);
    g.stroke();
    g.strokeStyle = colors.signal;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(dx, dy);
    g.lineTo(dx + Math.cos(angle(wpm())) * 24, dy + Math.sin(angle(wpm())) * 24);
    g.stroke();
    g.font = `9px ${ctx.fonts.mono}`;
    g.textAlign = "center";
    g.fillStyle = colors.ink;
    g.fillText(`${wpm()} wpm`, dx, dy + 11);
    g.textAlign = "left";
    g.fillStyle = colors.muted;
    g.fillText(started ? `${accuracy()}% accurate` : "start typing", 10, H - 14);
    g.fillStyle = colors.violet;
    g.fillText(`ghost ${GHOST_WPM} wpm`, 10, H - 3);
  });

  skip();
  return () => {};
};

export default typing;
