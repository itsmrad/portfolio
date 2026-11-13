// Renders the raster icons from the AD mark (same paths as src/app/icon.svg).
// Run with `npm run icons` after changing the mark; outputs are committed.
import { writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#09090b";
const FG = "#fafafa";

/** The mark on a solid square; `scale` is how much of the square it fills. */
const svg = (scale) => {
  const size = 32 / scale;
  const offset = (size - 32) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-offset} ${-offset} ${size} ${size}">
      <rect x="${-offset}" y="${-offset}" width="${size}" height="${size}" fill="${BG}"/>
      <g fill="none" stroke="${FG}" stroke-width="2.5" stroke-linecap="square">
        <path d="M3 26 9.5 6 16 26M5.6 19h7.8"/><path d="M20 6h5l4 4v12l-4 4h-5Z"/>
      </g>
    </svg>`,
  );
};

const png = (scale, px) => sharp(svg(scale), { density: 600 }).resize(px, px).png({ compressionLevel: 9 }).toBuffer();

const root = new URL("../", import.meta.url);
await writeFile(new URL("src/app/apple-icon.png", root), await png(0.66, 180));
await writeFile(new URL("public/icon-192.png", root), await png(0.72, 192));
await writeFile(new URL("public/icon-512.png", root), await png(0.72, 512));
// Maskable: keep the mark inside the central safe zone.
await writeFile(new URL("public/icon-maskable-512.png", root), await png(0.5, 512));

// favicon.ico: a single 32px PNG in an ICO container (6-byte header + 16-byte entry).
const icon = await png(0.78, 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(icon.length, 14);
header.writeUInt32LE(22, 18); // image offset
await writeFile(new URL("src/app/favicon.ico", root), Buffer.concat([header, icon]));
console.log("icons written");
