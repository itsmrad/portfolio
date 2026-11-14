/**
 * Writes the banner's tech glyphs into src/components/sections/hero.module.css
 * (between the `glyphs:start` and `glyphs:end` markers): each glyph is a
 * single-weight line drawing on a 24-unit grid, laid on a small isometric tile
 * in the monogram's own projection (30°, its letters' axes: across reads up and
 * to the right, down runs down and to the right), drawn as a mask so the
 * resting banner costs no element, no HTML and no script.
 *
 *   node scripts/hero-glyphs.mjs
 *
 * Edit a drawing in GLYPHS, or a placement in DESKTOP / PHONE ([id, i, j]: a
 * point of the monogram's own lattice, see below), then run it and check `npx playwright test tests/hero-glyphs.spec.ts`.
 * The jokes and colours live in src/content/glyphs.ts, keyed by the same ids.
 */
import { readFileSync, writeFileSync } from "node:fs";

const GLYPHS = {
  rust: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4M10 15.5v-7h2.6a1.9 1.9 0 0 1 0 3.8H10m2.6 0 1.9 3.2"/>',
  ts: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M6.5 10h5M9 10v7.5M18 10.8c-.4-.7-2.8-.9-2.8.6 0 1.7 3 1 3 3 0 1.5-2.6 1.6-3.3.5"/>',
  js: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M10.5 10v5.6a1.6 1.6 0 0 1-3.1.5M18 10.8c-.4-.7-2.8-.9-2.8.6 0 1.7 3 1 3 3 0 1.5-2.6 1.6-3.3.5"/>',
  python:
    '<path d="M12 3H9.5A2.5 2.5 0 0 0 7 5.5V8h5v1H5.5A2.5 2.5 0 0 0 3 11.5v2A2.5 2.5 0 0 0 5.5 16H7M12 21h2.5a2.5 2.5 0 0 0 2.5-2.5V16h-5v-1h6.5a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 18.5 8H17M7 16v-2.5A2.5 2.5 0 0 1 9.5 11h5A2.5 2.5 0 0 0 17 8.5V8"/><circle cx="9.8" cy="5.6" r=".6"/><circle cx="14.2" cy="18.4" r=".6"/>',
  react:
    '<circle cx="12" cy="12" r="1.3"/><ellipse cx="12" cy="12" rx="10" ry="3.8"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(-60 12 12)"/>',
  next: '<circle cx="12" cy="12" r="9"/><path d="M9 16.5v-9l7.5 10.8M15.2 7.5v5.6"/>',
  node: '<path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3Z"/><path d="M9.5 15.5v-4.2a2.5 2.5 0 0 1 5 0v4.2"/>',
  // A clean stack of containers on a plain hull (round 4: the old whale read poorly).
  docker: '<path d="M3 14h18c-.6 3.6-4.2 6-9 6s-8.4-2.4-9-6ZM5.5 14v-3.2h4.2V14M9.7 14v-3.2h4.2V14M13.9 14v-3.2h4.2V14M7.6 10.8V7.6h4.2v3.2M11.8 10.8V7.6H16v3.2M9.7 7.6V4.4h4.2v3.2"/>',
  git: '<circle cx="7" cy="5.5" r="2"/><circle cx="7" cy="18.5" r="2"/><circle cx="17" cy="8" r="2"/><path d="M7 7.5v9M17 10c0 4.5-10 2.5-10 6.5"/>',
  github:
    '<path d="M7 10.5c0-1 .3-2 .8-2.8L7.4 4.4l2.7 1.5a7.5 7.5 0 0 1 3.8 0l2.7-1.5-.4 3.3c.5.8.8 1.8.8 2.8 0 3.4-2.3 5.3-5 5.3s-5-1.9-5-5.3ZM10.2 15.7c-.6.7-.9 1.6-.9 2.8v2.5M13.8 15.7c.6.7.9 1.6.9 2.8v2.5M9.3 18.6c-1.9.4-3-.3-3.6-1.7"/>',
  ai: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3M9 15l1.5-6 1.5 6M9.4 13.3h2.2M14.5 9v6"/>',
  term: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M6.5 10l3 2.2-3 2.2M11.5 15.5h5"/>',
  db: '<ellipse cx="12" cy="5.8" rx="7" ry="2.6"/><path d="M5 5.8v12.4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5.8M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>',
  tailwind: '<path d="M4 10.5c1.4-2.8 3.4-3.9 6-3.2 1.7.5 2.5 2 4.2 2.3 1.9.3 3.5-.5 5.3-2.4M4 16.8c1.4-2.8 3.4-3.9 6-3.2 1.7.5 2.5 2 4.2 2.3 1.9.3 3.5-.5 5.3-2.4"/>',
};

