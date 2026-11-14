import { prefersReducedMotion } from "./dom";
import { LAND } from "./land";
import type { Visitors } from "./visitors";

// 4x4 Bayer ordered dither, drawn in 2px pixels.
const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PIXEL = 2;
const SPIN = 0.000018; // radians per ms: one turn in about six minutes
// The disc's radius as a share of the scene's width; its circle meets the stage's bottom corners.
const RADIUS = 0.55;
// The tilt toward the viewer picks the band of latitudes in view (about 34° - tilt to 90° - tilt).
const TILT = 30 * (Math.PI / 180);
const TILT_RANGE = [5, 82] as const;
const FRAME = 80; // ms between redraws: a deliberate, plotter-like cadence
const ORBIT = 32000;
const DEG = Math.PI / 180;
// New Delhi, Anupam's pin in ink; the turn starts with it just east of centre.
const HOME = { lat: 28.61, lon: 77.21 };
const START = (HOME.lon - 18) * DEG;
const REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// Pointer parallax spring.
const SPRING = { stiffness: 100, damping: 22, mass: 0.8 };
// Visitor dots fade in over this long once the map arrives.
const REVEAL = 900;
// When the visitor's own place arrives, the turn eases round to face it over this long.
const FACE = 1600;
// Labels keep this far (CSS px) from the stage's edges and from each other.
const MARGIN = 10;
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

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect, pad = 4) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** 360 x 180 land bits, decoded once. */
function decodeLand() {
  const bits = new Uint8Array(360 * 180);
  LAND.split(",").forEach((row, y) => {
    let x = 0;
    [...row].forEach((char, index) => {
      const run = parseInt(char, 36) + (char >= "A" && char <= "Z" ? 26 : 0);
      if (index % 2) bits.fill(1, y * 360 + x, y * 360 + x + run);
      x += run;
    });
  });
  return bits;
}

