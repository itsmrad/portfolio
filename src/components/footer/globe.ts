import { prefersReducedMotion } from "./dom";
import { LAND } from "./land";

// 4x4 Bayer ordered dither, drawn in 2px pixels.
const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PIXEL = 2;
const SPIN = 0.000018; // radians per ms: one turn in about six minutes
const FRAME = 80; // ms between redraws: a deliberate, plotter-like cadence
const ORBIT = 32000;
const DEG = Math.PI / 180;
// New Delhi, marked in the signal colour; the turn starts with it just east of centre.
const HOME = { lat: 28.61, lon: 77.21 };
const START = (HOME.lon - 18) * DEG;
const REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// Pointer parallax spring.
const SPRING = { stiffness: 100, damping: 22, mass: 0.8 };

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
  const radius = width * 0.68;
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
  const context = canvas.getContext("2d")!;
  const land = decodeLand();

  let width = 0;
  let height = 0;
  let image: ImageData;
  // Per-pixel geometry, fixed for a size; only the longitude turns.
  let lat: Float32Array;
  let lon: Float32Array;
  let density: Float32Array;
  let inks: [number, number, number][] = [];
  let angle = START;
  let visible = false;
  let frame = 0;
  let last = 0;
  let spin: Animation | undefined;

  const readInks = () => {
    // Hairline, sea and graticule, land in shade, land in light, New Delhi.
    inks = ["var(--line)", "var(--cross)", "var(--muted-foreground)", "var(--foreground)", "var(--signal)"].map((ink) =>
      rgb(canvas, ink),
    );
    canvas.style.color = "";
  };

  const measure = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(box.width / PIXEL));
    height = Math.max(1, Math.round(box.height / PIXEL));
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
    lat = new Float32Array(width * height);
    lon = new Float32Array(width * height);
    density = new Float32Array(width * height).fill(-1);
    const radius = width * 0.68;
    const centerY = height + Math.sqrt(radius * radius - (width * width) / 4);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const x = (column - width / 2) / radius;
        const y = (centerY - row) / radius;
        const distance = x * x + y * y;
        if (distance >= 1) continue;
        const z = Math.sqrt(1 - distance);
        const i = row * width + column;
        // Tilted 30° toward the viewer, so New Delhi (28.6°N) stays on the visible cap at every width.
        lat[i] = Math.asin(y * 0.866 - z * 0.5);
        lon[i] = Math.atan2(x, y * 0.5 + z * 0.866);
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
    const data = image.data;
    // Squared degrees per canvas pixel at the centre of the disc.
    const pin = (1 / DEG / (width * 0.68)) ** 2;
    data.fill(0);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const i = row * width + column;
        const fill = density[i]!;
        if (fill < 0) continue;
        const latitude = lat[i]! / DEG;
        const longitude = ((((lon[i]! + angle) / DEG + 180) % 360) + 360) % 360 - 180;
        const threshold = (DITHER[(row % 4) * 4 + (column % 4)]! + 0.5) / 16;
        const isLand = landAt(land, latitude, longitude) > 0.5;
        const north = latitude - HOME.lat;
        const east = (longitude - HOME.lon) * Math.cos(lat[i]!);
        const away = north * north + east * east;
        // A pin at New Delhi with a ring around it, like a registration mark, sized in pixels.
        const home = away < pin * 6 || (away > pin * 30 && away < pin * 42 && (row + column) % 2 === 0);
        // Dotted parallels every 15° and meridians every 30°.
        const graticule =
          (row + column) % 2 === 0 &&
          (Math.abs(latitude) % 15 < 0.5 || (longitude + 180) % 30 < 0.5 / Math.max(0.2, Math.cos(lat[i]!)));
        let ink = -1;
        if (home) ink = 4;
        else if (isLand && threshold < Math.min(1, 0.2 + fill * 0.7)) ink = threshold < fill * 0.35 ? 3 : 2;
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
    context.putImageData(image, 0, 0);
    stage.dataset.drawn = "";
  };

  const tick = (now: number) => {
    if (now - last >= FRAME) {
      if (last) angle += Math.min(now - last, 100) * SPIN;
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
    scene.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotate}deg)`;
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
  resize.observe(canvas);
  view.observe(stage);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  scheme.addEventListener("change", repaint);
  motion.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  stage.addEventListener("pointermove", pointer);
  stage.addEventListener("pointerleave", pointer);

  return () => {
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