// [id, i, j]: a point of the monogram's own lattice (its cells are 64 units along each axis; i runs up and to the
// right, j down and to the right; the letters fill i 0 to 7, j 0 to 5). Each tile is half a cell, centred there:
// the monogram's little siblings, on its plane. Half steps are allowed; keep a full step between neighbours.
const DESKTOP = [
  // a row above the A, rising like the letters
  ["rust", 1.5, -1.5],
  ["ts", 2.5, -1.5],
  ["js", 3.5, -1.5],
  ["python", 4.5, -1.5],
  // down the left edge
  ["ai", -1.5, 0.5],
  ["term", -1.5, 1.5],
  ["git", -1.5, 2.5],
  ["github", -1.5, 3.5],
  // under the monogram, and two at the right
  ["react", 1.5, 6.5],
  ["next", 2.5, 6.5],
  ["node", 3.5, 6.5],
  ["docker", 2.5, 7.5],
  ["db", 8.5, 2],
  ["tailwind", 6.5, 0],
];
const DRIFT = ["docker", "db", "tailwind"];
// Below 40rem the stickers take the top left and bottom right corners: four tiles in the paper left between.
const PHONE = [
  ["ts", -1, 3],
  ["term", -1, 4],
  ["docker", 2, 6.5],
  ["react", 3, 6],
];

// The monogram's lattice (hero-monogram.tsx): a cell runs 55.43 across and 32 down per axis, on a 555.26-wide box.
const [DX, DY, VW] = [55.4256, 32, 555.26];
// A tile's top face is half a cell wide: its drawing (54 units, face 52) at that size, in % of the monogram's width.
const TILE = ((DX * 54) / 52 / VW) * 100;
// The tile's top-left corner, in cqw, for a tile centred on lattice point (i, j); its face centre is 42.1% down.
const at = (i, j, origin) => {
  const cx = (((i + j - 1) * DX + 0.5) / VW) * 100;
  const cy = (((j - i + 6) * DY + 0.5) / VW) * 100;
  // The layer starts at the banner's top (PAD above the monogram), so tiles above the letters are not cut off.
  return `${(cx - TILE / 2 - origin).toFixed(2)}cqw calc(var(--pad) + ${(cy - 0.421 * ((TILE * 38) / 54)).toFixed(2)}cqw)`;
};
const C = Math.cos(Math.PI / 6);
const S = 0.5;
const HALF = 15; // the tile's top face: a square of 30 units in the plane
const DEEP = 6; // its thickness on screen
const K = 1.02 * (HALF / 12); // a 24-unit glyph on the face, nearly filling it
const VIEW = [-27, -16, 54, 38]; // the tile's drawing box
const LINE = 1.2; // px of line on screen, for the tile and the glyph alike
const PX = { desktop: 478 / 100, phone: 340 / 100 }; // px per % of the monogram's width

const px = (x, y) => [((x + y) * C).toFixed(2), ((y - x) * S).toFixed(2)];
const face = [px(-HALF, -HALF), px(HALF, -HALF), px(HALF, HALF), px(-HALF, HALF)];
const [left, top, right, bottom] = face;
const tile = (sw) =>
  `<path stroke-width="${sw}" d="M${left}L${top}L${right}L${bottom}ZM${left}V${+left[1] + DEEP}L${bottom[0]} ${+bottom[1] + DEEP}L${right[0]} ${+right[1] + DEEP}V${right[1]}M${bottom}V${+bottom[1] + DEEP}"/>`;
// The glyph's axes on the plane: across runs up and to the right, down runs down and to the right.
const matrix = `matrix(${(C * K).toFixed(4)} ${(-S * K).toFixed(4)} ${(C * K).toFixed(4)} ${(S * K).toFixed(4)} ${(-24 * C * K).toFixed(3)} 0)`;

