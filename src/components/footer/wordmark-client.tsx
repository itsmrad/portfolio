"use client";

import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "./dom";

// The gradient's start follows the pointer on a spring (stiffness 150, damping 25, mass 1).
const STIFFNESS = 150;
const DAMPING = 25;

/**
 * Wraps the wordmark: moves its gradient with the pointer and writes the
 * measured width into the dimension line (empty until measured, never a guess).
 */
export function WordmarkStage({ width, ...props }: React.ComponentProps<"div"> & { width: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    const gradient = stage?.querySelector("linearGradient");
    const label = stage?.querySelector("[data-width]");
    if (!stage || !gradient || !label) return;

    const resize = new ResizeObserver(() => {
      label.setAttribute("data-width", String(Math.round(stage.getBoundingClientRect().width)));
    });
    resize.observe(stage);

    if (!matchMedia("(pointer: fine)").matches) return () => resize.disconnect();
    let x = width / 2;
    let velocity = 0;
    let target = x;
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      velocity += (STIFFNESS * (target - x) - DAMPING * velocity) * dt;
      x += velocity * dt;
      gradient.setAttribute("x1", x.toFixed(1));
      frame = Math.abs(target - x) > 0.5 || Math.abs(velocity) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const follow = (event: PointerEvent) => {
      if (prefersReducedMotion()) return;
      const box = stage.getBoundingClientRect();
      target = event.type === "pointerleave" ? width / 2 : ((event.clientX - box.left) / box.width) * width;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    stage.addEventListener("pointermove", follow);
    stage.addEventListener("pointerleave", follow);
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", follow);
      stage.removeEventListener("pointerleave", follow);
    };
  }, [width]);

  return <div ref={ref} {...props} />;
}
