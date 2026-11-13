import { useEffect } from "react";

/**
 * The stickers' lazy half (the drawings are server-rendered and already spring
 * in, grow and sink in CSS). For a mouse only:
 * - each sticker leans toward the pointer on a spring (stiffness 350, damping
 *   24, mass 0.6) and lifts 7px;
 * - loops (the terminal's cursor) pause while the hero is off screen;
 * - the hot-reload egg replays the entrance.
 */

/** Leans `element` toward the pointer while a mouse is over it. Returns the cleanup. */
function lean(element: HTMLElement) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let rect: DOMRect | null = null;
  let frame = 0;
  let last = 0;
  // Position, velocity and target on each axis.
  const x = { at: 0, speed: 0, to: 0 };
  const y = { at: 0, speed: 0, to: 0 };

  const step = (now: number) => {
    const dt = Math.min(now - last, 32) / 1000;
    last = now;
    for (const axis of [x, y]) {
      axis.speed += (((axis.to - axis.at) * 350 - axis.speed * 24) / 0.6) * dt;
      axis.at += axis.speed * dt;
    }
    const resting = [x, y].every((axis) => Math.abs(axis.to - axis.at) < 0.01 && Math.abs(axis.speed) < 0.01);
    element.style.setProperty("--x", resting ? `${x.to}` : x.at.toFixed(2));
    element.style.setProperty("--y", resting ? `${y.to}` : y.at.toFixed(2));
    frame = resting ? 0 : requestAnimationFrame(step);
  };
  const aim = (toX: number, toY: number) => {
    x.to = toX;
    y.to = toY;
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(step);
    }
  };
  const enter = () => (rect = element.getBoundingClientRect());
  const move = (event: PointerEvent) => {
    if (still.matches || event.pointerType !== "mouse" || !rect) return;
    const across = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const down = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    aim(across * 6, down * 5 - 7);
  };
  const leave = () => {
    rect = null;
    aim(0, 0);
  };

  element.addEventListener("pointerenter", enter, { passive: true });
  element.addEventListener("pointermove", move, { passive: true });
  element.addEventListener("pointerleave", leave, { passive: true });
  element.addEventListener("pointercancel", leave, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    element.removeEventListener("pointerenter", enter);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
    element.removeEventListener("pointercancel", leave);
  };
}

export function Lean() {
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>("[data-stickers]");
    if (!sheet) return;
    const slots = [...sheet.querySelectorAll<HTMLElement>("[data-sticker]")];
    const stops = slots.map((slot) => lean(slot.firstElementChild as HTMLElement));
    const observer = new IntersectionObserver((entries) =>
      sheet.toggleAttribute("data-idle", !entries.some((entry) => entry.isIntersecting)),
    );
    observer.observe(sheet);
    const replay = () => {
      for (const slot of slots) {
        slot.style.animation = "none";
        void slot.offsetWidth; // Restart the CSS animation.
        slot.style.animation = "";
      }
    };
    addEventListener("playful:reload", replay);
    return () => {
      stops.forEach((stop) => stop());
      observer.disconnect();
      removeEventListener("playful:reload", replay);
    };
  }, []);
  return null;
}
