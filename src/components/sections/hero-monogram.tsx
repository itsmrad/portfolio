"use client";

import { useEffect, useRef } from "react";

import { play, type SoundName } from "@/lib/sound";

import styles from "./hero-monogram.module.css";

/**
 * The pressable isometric monogram. The letters are pixel glyphs laid flat on
 * a 30° lattice and extruded; pressing sinks the top faces on a spring and a
 * highlight on the outlines follows the cursor.
 *
 * Geometry is computed here from the block list, once on the server for the
 * HTML and again per frame while the spring moves, so the hidden-line drawing
 * stays exact at every depth (walls are painted far to near, faces last).
 */
type Point = readonly [i: number, j: number];

// One lattice cell is 64 long: 55.43 across and 32 down on screen.
// The sound branch's vocabulary; cast until its name list is on this branch.
const voice = (name: string) => play(name as SoundName);

const DX = 55.4256;
const DY = 32;
const DEPTH = 32;
const PRESSED = 16;

// Blocks in cell corners [i to the right, j down], clockwise. Blocks of one
// letter touch only at corners, like the strokes of a pixel face.
const BLOCKS: Point[][] = [
  // A: apex, then the legs joined by the crossbar
  [[1, 0], [2, 0], [2, 1], [1, 1]],
  [[0, 1], [1, 1], [1, 2], [2, 2], [2, 1], [3, 1], [3, 5], [2, 5], [2, 3], [1, 3], [1, 5], [0, 5]],
  // D: the bracket, then the bar that closes it
  [[4, 0], [6, 0], [6, 1], [5, 1], [5, 4], [6, 4], [6, 5], [4, 5]],
  [[6, 1], [7, 1], [7, 4], [6, 4]],
]; // prettier-ignore

const WIDTH = 10 * DX + 1;
const HEIGHT = 11 * DY + DEPTH + 1;
const n = (value: number) => Math.round(value * 100) / 100;
const x = ([i, j]: Point) => n((i + j - 1) * DX + 0.5);
const y = ([i, j]: Point) => n((j - i + 6) * DY + 0.5);

const FACES = BLOCKS.map((block) => `M${block.map((point) => `${x(point)} ${y(point)}`).join("L")}Z`);

// Only walls that face the viewer (left and bottom sides of a glyph), far to near.
const WALLS = BLOCKS.flatMap((block) => block.map((from, index) => [from, block[(index + 1) % block.length]!] as const))
  .filter(([from, to]) => to[0] < from[0] || to[1] < from[1])
  .sort(([a, b], [c, d]) => a[1] + b[1] - a[0] - b[0] - (c[1] + d[1] - c[0] - d[0]));

/** A wall at press depth `p`: both uprights and the foot are stroked; the open top edge belongs to the face. */
const wall = ([from, to]: (typeof WALLS)[number], p: number) =>
  `M${x(from)} ${n(y(from) + p)}V${y(from) + DEPTH}L${x(to)} ${y(to) + DEPTH}V${n(y(to) + p)}`;

// The 30° annotation sits on the D's top corner, the one vertex with nothing to its right.
const VERTEX = { x: x([7, 1]), y: y([7, 1]) };
const RADIUS = 88;
const END = { x: n(VERTEX.x + RADIUS * Math.cos(Math.PI / 6)), y: n(VERTEX.y + RADIUS * Math.sin(Math.PI / 6)) };
const LABEL = {
  x: n(VERTEX.x + (RADIUS + 20) * Math.cos(Math.PI / 12)),
  y: n(VERTEX.y + (RADIUS + 20) * Math.sin(Math.PI / 12)),
};
const ARROW = "M0 0 8-3v6Z";

/** A construction line through a lattice point, along i (`rise` -1) or j (`rise` 1), far past both edges. */
const guide = (point: Point, rise: 1 | -1, drop = 0) => {
  const reach = 30 * DX;
  return `M${n(x(point) - reach)} ${n(y(point) + drop - rise * 30 * DY)}L${n(x(point) + reach)} ${n(y(point) + drop + rise * 30 * DY)}`;
};
const GUIDES = [guide([0, 5], -1, DEPTH), guide([0, 1], 1), guide([7, 1], 1)].join("");

