import { prefersReducedMotion } from "./dom";
import type { Visitors } from "./visitors";

const DEG = Math.PI / 180;
// The Earth's axial tilt: the axis leans this far from the sheet's vertical, always.
const TILT = 23.44 * DEG;
// Dot rings this far apart; must match scripts/globe-land.mjs, which baked public/globe-land.bin.
const STEP = 0.8;
const LAND_URL = "/globe-land.bin";
// New Delhi, Anupam's pin.
const HOME = { lat: 28.61, lon: 77.21 };
const SPIN = (2 * Math.PI) / 150_000; // radians per ms about the axis: one turn in two and a half minutes
const IDLE_FRAME = 80; // ms between idle-spin frames: under a pixel of travel each at this speed, a fifth of the work of 60 fps
const RESUME = 6000; // the idle spin comes back this long after the last touch
const FRICTION = 0.005; // inertia decays by e every 200 ms
const EASE = 160; // ms time constant of eased turns (keys, home)
const KEY_STEP = 15 * DEG;
const SLOP = 8; // px a touch moves before it counts as a turn or a scroll
const REVEAL = 900; // ms for the visitor dots to fade in
const DPR_CAP = 2;
const DOT = 0.34; // a land dot's largest radius, as a share of the dot spacing
// Land dots are stamped from precomputed coverage: radii in steps of 1/LEVELS px, centres in steps of 1/SUB px.
const LEVELS = 8;
const SUB = 4;
// Labels keep this far (CSS px) from the stage's edges and from each other.
const MARGIN = 8;
const GAP = 14;
// Where a tag may go relative to its dot, in order of preference: [x side, y side].
const SIDES = [
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, 1],
] as const;
const HINT_SEEN = "globe-turned";

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number; z: number };
type Ink = "line" | "cross" | "muted" | "ink" | "signal" | "accent" | "paper" | "dimension" | "note";

const overlaps = (a: Rect, b: Rect, pad = 4) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));

/** A unit vector for a place, in the Earth's frame: y to the north pole, z out through 0°, 0°. */
export function unit(latitude: number, longitude: number): [number, number, number] {
  const [phi, lambda] = [latitude * DEG, longitude * DEG];
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
}

/**
 * The view: turn `yaw` about the axis, tip the north pole `pitch` toward the
 * viewer, then lean the axis by the tilt in the sheet's plane. Row-major 3x3,
 * mapping Earth coordinates to the sheet (x right, y up, z toward the viewer).
 */
export function orient(yaw: number, pitch: number): number[] {
  const [ys, yc, ps, pc, rs, rc] = [Math.sin(yaw), Math.cos(yaw), Math.sin(pitch), Math.cos(pitch), Math.sin(TILT), Math.cos(TILT)];
  // Yaw about y, then pitch about x, then roll about z (clockwise, so the north pole leans right).
  const yawed = [yc, 0, ys, 0, 1, 0, -ys, 0, yc];
  const pitched = [1, 0, 0, 0, pc, -ps, 0, ps, pc];
  const rolled = [rc, rs, 0, -rs, rc, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) =>
    Array.from({ length: 9 }, (_, i) => a[i - (i % 3)]! * b[i % 3]! + a[i - (i % 3) + 1]! * b[(i % 3) + 3]! + a[i - (i % 3) + 2]! * b[(i % 3) + 6]!);
  return mul(rolled, mul(pitched, yawed));
}

/** The view that puts a place at the centre of the disc, tipped no further than keeps the globe upright. */
export const facing = (latitude: number, longitude: number) => ({ yaw: -longitude * DEG, pitch: clamp(latitude, -30, 45) * DEG });

/** The land dots' unit vectors, rebuilt from the baked run lengths (sea, land, sea, ...). */
function landDots(bytes: Uint8Array) {
  const runs: number[] = [];
  for (let i = 0, value = 0, shift = 0; i < bytes.length; i++) {
    value |= (bytes[i]! & 127) << shift;
    shift += 7;
    if (bytes[i]! < 128) {
      runs.push(value);
      value = shift = 0;
    }
  }
  const dots: number[] = [];
  let index = 0;
  let run = 0;
  let left = runs[0] ?? 0;
  const rings = Math.round(180 / STEP);
  for (let k = 0; k < rings; k++) {
    const latitude = 90 - (k + 0.5) * STEP;
    const n = Math.max(1, Math.round((360 * Math.cos(latitude * DEG)) / STEP));
    for (let j = 0; j < n; j++, index++) {
      while (left === 0 && run < runs.length - 1) left = runs[++run]!;
      left--;
      if (run % 2) dots.push(...unit(latitude, -180 + ((j + 0.5 + (k % 2) * 0.5) * 360) / n));
    }
  }
  return new Float32Array(dots);
}