/** Land at a point, 0 to 1, interpolated between cell centres so coasts are smooth curves, not 1° steps. */
function landAt(land: Uint8Array, latitude: number, longitude: number) {
  const y = Math.min(178.999, Math.max(0, 89.5 - latitude));
  const x = longitude + 179.5;
  const row = Math.floor(y);
  const column = Math.floor(x);
  const fy = y - row;
  const fx = x - column;
  const at = (r: number, c: number) => land[r * 360 + (((c % 360) + 360) % 360)]!;
  const top = at(row, column) * (1 - fx) + at(row, column + 1) * fx;
  const bottom = at(row + 1, column) * (1 - fx) + at(row + 1, column + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/** A CSS colour (any syntax, tokens included) as [r, g, b]. */
function rgb(probe: HTMLElement, value: string): [number, number, number] {
  probe.style.color = value;
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = getComputedStyle(probe).color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/**
 * The satellite's path: an inclined orbit drawn as keyframes. It shrinks and
 * fades behind the globe's horizon on the far side.
 */
function orbit(width: number, height: number, visible: number): Keyframe[] {
  const radius = width * RADIUS;
  const centerY = height + Math.sqrt(radius * radius - (width * width) / 4);
  return Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2 - 0.8;
    const depth = Math.cos(angle);
    const x = Math.sin(angle) * Math.min(width, visible) * 0.34;
    const y = height * (0.27 + Math.sin(angle) * 0.09 - depth * 0.15);
    const horizon = centerY - Math.sqrt(radius * radius - x * x);
    const opacity = depth >= 0 ? 1 : Math.max(0, Math.min(1, (horizon - y - 6) / 18));
    return {
      offset: index / 96,
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${-18 + Math.sin(angle) * 14}deg) scale(${0.88 + depth * 0.12})`,
      opacity,
    };
  });
}

/**
 * Starts the footer globe in `stage`: a dithered, slowly turning Earth in the
 * drawing's own inks, with graticule, New Delhi and a satellite. It redraws
 * only while on screen and the tab is visible; under reduced motion it is one
 * still frame. Returns a cleanup.
 */
export function mountGlobe(stage: HTMLElement) {
  const canvas = stage.querySelector("canvas")!;
  const satellite = stage.querySelector<HTMLElement>("[data-satellite]")!;
  const scene = stage.querySelector<HTMLElement>("[data-scene]")!;
  const layer = stage.querySelector<HTMLElement>("[data-labels]")!;
  const labels = Object.fromEntries(
    [...layer.querySelectorAll<HTMLElement>("[data-label]")].map((tag) => [tag.dataset.label!, tag]),
  );
  const caption = stage.parentElement?.querySelector<HTMLElement>("[data-caption]");
  const context = canvas.getContext("2d")!;
  const land = decodeLand();

  let width = 0;
  let height = 0;
  let image: ImageData | undefined;
  // Per-pixel geometry, fixed for a size; only the longitude turns.
  // Where each pixel is on the unit sphere, before tilt and turn.
  let px: Float32Array;
  let py: Float32Array;
  let pz: Float32Array;
  let tilt = TILT;
  let density: Float32Array;
  let inks: [number, number, number][] = [];
  let angle = START;
  let visible = false;
  let frame = 0;
  let last = 0;
  let spin: Animation | undefined;
  let radius = 0;
  let centerY = 0;
  // CSS px per canvas pixel, and the part of the scene a label may use (scene CSS px).
  let scale = PIXEL;
  let bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let visitors: Visitors = { cells: [] };
  let revealedAt = 0;
  // An eased turn toward the visitor: from, to (radians) and its start time.
  let turning: { from: number; to: number; tiltFrom: number; tiltTo: number; at: number } | null = null;
  const placed: Record<string, number> = {};

  const readInks = () => {
    // Hairline, sea and graticule, land in shade, land in light and Anupam's pin, you, other visitors, paper.
    inks = [
      "var(--line)",
      "var(--cross)",
      "var(--muted-foreground)",
      "var(--foreground)",
      "var(--signal)",
      "var(--accent)",
      "var(--background)",
    ].map((ink) => rgb(canvas, ink));
    canvas.style.color = "";
  };

  const measure = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(box.width / PIXEL));
    height = Math.max(1, Math.round(box.height / PIXEL));
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
    px = new Float32Array(width * height);
    py = new Float32Array(width * height);
    pz = new Float32Array(width * height);
    density = new Float32Array(width * height).fill(-1);
    radius = width * RADIUS;
    centerY = height + Math.sqrt(radius * radius - (width * width) / 4);
    scale = box.width / width;
    // Labels stay inside what the stage shows, above its faded lower band, clear of the parallax drift.
    const shown = stage.getBoundingClientRect();
    const left = Math.max(0, shown.left - box.left) + MARGIN + 16;
    const right = Math.min(box.width, shown.right - box.left) - MARGIN - 16;
    bounds = { x: left, y: MARGIN, w: right - left, h: box.height * 0.72 - MARGIN };
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const x = (column - width / 2) / radius;
        const y = (centerY - row) / radius;
        const distance = x * x + y * y;
        if (distance >= 1) continue;
        const z = Math.sqrt(1 - distance);
        const i = row * width + column;
        px[i] = x;
        py[i] = y;
        pz[i] = z;
        const light = Math.max(0, Math.min(1, 0.22 + x * 0.4 + y * 0.06 + z * 0.4));
        // The limb thins out, the lit side fills in.
        density[i] = Math.min(1, z * 3.5) * light;
      }
    }

    const orbitTime = spin?.currentTime ?? 0;
    spin?.cancel();
    spin = satellite.animate(orbit(box.width, box.height, stage.clientWidth), {
      duration: ORBIT,
      iterations: Infinity,
    });
    spin.currentTime = orbitTime;
  };

  const draw = () => {
    // Nothing to draw on before the first measure.
    if (!image) return;
    const data = image.data;
    const [sinT, cosT] = [Math.sin(tilt), Math.cos(tilt)];
    data.fill(0);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const i = row * width + column;
        const fill = density[i]!;
        if (fill < 0) continue;
        // Tilted toward the viewer, then turned.
        const y = py[i]!;
        const z = pz[i]!;
        const phi = Math.asin(y * cosT - z * sinT);
        const latitude = phi / DEG;
        const longitude = ((((Math.atan2(px[i]!, y * sinT + z * cosT) + angle) / DEG + 180) % 360) + 360) % 360 - 180;
        const threshold = (DITHER[(row % 4) * 4 + (column % 4)]! + 0.5) / 16;
        const isLand = landAt(land, latitude, longitude) > 0.5;
        // Dotted parallels every 15° and meridians every 30°.
        const graticule =
          (row + column) % 2 === 0 &&
          (Math.abs(latitude) % 15 < 0.5 || (longitude + 180) % 30 < 0.5 / Math.max(0.2, Math.cos(phi)));
        let ink = -1;
        if (isLand && threshold < Math.min(1, 0.2 + fill * 0.7)) ink = threshold < fill * 0.35 ? 3 : 2;
        else if (graticule) ink = 1;
        else if (!isLand && threshold < fill * 0.35) ink = 1;
        if (ink < 0) continue;
        const [r, g, b] = inks[ink]!;
        const offset = i * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
      }
    }
    drawVisitors(data);
    context.putImageData(image, 0, 0);
    stage.dataset.drawn = "";
    placeLabels();
  };

  /** Where a place is on the canvas (canvas pixels), and how far it faces the viewer (z > 0: this side). */
  const project = (latitude: number, longitude: number) => {
    const phi = latitude * DEG;
    const lambda = longitude * DEG - angle;
    const north = Math.sin(phi);
    const across = Math.cos(phi) * Math.sin(lambda);
    const ahead = Math.cos(phi) * Math.cos(lambda);
    // The inverse of the tilt used to read the land.
    const [sinT, cosT] = [Math.sin(tilt), Math.cos(tilt)];
    const up = cosT * north + sinT * ahead;
    return { x: width / 2 + across * radius, y: centerY - up * radius, z: -sinT * north + cosT * ahead };
  };

  /** A filled disc of `ink` blended at `alpha` (canvas pixels). */
  const disc = (data: Uint8ClampedArray, cx: number, cy: number, r: number, ink: number, alpha: number) => {
    const [cr, cg, cb] = inks[ink]!;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height || (x - cx) ** 2 + (y - cy) ** 2 > r * r + 0.5) continue;
        const o = (y * width + x) * 4;
        const under = data[o + 3]! / 255;
        const out = alpha + under * (1 - alpha);
        data[o] = (cr * alpha + data[o]! * under * (1 - alpha)) / out;
        data[o + 1] = (cg * alpha + data[o + 1]! * under * (1 - alpha)) / out;
        data[o + 2] = (cb * alpha + data[o + 2]! * under * (1 - alpha)) / out;
        data[o + 3] = out * 255;
      }
    }
  };

  /**
   * Turns and tilts to show the visitor's own dot: centred between them and
   * Anupam when both fit (within 50° of longitude and 30° of latitude), else
   * on them; the turn then carries on and brings Anupam round.
   */
  const face = (latitude: number, longitude: number) => {
    const apart = ((longitude - HOME.lon + 540) % 360) - 180;
    const together = Math.abs(apart) <= 50 && Math.abs(latitude - HOME.lat) <= 30;
    const centre = (together ? HOME.lon + apart / 2 : longitude) * DEG;
    const band = together ? (latitude + HOME.lat) / 2 : latitude;
    // The band in view is centred about 62° - tilt.
    const tiltTo = Math.min(TILT_RANGE[1], Math.max(TILT_RANGE[0], 62 - band)) * DEG;
    // The shortest way round from where the turn is now.
    const to = angle + ((((centre - angle) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    if (prefersReducedMotion()) [angle, tilt] = [to, tiltTo];
    else turning = { from: angle, to, tiltFrom: tilt, tiltTo, at: performance.now() };
  };

  /** Fades points out toward the limb; nothing on the far side. */
  const facing = (z: number) => Math.max(0, Math.min(1, z / 0.15));

  const drawVisitors = (data: Uint8ClampedArray) => {
    const reveal = prefersReducedMotion() || !revealedAt ? 1 : Math.min(1, (performance.now() - revealedAt) / REVEAL);
    let drawn = 0;
    for (const [latitude, longitude, visits] of visitors.cells) {
      const point = project(latitude, longitude);
      const alpha = facing(point.z) * reveal * (0.6 + 0.4 * Math.min(1, Math.log10(visits) / 2));
      if (alpha <= 0) continue;
      // Gently larger with more visits: radius 0.8 to 2 canvas pixels.
      disc(data, point.x, point.y, 0.8 + Math.min(1.2, Math.log2(visits) / 4), 5, alpha);
      drawn++;
    }
    stage.dataset.visitors = String(drawn);
    // Anupam's pin: an ink dot in a paper ring, so it reads over land and sea alike.
    const home = project(HOME.lat, HOME.lon);
    if (home.z > 0) {
      disc(data, home.x, home.y, 3.5, 6, facing(home.z));
      disc(data, home.x, home.y, 2.2, 3, facing(home.z));
    }
    if (visitors.you) {
      const you = project(visitors.you[0], visitors.you[1]);
      if (you.z > 0) {
        disc(data, you.x, you.y, 3.8, 6, facing(you.z) * reveal);
        disc(data, you.x, you.y, 2.6, 4, facing(you.z) * reveal);
      }
    }
  };

  /**
   * Puts each label beside its dot: the first side (keeping last frame's when
   * it still fits) whose tag stays inside the stage's clear area and meets no
   * other tag or dot. A label with nowhere to go is hidden, never squeezed.
   */
  const placeLabels = () => {
    const anchor = (latitude: number, longitude: number) => {
      const point = project(latitude, longitude);
      return point.z > 0.08 ? { x: point.x * scale, y: point.y * scale } : null;
    };
    const home = anchor(HOME.lat, HOME.lon);
    const you = visitors.you ? anchor(visitors.you[0], visitors.you[1]) : null;
    const same =
      !!visitors.you &&
      (visitors.distance && "same" in visitors.distance
        ? true
        : !!home && !!you && Math.hypot(home.x - you.x, home.y - you.y) < 24);
    const wanted: [string, { x: number; y: number } | null][] = same
      ? [["both", home ?? you]]
      : [
          ["home", home],
          ["you", you],
        ];
    const dots = [home, you].filter((dot) => dot !== null);
    const taken: Rect[] = [];
    for (const name of ["home", "you"]) {
      const at = wanted.find(([wantedName]) => wantedName === name || (name === "home" && wantedName === "both"))?.[1] ?? null;
      const tag = labels[name];
      if (!tag) continue;
      // Anupam's tag says "you're both here" while this visitor shares his place.
      const text = same && name === "home" ? tag.dataset.both : tag.dataset.text;
      if (text && tag.textContent !== text) tag.textContent = text;
      let chosen = -1;
      let rect: Rect | null = null;
      if (at) {
        const w = tag.offsetWidth;
        const h = tag.offsetHeight;
        const order = [placed[name] ?? 0, ...SIDES.keys()];
        for (const side of order) {
          const [sx, sy] = SIDES[side]!;
          const x = sx > 0 ? at.x + GAP : at.x - GAP - w;
          const y = sy < 0 ? at.y - GAP * 0.6 - h : sy > 0 ? at.y + GAP * 0.6 : at.y - h / 2;
          const candidate = { x, y, w, h };
          const inside =
            x >= bounds.x && y >= bounds.y && x + w <= bounds.x + bounds.w && y + h <= bounds.y + bounds.h;
          const clear =
            !taken.some((other) => overlaps(candidate, other)) &&
            !dots.some((dot) => overlaps(candidate, { x: dot.x - 4, y: dot.y - 4, w: 8, h: 8 }, 2));
          if (inside && clear) {
            chosen = side;
            rect = candidate;
            break;
          }
        }
      }
      if (!at || !rect) {
        delete tag.dataset.shown;
        continue;
      }
      placed[name] = chosen;
      taken.push(rect);
      // The leader runs from the tag's corner nearest the dot to the dot.
      const [sx, sy] = SIDES[chosen]!;
      const cornerX = sx > 0 ? 0 : rect.w;
      const cornerY = sy < 0 ? rect.h : sy > 0 ? 0 : rect.h / 2;
      const dx = at.x - (rect.x + cornerX);
      const dy = at.y - (rect.y + cornerY);
      tag.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      tag.style.setProperty("--lx", `${cornerX - 1}px`);
      tag.style.setProperty("--ly", `${cornerY - 1}px`);
      tag.style.setProperty("--len", `${Math.hypot(dx, dy)}px`);
      tag.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
      tag.dataset.shown = "";
    }
    // The satellite ducks out while it would cross a pin or a label.
    const craft = satellite.getBoundingClientRect();
    const origin = layer.getBoundingClientRect();
    const over = { x: craft.left - origin.left, y: craft.top - origin.top, w: craft.width, h: craft.height };
    const crossing = [...taken, ...dots.map((dot) => ({ x: dot.x - 6, y: dot.y - 6, w: 12, h: 12 }))].some((rect) =>
      overlaps(over, rect, 2),
    );
    satellite.style.setProperty("--duck", crossing ? "0" : "1");
  };

  /** The caption under the stage: what the dots are, once there is a map, and this visitor's distance. */
  const describe = () => {
    if (!caption) return;
    if (visitors.total === undefined) return;
    caption.dataset.shown = "";
    const line = caption.querySelector<HTMLElement>("[data-distance-line]");
    const distance = visitors.distance;
    if (!line || !distance) return;
    line.textContent =
      "same" in distance
        ? (caption.dataset.same ?? "")
        : (caption.dataset.distance ?? "")
            .replace("{n}", new Intl.NumberFormat().format(distance.value))
            .replace("{unit}", (distance.unit === "mi" ? caption.dataset.mi : caption.dataset.km) ?? distance.unit);
  };

  const tick = (now: number) => {
    if (now - last >= FRAME) {
      if (turning) {
        const t = Math.min(1, (now - turning.at) / FACE);
        const eased = 1 - (1 - t) ** 3;
        angle = turning.from + (turning.to - turning.from) * eased;
        tilt = turning.tiltFrom + (turning.tiltTo - turning.tiltFrom) * eased;
        if (t >= 1) turning = null;
      } else if (last) angle += Math.min(now - last, 100) * SPIN;
      last = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    const running = visible && !document.hidden && !prefersReducedMotion();
    if (running) {
      frame = requestAnimationFrame(tick);
      spin?.play();
    } else {
      spin?.pause();
      if (prefersReducedMotion() && spin) spin.currentTime = 0;
      draw();
    }
  };

  // Rises into place the first time it is seen.
  let revealed = false;
  const view = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !revealed && !prefersReducedMotion()) {
        revealed = true;
        stage.animate([{ opacity: 0, translate: "0 40px" }, { opacity: 1, translate: "0 0" }], {
          duration: 1100,
          easing: REVEAL_EASE,
        });
      }
      update();
    },
    { rootMargin: "0px 0px -80px 0px" },
  );

  // Pointer parallax on a spring: a little sideways drift, lift and tilt.
  const target = { x: 0, y: 0, rotate: 0 };
  const state = { x: 0, y: 0, rotate: 0, vx: 0, vy: 0, vr: 0 };
  let springFrame = 0;
  let springLast = 0;
  const spring = (now: number) => {
    const dt = Math.min(0.032, (now - springLast) / 1000);
    springLast = now;
    let moving = false;
    for (const [key, v] of [["x", "vx"], ["y", "vy"], ["rotate", "vr"]] as const) {
      state[v] += ((SPRING.stiffness * (target[key] - state[key]) - SPRING.damping * state[v]) / SPRING.mass) * dt;
      state[key] += state[v] * dt;
      moving ||= Math.abs(target[key] - state[key]) > 0.01 || Math.abs(state[v]) > 0.01;
    }
    scene.style.transform = layer.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotate}deg)`;
    springFrame = moving ? requestAnimationFrame(spring) : 0;
  };
  const pointer = (event: PointerEvent) => {
    if (event.pointerType === "touch" || prefersReducedMotion()) return;
    const box = stage.getBoundingClientRect();
    const across = event.type === "pointermove" ? (event.clientX - box.left) / box.width - 0.5 : 0;
    const down = event.type === "pointermove" ? (event.clientY - box.top) / box.height - 0.5 : 0;
    Object.assign(target, { x: across * 16, y: down * 8, rotate: across * 1.2 });
    if (!springFrame) {
      springLast = performance.now();
      springFrame = requestAnimationFrame(spring);
    }
  };

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
    update();
  });

  readInks();
  // The map, once the counter answers: dots fade in, the caption appears.
  let unsubscribe = () => {};
  void import("./visitors").then(
    ({ subscribe }) => {
      unsubscribe = subscribe((next) => {
        if (next.cells.length && !visitors.cells.length) revealedAt = performance.now();
        if (next.you && !visitors.you) face(next.you[0], next.you[1]);
        visitors = next;
        describe();
        if (!frame) draw();
      });
    },
    () => {},
  );
  resize.observe(canvas);
  view.observe(stage);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  scheme.addEventListener("change", repaint);
  motion.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  stage.addEventListener("pointermove", pointer);
  stage.addEventListener("pointerleave", pointer);

  return () => {
    unsubscribe();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(springFrame);
    spin?.cancel();
    view.disconnect();
    resize.disconnect();
    theme.disconnect();
    scheme.removeEventListener("change", repaint);
    motion.removeEventListener("change", update);
    document.removeEventListener("visibilitychange", update);
    stage.removeEventListener("pointermove", pointer);
    stage.removeEventListener("pointerleave", pointer);
  };
}