export function Monogram({ label }: { label: string }) {
  const svg = useRef<SVGSVGElement>(null);
  // The press spring: mass 0.5, damping 18, stiffness 200.
  const spring = useRef({ position: 0, velocity: 0, target: 0, frame: 0, time: 0 });
  // A finger landing on the mark may be the start of a scroll: it sinks at once
  // but stays silent until the touch turns out to be a tap.
  const quiet = useRef(false);

  function draw(p: number) {
    const [walls, faces] = svg.current!.querySelectorAll<SVGGElement>("[data-solid]");
    WALLS.forEach((edge, index) => walls!.children[index]!.setAttribute("d", wall(edge, p)));
    faces!.setAttribute("transform", `translate(0 ${n(p)})`);
  }

  function press(target: number) {
    const state = spring.current;
    if (state.target === target) return;
    state.target = target;
    if (!quiet.current) voice(target ? "thump" : "release");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return draw((state.position = target));
    if (state.frame) return;
    state.time = performance.now();
    const step = (now: number) => {
      // 1 ms steps keep the integration stable whatever the frame rate.
      for (let elapsed = Math.min(now - state.time, 64); elapsed > 0; elapsed--) {
        state.velocity += (-400 * (state.position - state.target) - 36 * state.velocity) / 1000;
        state.position += state.velocity / 1000;
      }
      state.time = now;
      const settled = Math.abs(state.position - state.target) < 0.01 && Math.abs(state.velocity) < 0.01;
      draw(settled ? state.target : state.position);
      state.frame = settled ? 0 : requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
  }

  // The highlight follows the cursor across the whole window, only while the
  // mark is on screen, the pointer can hover and motion is welcome.
  useEffect(() => {
    const element = svg.current!;
    const state = spring.current;
    const stop = () => cancelAnimationFrame(state.frame);
    if (matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return stop;
    const glow = element.querySelector("radialGradient")!;
    let at = [0.5, 0.5];
    let to = at;
    let frame = 0;
    let time = 0;
    const follow = (now: number) => {
      // A spring of stiffness 300, damping 30, mass 0.1 is overdamped: past its
      // first 4 ms it is an exponential approach at 10.35 per second.
      const k = 1 - Math.exp((-10.35 * Math.min(now - time, 64)) / 1000);
      time = now;
      at = [at[0]! + (to[0]! - at[0]!) * k, at[1]! + (to[1]! - at[1]!) * k];
      glow.setAttribute("cx", String(n(at[0]! * WIDTH)));
      glow.setAttribute("cy", String(n(at[1]! * HEIGHT)));
      frame = Math.abs(to[0]! - at[0]!) + Math.abs(to[1]! - at[1]!) > 0.001 ? requestAnimationFrame(follow) : 0;
    };
    const move = (event: MouseEvent) => {
      to = [event.clientX / innerWidth, event.clientY / innerHeight];
      if (!frame) {
        time = performance.now();
        frame = requestAnimationFrame(follow);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => (entry!.isIntersecting ? addEventListener : removeEventListener)("mousemove", move),
      { rootMargin: "80px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      removeEventListener("mousemove", move);
      cancelAnimationFrame(frame);
      stop();
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      className={styles.button}
      onPointerDown={(event) => {
        quiet.current = event.pointerType === "touch";
        press(PRESSED);
      }}
      onPointerUp={() => press(0)}
      onPointerLeave={() => press(0)}
      onPointerCancel={() => press(0)}
      onKeyDown={(event) => {
        quiet.current = false;
        if (event.key === " " || event.key === "Enter") press(PRESSED);
      }}
      onClick={() => {
        if (quiet.current) voice("thump");
        quiet.current = false;
      }}
      onKeyUp={() => press(0)}
      onBlur={() => press(0)}
    >
      <svg ref={svg} className={styles.mark} viewBox={`0 0 ${n(WIDTH)} ${n(HEIGHT)}`} fill="none" aria-hidden>
        <defs>
          <pattern id="ad-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" className={styles.paper} />
            <path d="M-1 1l2 -2M0 10l10 -10M9 11l2 -2" className={styles.hatch} />
          </pattern>
          <radialGradient id="ad-glow" cx={n(WIDTH / 2)} cy={n(HEIGHT / 2)} r="200" gradientUnits="userSpaceOnUse">
            {[0, 0.25, 0.5, 0.75, 1].map((offset) => (
              <stop key={offset} offset={offset} style={{ "--t": offset } as React.CSSProperties} />
            ))}
          </radialGradient>
        </defs>
        <path d={GUIDES} className={styles.guides} />
        <g data-solid className={styles.walls}>
          {WALLS.map((edge, index) => (
            <path key={index} d={wall(edge, 0)} />
          ))}
        </g>
        <g data-solid className={styles.faces}>
          {FACES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g className={styles.angle}>
          {/* A reference line, an arc with an arrow at each end, and the value. */}
          <path d={`M${VERTEX.x} ${VERTEX.y}H${VERTEX.x + RADIUS + 12}`} />
          <path d={`M${VERTEX.x + RADIUS} ${VERTEX.y}A${RADIUS} ${RADIUS} 0 0 1 ${END.x} ${END.y}`} />
          <path d={ARROW} transform={`translate(${VERTEX.x + RADIUS} ${VERTEX.y}) rotate(90)`} />
          <path d={ARROW} transform={`translate(${END.x} ${END.y}) rotate(-60)`} />
          <text x={LABEL.x} y={LABEL.y} textAnchor="middle" dominantBaseline="central">
            30°
          </text>
        </g>
      </svg>
    </button>
  );
}