/** A CSS colour (any syntax, tokens included) as [r, g, b]. */
function rgb(probe: HTMLElement, value: string) {
  probe.style.color = value;
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = getComputedStyle(probe).color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b] as const;
}

/**
 * Starts the footer globe in `stage`: the whole Earth as a field of dots,
 * leaning on its 23.4° axis, drawn like a figure on the sheet (centre line,
 * angle callout, equator and tropic as construction lines), with the visitor
 * map on it. Drag, inertia, arrow keys, double-click home, and a slow idle
 * spin. It draws only when something changed and stops off screen or with
 * the tab hidden. Returns a cleanup.
 */
export function mountGlobe(stage: HTMLElement) {
  const figure = stage.parentElement!;
  const canvas = stage.querySelector("canvas")!;
  const labels = Object.fromEntries([...stage.querySelectorAll<HTMLElement>("[data-label]")].map((tag) => [tag.dataset.label!, tag]));
  const caption = figure.querySelector<HTMLElement>("[data-caption]");
  const reset = figure.querySelector<HTMLButtonElement>("[data-reset]");
  const context = canvas.getContext("2d")!;
  const copy = stage.dataset;

  let land = new Float32Array(0);
  // The land is stamped pixel by pixel into its own layer: far cheaper than thousands of canvas arcs.
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d")!;
  let pixels = new ImageData(1, 1);
  let words = new Uint32Array(1);
  let landInk = 0;
  let ratio = 1;
  // Stamp k (radius step * SUB² + row offset * SUB + column offset) covers stampStart[k] to stampStart[k + 1].
  let stampStart = new Uint32Array(1);
  let stampOffset = new Int32Array(0);
  let stampAlpha = new Uint8Array(0);
  let inks = {} as Record<Ink, string>;
  let font = "monospace";
  let [width, height, radius, cx, cy] = [0, 0, 0, 0, 0];
  let visitors: Visitors = { cells: [] };
  let revealedAt = 0;

  // The view, and how it is moving.
  const home = () => {
    const you = visitors.you;
    if (!you || (visitors.distance && "same" in visitors.distance)) return facing(HOME.lat, HOME.lon);
    // Both in view where they can be: face the middle of the great circle between them.
    const [a, b] = [unit(HOME.lat, HOME.lon), unit(you[0], you[1])];
    const middle = a.map((value, i) => value + b[i]!);
    const length = Math.hypot(...middle);
    if (length < 0.35) return facing(you[0], you[1]);
    return facing(Math.asin(middle[1]! / length) / DEG, Math.atan2(middle[0]!, middle[2]!) / DEG);
  };
  let { yaw, pitch } = home();
  let velocity = { yaw: 0, pitch: 0 };
  let target: { yaw: number; pitch: number } | null = null;
  // A touch is only a turn once its first few pixels go mostly sideways (`decided`); until then it may be a scroll.
  let drag: { id: number; x: number; y: number; at: number; decided: boolean } | null = null;
  let quietSince = -Infinity;
  let moved = false;
  let hint = true;
  try {
    hint = !localStorage.getItem(HINT_SEEN);
  } catch {}

  let visible = false;
  let frame = 0;
  let timer = 0;
  let last = 0;
  // What the labels must stay clear of, gathered while drawing.
  let obstacles: Rect[] = [];
  const sizes: Record<string, { w: number; h: number }> = {};
  const placed: Record<string, number> = {};

  const readInks = () => {
    const names: Record<Ink, string> = {
      line: "var(--line)",
      cross: "var(--cross)",
      muted: "var(--muted-foreground)",
      ink: "var(--foreground)",
      signal: "var(--signal)",
      accent: "var(--accent)",
      paper: "var(--background)",
      dimension: "var(--dimension)",
      note: "var(--dimension-foreground)",
    };
    const colours = Object.entries(names).map(([name, value]) => [name, rgb(canvas, value)] as const);
    inks = Object.fromEntries(colours.map(([name, [r, g, b]]) => [name, `rgb(${r} ${g} ${b})`])) as Record<Ink, string>;
    const [r, g, b] = colours.find(([name]) => name === "ink")![1];
    // As a little-endian RGBA word, alpha left out.
    landInk = r | (g << 8) | (b << 16);
    canvas.style.color = "";
    if (caption) font = getComputedStyle(caption).fontFamily;
  };

  const measure = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    // The same sphere the CSS reserves room for (finale.module.css).
    radius = Math.min(width * 0.36, 180);
    [cx, cy] = [width / 2, height / 2];
    canvas.width = Math.round(width * Math.min(DPR_CAP, devicePixelRatio || 1));
    canvas.height = Math.round((height * canvas.width) / width);
    ratio = canvas.width / width;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const reach = radius * STEP * DEG * DOT * ratio + 0.5;
    const side = (layer.width = layer.height = Math.ceil(2 * radius * ratio + 2 * reach) + 4);
    pixels = layerContext.createImageData(side, side);
    words = new Uint32Array(pixels.data.buffer);
    // Every stamp: the anti-aliased coverage of a dot, as (offset in the layer, alpha) pairs.
    const [starts, offsets, alphas] = [[] as number[], [] as number[], [] as number[]];
    const pad = Math.ceil(reach) + 1;
    for (let level = 0; level <= Math.ceil(reach * LEVELS); level++) {
      for (let fy = 0; fy < SUB; fy++) {
        for (let fx = 0; fx < SUB; fx++) {
          starts.push(offsets.length);
          for (let dy = -pad; dy <= pad; dy++) {
            for (let dx = -pad; dx <= pad; dx++) {
              const cover = level / LEVELS - Math.hypot(dx + 0.5 - (fx + 0.5) / SUB, dy + 0.5 - (fy + 0.5) / SUB);
              if (cover <= 0) continue;
              offsets.push(dy * side + dx);
              alphas.push(Math.min(255, Math.round(cover * 255)));
            }
          }
        }
      }
    }
    starts.push(offsets.length);
    [stampStart, stampOffset, stampAlpha] = [new Uint32Array(starts), new Int32Array(offsets), new Uint8Array(alphas)];
    for (const [name, tag] of Object.entries(labels)) sizes[name] = { w: tag.offsetWidth, h: tag.offsetHeight };
  };

  /** Sheet position (CSS px) and depth (z > 0 faces the viewer) of a unit vector under the view `m`. */
  const at = (m: number[], [x, y, z]: readonly number[]): Point => ({
    x: cx + radius * (m[0]! * x! + m[1]! * y! + m[2]! * z!),
    y: cy - radius * (m[3]! * x! + m[4]! * y! + m[5]! * z!),
    z: m[6]! * x! + m[7]! * y! + m[8]! * z!,
  });

  /** A path along points on the sphere, broken where it goes behind. */
  const along = (m: number[], points: number[][]) => {
    context.beginPath();
    let pen = false;
    for (const point of points) {
      const p = at(m, point);
      if (p.z < 0) pen = false;
      else if (pen) context.lineTo(p.x, p.y);
      else {
        context.moveTo(p.x, p.y);
        pen = true;
      }
    }
  };
  const parallel = (latitude: number) => Array.from({ length: 121 }, (_, i) => unit(latitude, i * 3));
  const meridian = (longitude: number) => Array.from({ length: 61 }, (_, i) => unit(i * 3 - 90, longitude));
  // A graticule every 30°, and the equator and the Tropic of Cancer (23.4°N, the tilt again).
  const graticule = [...Array.from({ length: 12 }, (_, i) => meridian(i * 30)), ...[-60, -30, 30, 60].map(parallel)];
  const construction = [0, 23.44].map(parallel);

  const text = (value: string, x: number, y: number, align: CanvasTextAlign = "center") => {
    context.textAlign = align;
    context.fillText(value, x, y);
    const w = context.measureText(value).width;
    obstacles.push({ x: align === "center" ? x - w / 2 : align === "right" ? x - w : x, y: y - 6, w, h: 12 });
  };

  const arrow = (x: number, y: number, angle: number) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-7, -2.5);
    context.lineTo(-7, 2.5);
    context.closePath();
    context.fill();
    context.restore();
  };

  const draw = () => {
    if (!width) return;
    const m = orient(yaw, pitch);
    obstacles = [];
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.font = `10px ${font}`;
    context.letterSpacing = "1px";
    context.textBaseline = "middle";

    // The graticule, faint, on the near side only.
    context.strokeStyle = inks.line;
    context.setLineDash([]);
    for (const line of graticule) {
      along(m, line);
      context.stroke();
    }

    // Land: one dot per baked cell, smaller toward the limb and away from the light (upper left).
    // Dot radii in device pixels; the layer sits on whole device pixels so nothing is resampled.
    const side = layer.width;
    const big = radius * STEP * DEG * DOT * ratio;
    const scale = radius * ratio;
    const [ox, oy] = [Math.round(cx * ratio - side / 2), Math.round(cy * ratio - side / 2)];
    const [hx, hy] = [cx * ratio - ox, cy * ratio - oy];
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = m as [number, number, number, number, number, number, number, number, number];
    words.fill(0);
    for (let i = 0; i < land.length; i += 3) {
      const [x, y, z] = [land[i]!, land[i + 1]!, land[i + 2]!];
      const depth = m6 * x + m7 * y + m8 * z;
      if (depth <= 0.02) continue;
      const sx = m0 * x + m1 * y + m2 * z;
      const sy = m3 * x + m4 * y + m5 * z;
      // Full dots facing the viewer, thinning toward the limb, a little fuller toward the light.
      const light = clamp(0.15 + 0.85 * Math.sqrt(depth) - 0.2 * sx + 0.15 * sy, 0, 1);
      const reach = big * (0.25 + 0.75 * light) + 0.5;
      const [px, py] = [hx + scale * sx, hy - scale * sy];
      const [column, row] = [Math.floor(px), Math.floor(py)];
      // Anti-aliased and crisp at any pixel ratio; the darker wins where two dots meet.
      const stamp = Math.round(reach * LEVELS) * SUB * SUB + (((py - row) * SUB) | 0) * SUB + (((px - column) * SUB) | 0);
      const base = row * side + column;
      for (let k = stampStart[stamp]!, end = stampStart[stamp + 1]!; k < end; k++) {
        const index = base + stampOffset[k]!;
        const alpha = stampAlpha[k]!;
        if (alpha > words[index]! >>> 24) words[index] = (alpha << 24) | landInk;
      }
    }
    layerContext.putImageData(pixels, 0, 0);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(layer, ox, oy);
    context.restore();

    // The equator and the tropic as dashed construction lines.
    context.strokeStyle = inks.dimension;
    context.setLineDash([4, 3]);
    for (const line of construction) {
      along(m, line);
      context.stroke();
    }
    context.setLineDash([]);

    // The limb.
    context.strokeStyle = inks.cross;
    context.beginPath();
    context.arc(cx, cy, radius, 0, 2 * Math.PI);
    context.stroke();

    drawAxis(m);
    drawMap(m);
    if (hint) drawHint();
    stage.dataset.drawn = "";
    placeLabels(m);
  };

  /** The axis as a centre line through the poles, its 23.4° from the vertical, and N and S. */
  const drawAxis = (m: number[]) => {
    const reach = radius * 1.17;
    // Up the axis on the sheet: the tilt from vertical, north pole leaning right.
    const [ax, ay] = [Math.sin(TILT), -Math.cos(TILT)];
    context.strokeStyle = context.fillStyle = inks.dimension;
    context.setLineDash([12, 3, 2, 3]);
    context.beginPath();
    for (const sign of [1, -1]) {
      const pole = at(m, [0, sign, 0]);
      // The axis shows from a pole on the near side, and beyond the limb from one behind.
      const from = pole.z >= 0 ? Math.hypot(pole.x - cx, pole.y - cy) : radius;
      context.moveTo(cx + sign * ax * from, cy + sign * ay * from);
      context.lineTo(cx + sign * ax * reach, cy + sign * ay * reach);
      if (pole.z >= 0) {
        // A tick across the axis where the pole is.
        context.moveTo(pole.x - ay * 4, pole.y + ax * 4);
        context.lineTo(pole.x + ay * 4, pole.y - ax * 4);
      }
    }
    context.stroke();
    context.setLineDash([]);

    // The vertical reference, the arc between it and the axis with an arrow at each end, and the value.
    const arc = radius * 1.1;
    context.beginPath();
    context.moveTo(cx, cy - radius - 4);
    context.lineTo(cx, cy - arc - 8);
    context.moveTo(cx, cy - arc);
    context.arc(cx, cy, arc, -Math.PI / 2, -Math.PI / 2 + TILT);
    context.stroke();
    arrow(cx, cy - arc, Math.PI);
    arrow(cx + Math.sin(TILT) * arc, cy - Math.cos(TILT) * arc, TILT);
    context.fillStyle = inks.note;
    const half = TILT / 2;
    text("23.4°", cx + Math.sin(half) * (arc + 16), cy - Math.cos(half) * (arc + 16));
    obstacles.push({ x: cx, y: cy - arc - 8, w: Math.sin(TILT) * arc, h: arc * (1 - Math.cos(TILT)) + 8 });
    text("N", cx + ax * (reach + 9), cy + ay * (reach + 9));
    text("S", cx - ax * (reach + 9), cy - ay * (reach + 9));
  };

  /** "drag to turn", with a curved arrow along the limb; gone after the first turn. */
  const drawHint = () => {
    const r = radius + 10;
    // Lower right, clear of the axis's south end.
    const [from, to] = [Math.PI * 0.4, Math.PI * 0.2];
    context.strokeStyle = context.fillStyle = inks.dimension;
    context.beginPath();
    context.arc(cx, cy, r, to, from);
    context.stroke();
    arrow(cx + Math.cos(to) * r, cy + Math.sin(to) * r, to - Math.PI / 2);
    context.fillStyle = inks.note;
    text(copy.hint ?? "", cx + Math.cos(from) * r + 4, cy + Math.sin(from) * r + 12, "left");
  };

  /** Visitors (accent), the great circle from this visitor to Anupam, Anupam's pin (ink) and you (signal). */
  const drawMap = (m: number[]) => {
    const reveal = prefersReducedMotion() || !revealedAt ? 1 : Math.min(1, (performance.now() - revealedAt) / REVEAL);
    const fade = (z: number) => clamp(z / 0.12, 0, 1);
    let drawn = 0;
    context.fillStyle = inks.accent;
    for (const [latitude, longitude, count] of visitors.cells) {
      const p = at(m, unit(latitude, longitude));
      if (p.z <= 0) continue;
      context.globalAlpha = fade(p.z) * reveal * (0.65 + 0.35 * Math.min(1, Math.log10(count) / 2));
      context.beginPath();
      // Gently larger with more visits: 1.3 to 2.5 px.
      context.arc(p.x, p.y, 1.3 + Math.min(1.2, Math.log2(count) / 5), 0, 2 * Math.PI);
      context.fill();
      drawn++;
    }
    context.globalAlpha = 1;
    if (stage.dataset.visitors !== String(drawn)) stage.dataset.visitors = String(drawn);

    const pin = (place: readonly [number, number], ink: string, size: number, alpha = 1) => {
      const p = at(m, unit(...place));
      if (p.z <= 0) return;
      context.globalAlpha = fade(p.z) * alpha;
      context.fillStyle = inks.paper;
      context.beginPath();
      context.arc(p.x, p.y, size + 1.5, 0, 2 * Math.PI);
      context.fill();
      context.fillStyle = ink;
      context.beginPath();
      context.arc(p.x, p.y, size, 0, 2 * Math.PI);
      context.fill();
      context.globalAlpha = 1;
    };

    const you = visitors.you;
    if (you && !(visitors.distance && "same" in visitors.distance)) {
      // The shortest way between them, sampled along the great circle.
      const [a, b] = [unit(HOME.lat, HOME.lon), unit(...you)];
      const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
      if (omega > 0.01) {
        const points = Array.from({ length: 49 }, (_, i) => {
          const t = i / 48;
          const [s, u] = [Math.sin((1 - t) * omega) / Math.sin(omega), Math.sin(t * omega) / Math.sin(omega)];
          return a.map((value, j) => s * value + u * b[j]!);
        });
        // Dashed in the visitor's blue over a paper halo, so it reads over land and sea alike.
        along(m, points);
        context.globalAlpha = reveal;
        context.strokeStyle = inks.paper;
        context.lineWidth = 3;
        context.stroke();
        context.strokeStyle = inks.signal;
        context.lineWidth = 1.25;
        context.setLineDash([4, 3]);
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = 1;
        context.globalAlpha = 1;
      }
    }
    pin([HOME.lat, HOME.lon], inks.ink, 2.6);
    if (you) pin(you, inks.signal, 3, reveal);
  };

  /**
   * Puts each label beside its dot: the first side (keeping last frame's when
   * it still fits) whose tag stays inside the stage and meets no other tag,
   * dot or annotation. A label with nowhere to go, or whose dot has gone
   * behind the Earth, is hidden, never squeezed.
   */
  const placeLabels = (m: number[]) => {
    const anchor = (place: readonly [number, number]) => {
      const p = at(m, unit(...place));
      return p.z > 0.08 ? p : null;
    };
    const homeDot = anchor([HOME.lat, HOME.lon]);
    const you = visitors.you ? anchor(visitors.you) : null;
    // One tag for both only when the server says it is the same cell; near is not the same.
    const same = !!visitors.you && !!visitors.distance && "same" in visitors.distance;
    const spots: Record<string, Point | null> = same ? { home: homeDot ?? you, you: null } : { home: homeDot, you };
    const dots = [homeDot, you].filter((dot) => dot !== null);
    const taken: Rect[] = [...obstacles];
    if (reset && !reset.hidden) taken.push({ x: reset.offsetLeft - stage.offsetLeft, y: reset.offsetTop - stage.offsetTop, w: reset.offsetWidth, h: reset.offsetHeight });
    for (const name of ["home", "you"]) {
      const tag = labels[name];
      if (!tag) continue;
      // Anupam's tag says "you're both here" while this visitor shares his place.
      const value = same && name === "home" ? tag.dataset.both : tag.dataset.text;
      if (value && tag.textContent !== value) {
        tag.textContent = value;
        sizes[name] = { w: tag.offsetWidth, h: tag.offsetHeight };
      }
      const spot = spots[name];
      const { w, h } = sizes[name] ?? { w: 0, h: 0 };
      let chosen = -1;
      let rect: Rect | null = null;
      if (spot) {
        for (const side of [placed[name] ?? 0, ...SIDES.keys()]) {
          const [sx, sy] = SIDES[side]!;
          const x = sx > 0 ? spot.x + GAP : spot.x - GAP - w;
          const y = sy < 0 ? spot.y - GAP * 0.6 - h : sy > 0 ? spot.y + GAP * 0.6 : spot.y - h / 2;
          const candidate = { x, y, w, h };
          const inside = x >= MARGIN && y >= MARGIN && x + w <= width - MARGIN && y + h <= height - MARGIN;
          if (
            inside &&
            !taken.some((other) => overlaps(candidate, other)) &&
            !dots.some((dot) => overlaps(candidate, { x: dot.x - 4, y: dot.y - 4, w: 8, h: 8 }, 2))
          ) {
            [chosen, rect] = [side, candidate];
            break;
          }
        }
      }
      if (!spot || !rect) {
        delete tag.dataset.shown;
        continue;
      }
      placed[name] = chosen;
      taken.push(rect);
      // The leader runs from the tag's corner nearest the dot to the dot.
      const [sx, sy] = SIDES[chosen]!;
      const cornerX = sx > 0 ? 0 : rect.w;
      const cornerY = sy < 0 ? rect.h : sy > 0 ? 0 : rect.h / 2;
      const dx = spot.x - (rect.x + cornerX);
      const dy = spot.y - (rect.y + cornerY);
      tag.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      tag.style.setProperty("--lx", `${cornerX - 1}px`);
      tag.style.setProperty("--ly", `${cornerY - 1}px`);
      tag.style.setProperty("--len", `${Math.hypot(dx, dy)}px`);
      tag.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
      tag.dataset.shown = "";
    }
  };

  /** The caption (what the dots are, this visitor's distance) and the figure's text alternative. */
  const describe = () => {
    const facts = [copy.alt];
    const distance = visitors.distance;
    let line = "";
    if (distance) {
      line =
        "same" in distance
          ? (copy.same ?? "")
          : (copy.distance ?? "")
              .replace("{n}", new Intl.NumberFormat("en").format(distance.value))
              .replace("{unit}", (distance.unit === "mi" ? copy.mi : copy.km) ?? distance.unit);
    }
    if (visitors.total !== undefined) {
      facts.push(
        (copy.altVisitors ?? "")
          .replace("{total}", new Intl.NumberFormat("en").format(visitors.total))
          .replace("{live}", String(Math.max(1, visitors.live ?? 1)))
          .replace("{places}", String(visitors.cells.length)),
      );
      if (caption) {
        caption.dataset.shown = "";
        const slot = caption.querySelector<HTMLElement>("[data-distance-line]");
        if (slot) slot.textContent = line;
      }
    }
    if (line) facts.push(line);
    facts.push(copy.altKeys);
    stage.setAttribute("aria-label", facts.filter(Boolean).join(". "));
  };

  /* --- Motion ------------------------------------------------------------ */

  const spinning = (now: number) => !prefersReducedMotion() && !drag && now - quietSince > RESUME;
  const settled = () => !drag && !target && Math.abs(velocity.yaw) + Math.abs(velocity.pitch) < 1e-5;

  const step = (now: number) => {
    frame = 0;
    const dt = Math.min(64, last ? now - last : 16);
    last = now;
    if (target) {
      const k = prefersReducedMotion() ? 1 : 1 - Math.exp(-dt / EASE);
      yaw += wrap(target.yaw - yaw) * k;
      pitch += (target.pitch - pitch) * k;
      if (Math.abs(wrap(target.yaw - yaw)) + Math.abs(target.pitch - pitch) < 0.0005) {
        ({ yaw, pitch } = target);
        target = null;
      }
    } else if (!drag && !settled()) {
      yaw += velocity.yaw * dt;
      pitch = clamp(pitch + velocity.pitch * dt, -Math.PI / 2, Math.PI / 2);
      const decay = Math.exp(-dt * FRICTION);
      velocity = { yaw: velocity.yaw * decay, pitch: velocity.pitch * decay };
    } else if (spinning(now)) yaw += dt * SPIN;
    yaw = wrap(yaw);
    draw();
    schedule(now);
  };

  /** Asks for the next frame: at once while anything moves, at the idle cadence while spinning, else none. */
  const schedule = (now = performance.now()) => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    frame = 0;
    // While dragging, frames follow the pointer's moves.
    if (!visible || document.hidden || drag) {
      last = 0;
      return;
    }
    const revealing = revealedAt && now - revealedAt < REVEAL;
    if (!settled() || revealing) frame = requestAnimationFrame(step);
    else if (!prefersReducedMotion()) {
      const wait = Math.max(IDLE_FRAME, quietSince + RESUME - now);
      if (wait > IDLE_FRAME) last = 0;
      timer = window.setTimeout(() => (frame = requestAnimationFrame(step)), wait);
    } else last = 0;
  };

  const touched = () => {
    quietSince = performance.now();
    if (reset) reset.hidden = false;
  };
  const turned = () => {
    if (!hint) return;
    hint = false;
    try {
      localStorage.setItem(HINT_SEEN, "1");
    } catch {}
  };

  /** Turns smoothly to a view (instantly under reduced motion). */
  const turnTo = (view: { yaw: number; pitch: number }) => {
    velocity = { yaw: 0, pitch: 0 };
    target = { yaw: view.yaw, pitch: clamp(view.pitch, -Math.PI / 2, Math.PI / 2) };
    schedule();
  };

  // Drag: the surface under the pointer follows it. Moves are read in the
  // axis's own frame, so sideways turns the Earth about its axis and along the
  // axis tips it toward or away. On touch, `touch-action: pan-y` hands
  // vertical-first swipes to the page, so it always scrolls.
  const grab = (event: PointerEvent) => {
    velocity = { yaw: 0, pitch: 0 };
    target = null;
    stage.setPointerCapture?.(event.pointerId);
    stage.dataset.dragging = "";
    touched();
  };
  const down = (event: PointerEvent) => {
    if (drag || (event.pointerType === "mouse" && event.button !== 0)) return;
    const decided = event.pointerType !== "touch";
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, decided };
    if (decided) grab(event);
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const [dx, dy] = [event.clientX - drag.x, event.clientY - drag.y];
    if (!drag.decided) {
      if (Math.hypot(dx, dy) < SLOP) return;
      // Mostly vertical: the page's scroll, which the browser takes over (touch-action: pan-y).
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag = null;
        return;
      }
      drag.decided = true;
      grab(event);
    }
    const dt = Math.max(1, event.timeStamp - drag.at);
    drag = { ...drag, x: event.clientX, y: event.clientY, at: event.timeStamp };
    const across = (dx * Math.cos(TILT) + dy * Math.sin(TILT)) / radius;
    const along = (dy * Math.cos(TILT) - dx * Math.sin(TILT)) / radius;
    yaw = wrap(yaw + across);
    pitch = clamp(pitch + along, -Math.PI / 2, Math.PI / 2);
    // Smoothed, so the release carries the hand's recent speed.
    velocity = { yaw: velocity.yaw * 0.5 + (across / dt) * 0.5, pitch: velocity.pitch * 0.5 + (along / dt) * 0.5 };
    if (!moved && Math.hypot(dx, dy) > 0) {
      moved = true;
      turned();
    }
    touched();
    if (!frame) frame = requestAnimationFrame(step);
  };
  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    // A hand that stopped before letting go throws nothing; nor does a cancelled gesture or reduced motion.
    if (event.type === "pointercancel" || event.timeStamp - drag.at > 80 || prefersReducedMotion()) velocity = { yaw: 0, pitch: 0 };
    const decided = drag.decided;
    drag = null;
    delete stage.dataset.dragging;
    if (decided) touched();
    schedule();
  };
  const key = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const from = target ?? { yaw, pitch };
    const view =
      event.key === "Home"
        ? home()
        : ({
            ArrowLeft: { yaw: from.yaw - KEY_STEP, pitch: from.pitch },
            ArrowRight: { yaw: from.yaw + KEY_STEP, pitch: from.pitch },
            ArrowUp: { yaw: from.yaw, pitch: from.pitch - KEY_STEP },
            ArrowDown: { yaw: from.yaw, pitch: from.pitch + KEY_STEP },
          } as Record<string, { yaw: number; pitch: number }>)[event.key];
    if (!view) return;
    // The arrows turn the globe here; they must not also scroll the page.
    event.preventDefault();
    if (event.key !== "Home") turned();
    touched();
    turnTo(view);
  };
  const goHome = () => {
    touched();
    turnTo(home());
  };

  // Rises into place the first time it is seen.
  let revealed = false;
  const view = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible && !revealed && !prefersReducedMotion()) {
      revealed = true;
      stage.animate([{ opacity: 0, translate: "0 40px" }, { opacity: 1, translate: "0 0" }], {
        duration: 1100,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    if (visible) draw();
    schedule();
  });

  // Theme changes repaint in the new inks.
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const repaint = () => {
    readInks();
    draw();
  };
  const theme = new MutationObserver(repaint);
  const resize = new ResizeObserver(() => {
    measure();
    draw();
  });
  const visibility = () => schedule();

  // Upgrades the server's still figure to an operable one.
  stage.tabIndex = 0;
  stage.setAttribute("role", "application");
  stage.setAttribute("aria-roledescription", copy.role ?? "globe");
  if (caption?.id) stage.setAttribute("aria-describedby", caption.id);

  readInks();
  measure();
  describe();
  // One still frame now, so the figure is ready when it scrolls into view.
  draw();
  // The land arrives as a small baked asset; until then the sphere is drawn without it.
  const loading = new AbortController();
  fetch(LAND_URL, { signal: loading.signal })
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
    .then((buffer) => {
      land = landDots(new Uint8Array(buffer));
      draw();
    })
    .catch(() => {});
  // The map, once the counter answers: dots fade in, the caption appears, the view turns to show you both.
  let unsubscribe = () => {};
  void import("./visitors").then(
    ({ subscribe }) => {
      unsubscribe = subscribe((next) => {
        if (next.cells.length && !visitors.cells.length) revealedAt = performance.now();
        const arrived = !!next.you && !visitors.you;
        visitors = next;
        if (arrived && !moved) turnTo(home());
        describe();
        draw();
        schedule();
      });
    },
    () => {},
  );

  const listeners: [EventTarget, string, EventListener][] = [
    [stage, "pointerdown", down as EventListener],
    [stage, "pointermove", move as EventListener],
    [stage, "pointerup", up as EventListener],
    [stage, "pointercancel", up as EventListener],
    [stage, "keydown", key as EventListener],
    [stage, "dblclick", goHome],
    [scheme, "change", repaint],
    [motion, "change", visibility],
    [document, "visibilitychange", visibility],
  ];
  if (reset) listeners.push([reset, "click", goHome]);
  for (const [target, type, listener] of listeners) target.addEventListener(type, listener);
  resize.observe(stage);
  view.observe(stage);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return () => {
    unsubscribe();
    loading.abort();
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    view.disconnect();
    resize.disconnect();
    theme.disconnect();
    for (const [target, type, listener] of listeners) target.removeEventListener(type, listener);
  };
}
