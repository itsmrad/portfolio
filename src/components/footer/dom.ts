/** Runs `run` once, the first time `element` comes within `margin` of the viewport. Returns a cleanup. */
export function whenNear(element: Element, run: () => void, margin = "0px", threshold = 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      run();
    },
    { rootMargin: margin, threshold },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** CSS `cubic-bezier()` as a function of time, for animations driven frame by frame. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
    // x(t) is monotonic on [0, 1], so bisection always converges.
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}
