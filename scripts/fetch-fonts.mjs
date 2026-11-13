// Downloads the site's fonts from Google Fonts, subset to the characters listed
// here, into src/assets/fonts/. The woff2 files are committed, so builds never
// touch the network. Re-run (`npm run fonts`) only after changing a charset.
import { mkdir, writeFile } from "node:fs/promises";

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const PUNCTUATION = "–—‘’“”…·•×©°";

const FONTS = [
  { file: "geist-sans", family: "Geist:wght@400..600", text: ASCII + PUNCTUATION },
  // Mono carries the glyph vocabulary: arrows, infinity, key symbols, box drawing
  // (every glyph listed exists in the font; Geist has no ⌘ ⌥ ✦ ■).
  {
    file: "geist-mono",
    family: "Geist+Mono:wght@400..500",
    text: ASCII + PUNCTUATION + "←↑→↓↖↗↘↙∞≈≠≤≥▲▼●○⇧⏎│─┌┐└┘├┤┬┴┼",
  },
  { file: "instrument-serif", family: "Instrument+Serif", text: ASCII + PUNCTUATION },
  // Eyebrows and counters only: capitals, digits and the marks they use.
  {
    file: "geist-pixel",
    family: "Geist+Pixel",
    text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /.,:;+-–—·×#%&()[]",
  },
];

// A current Chrome UA makes Google serve woff2.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const out = new URL("../src/assets/fonts/", import.meta.url);
await mkdir(out, { recursive: true });

for (const { file, family, text } of FONTS) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
    { headers: { "User-Agent": UA } },
  ).then((r) => r.text());
  const url = css.match(/url\((https:[^)]+)\) format\('woff2'\)/)?.[1];
  if (!url) throw new Error(`No woff2 for ${family}:\n${css}`);
  const bytes = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  await writeFile(new URL(`${file}.woff2`, out), bytes);
  console.log(`${file}.woff2  ${(bytes.length / 1024).toFixed(1)} KB`);
}
