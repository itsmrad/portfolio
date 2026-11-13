import { cubicBezier } from "./dom";

// Timeline, in ms: the pen lands, draws the ink, then lifts away while still moving.
const LAND = 150;
const DRAW = 2000;
const LIFT = 200;
const LIFT_OVERLAP = 60;
const DRAW_EASE = cubicBezier(0.35, 0, 0.65, 0.65);
const PEN_EASE = cubicBezier(0.25, 0.46, 0.45, 0.94);
const LIFT_DISTANCE = 24; // signature units along the pen's axis
const ANGLE = 45;
const FADE = 300;

/** Signs the signature in `svg` from scratch. Returns a function that stops it, leaving it signed. */
export function sign(svg: SVGSVGElement, reduced: boolean) {
  const ink = svg.querySelector("path")!;
  const pen = svg.querySelector("g")!;
  const length = ink.getTotalLength();
  const angle = (ANGLE * Math.PI) / 180;
  const liftAt = LAND + DRAW - LIFT_OVERLAP;
  let frame = 0;

  const render = (progress: number, lift: number, inked: boolean) => {
    ink.style.strokeDashoffset = String(1 - progress);
    ink.style.opacity = inked ? "1" : "0";
    const point = ink.getPointAtLength(progress * length);
    const distance = lift * LIFT_DISTANCE;
    pen.setAttribute(
      "transform",
      `translate(${point.x + distance * Math.sin(angle)} ${point.y - distance * Math.cos(angle)}) rotate(${ANGLE})`,
    );
    pen.style.opacity = String(1 - lift);
  };

  if (reduced) {
    render(1, 1, true);
    const fade = ink.animate([{ opacity: 0 }, { opacity: 1 }], FADE);
    return () => fade.finish();
  }

  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    const progress = DRAW_EASE(Math.min(1, Math.max(0, (t - LAND) / DRAW)));
    const lift = t < LAND ? 1 - PEN_EASE(t / LAND) : PEN_EASE(Math.min(1, Math.max(0, (t - liftAt) / LIFT)));
    render(progress, lift, t >= LAND);
    if (t < liftAt + LIFT) frame = requestAnimationFrame(tick);
  };
  tick(start);
  return () => {
    cancelAnimationFrame(frame);
    render(1, 1, true);
  };
}