function svg(id, sizePercent, pxPer) {
  const unit = (sizePercent * pxPer) / VIEW[2]; // screen px per drawing unit
  const sw = (LINE / unit).toFixed(2);
  // Lines inside the projection are foreshortened by about K: compensate so they draw as heavy as the tile.
  const gw = (LINE / unit / K).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.join(" ")}" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">${tile(sw)}<g transform="${matrix}" stroke-width="${gw}">${GLYPHS[id]}</g></svg>`;
}
// Only what a quoted CSS url() needs escaped: about half the size of encodeURIComponent.
const uri = (s) => `url("data:image/svg+xml,${s.replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
// The filled outline of a tile, for the press layer's paper knock-out.
const SILHOUETTE = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.join(" ")}"><path d="M${left}L${top}L${right}V${+right[1] + DEEP}L${bottom[0]} ${+bottom[1] + DEEP}L${left[0]} ${+left[1] + DEEP}Z" stroke="#000" stroke-width="1.5"/></svg>`,
);

function layers(list, origin, pxPer, indent) {
  // Two layers: the second drifts a little (quiet idle motion), and only tiles standing alone, so rows stay in line.
  const split = [list.filter(([id]) => !DRIFT.includes(id)), list.filter(([id]) => DRIFT.includes(id))];
  return split
    .map((items, n) => {
      const sel = n ? ".mark::after" : ".mark::before";
      return `${indent}${sel} {
${indent}  /* ${items.map(([id]) => id).join(", ")} */
${indent}  mask-image:
${indent}    ${items.map(([id]) => uri(svg(id, TILE, pxPer))).join(`,\n${indent}    `)};
${indent}  mask-position:
${indent}    ${items.map(([, i, j]) => at(i, j, origin)).join(`,\n${indent}    `)};
${indent}  mask-size: ${items.map(() => `${TILE.toFixed(3)}cqw auto`).join(", ")};
${indent}}
`;
    })
    .concat(
      `${indent}.mark {
${indent}  /* Read by the press code (components/sections/glyphs.ts): which glyph each mask layer draws. */
${indent}  --glyphs-before: "${split[0].map(([id]) => id).join(" ")}";
${indent}  --glyphs-after: "${split[1].map(([id]) => id).join(" ")}";
${indent}}
`,
    )
    .join("");
}

const css = `/* glyphs:start (generated by scripts/hero-glyphs.mjs: edit there, then run it) */
/* --- Tech glyphs on the banner's plane (round 4, R23) -----------------------
   Each glyph lies on a small isometric tile in the monogram's own projection,
   drawn as masks on two layers of the monogram's box: no element, no HTML, no
   script at rest. Positions are in units of the monogram's width (cqw) and hold
   from 40rem, where the column is fixed; below that a smaller set keeps clear
   of the stickers. The second layer drifts 2px, slowly; reduced motion holds
   it still. Pressing a tile (effects.ts, then glyphs.ts) dips it, colours it,
   plays its note and shows a joke from content/glyphs.ts. Kept off the
   monogram, its guides, its 30° note, the stickers and each other:
   tests/hero-glyphs.spec.ts. */
.mark {
  position: relative;
  container-type: inline-size;
  --glyph-silhouette: ${SILHOUETTE};
}
.mark::before,
.mark::after {
  content: "";
  position: absolute;
  /* From the banner's top: the monogram starts --pad below it. */
  --pad: 2.5rem;
  top: 0;
  left: calc(1rem - 30cqw);
  width: 130cqw;
  height: calc(var(--pad) + 100cqw * 385 / 555.26);
  background: color-mix(in oklab, var(--cross) 80%, transparent);
  mask-repeat: no-repeat;
  pointer-events: none;
}
.mark::after {
  animation: glyph-drift 7s ease-in-out infinite alternate;
}
@keyframes glyph-drift {
  to {
    translate: 0 -2px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mark::after {
    animation: none;
  }
}
${layers(DESKTOP, -30, PX.desktop, "")}@media (max-width: 39.99rem) {
  .mark::before,
  .mark::after {
    --pad: 1.5rem;
    left: 1rem;
    width: 100cqw;
  }
${layers(PHONE, 0, PX.phone, "  ")}}
/* glyphs:end */
`;

const file = new URL("../src/components/sections/hero.module.css", import.meta.url);
const current = readFileSync(file, "utf8");
const start = current.indexOf("/* glyphs:start");
const end = current.indexOf("/* glyphs:end */");
// The first run replaces round 3's hand-written block (from its heading to the end of the file).
const from = start >= 0 ? start : current.indexOf("/* --- Tech glyphs in the banner's empty paper");
const to = end >= 0 ? end + "/* glyphs:end */\n".length : current.length;
writeFileSync(file, current.slice(0, from) + css + current.slice(to));
console.log(`${DESKTOP.length} glyphs on desktop, ${PHONE.length} on phones; ${css.length} bytes of CSS`);
