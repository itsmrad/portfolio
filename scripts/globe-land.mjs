/**
 * Bakes the footer globe's land into public/globe-land.bin:
 *   node scripts/globe-land.mjs path/to/ne_50m_land.geojson
 * Source: Natural Earth 1:50m land (public domain),
 * https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson
 *
 * The globe is a field of dots on rings of latitude STEP degrees apart, each
 * ring holding round(360 cos(lat) / STEP) dots (every other ring offset half
 * a step, so the field is close to hexagonal). This file decides which dots
 * are land and writes them, in ring order, as alternating sea and land run
 * lengths, each a LEB128 varint. globe.ts rebuilds the same rings.
 */
import { readFileSync, writeFileSync } from "node:fs";

export const STEP = 0.8;

const source = process.argv[2];
if (!source) throw new Error("usage: node scripts/globe-land.mjs <ne_50m_land.geojson>");
const { features } = JSON.parse(readFileSync(source, "utf8"));
const rings = features.flatMap(({ geometry }) =>
  geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat(),
);

/** Longitudes where the polygons' edges cross a latitude, sorted: land lies between pairs (even-odd). */
function crossings(lat) {
  const out = [];
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j];
      const [x2, y2] = ring[i];
      if (y1 > lat !== y2 > lat) out.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
    }
  }
  return out.sort((a, b) => a - b);
}

const bits = [];
const count = Math.round(180 / STEP);
for (let k = 0; k < count; k++) {
  const lat = 90 - (k + 0.5) * STEP;
  const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / STEP));
  const xs = crossings(lat);
  for (let j = 0; j < n; j++) {
    const lon = -180 + ((j + 0.5 + (k % 2) * 0.5) * 360) / n;
    const wrapped = lon > 180 ? lon - 360 : lon;
    let inside = false;
    for (const x of xs) {
      if (x > wrapped) break;
      inside = !inside;
    }
    bits.push(inside ? 1 : 0);
  }
}

const bytes = [];
let current = 0;
let run = 0;
const flush = () => {
  for (let value = run; ; ) {
    if (value < 128) {
      bytes.push(value);
      break;
    }
    bytes.push((value & 127) | 128);
    value >>>= 7;
  }
};
for (const bit of bits) {
  if (bit === current) run++;
  else {
    flush();
    current = bit;
    run = 1;
  }
}
flush();
writeFileSync("public/globe-land.bin", Buffer.from(bytes));
const land = bits.filter(Boolean).length;
console.log(`${bits.length} dots, ${land} land, ${bytes.length} bytes`);
