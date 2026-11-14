import { useEffect, useRef } from "react";

import { Sprite } from "./cat-sprite";
import styles from "./cat.module.css";

/**
 * The cursor cat. It leaves its bed in the margin (or, with no bed on screen,
 * appears beside the pointer), runs after the cursor, sits when it catches up
 * and falls asleep three seconds later. It is never in the way: no pointer
 * events, hidden while the window is not focused, gone on Escape.
 */
/** Half its 64px cell: positions are its centre. */
const HALF = 32;
const STOP = 44;

export function Cat() {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cat = element.current!;
    const bed = document.querySelector("[data-cat-bed] svg")?.getBoundingClientRect();
    let x = 0;
    let y = 0;
    let toX = 0;
    let toY = 0;
    let frame = 0;
    let last = 0;

    const show = (atX: number, atY: number) => {
      x = atX;
      y = atY;
      cat.style.translate = `${x - HALF}px ${y - HALF}px`;
      cat.dataset.pose = "idle";
      cat.setAttribute("data-on", "");
    };
    const chase = (now: number) => {
      frame = 0;
      const dx = toX - x;
      const dy = toY - y;
      const distance = Math.hypot(dx, dy);
      if (distance <= STOP + 0.1) {
        cat.dataset.pose = "idle";
        return;
      }
      const step = Math.min(distance - STOP, Math.min(now - last, 32) * 0.19);
      x += (dx * step) / distance;
      y += (dy * step) / distance;
      last = now;
      cat.dataset.pose = Math.floor(now / 105) % 2 ? "runA" : "runB";
      cat.toggleAttribute("data-left", dx < 0);
      cat.style.translate = `${x - HALF}px ${y - HALF}px`;
      frame = requestAnimationFrame(chase);
    };
    const follow = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      toX = event.clientX;
      toY = event.clientY;
      if (!cat.hasAttribute("data-on")) {
        show(toX + (toX > innerWidth / 2 ? -84 : 84), Math.max(HALF, Math.min(innerHeight - HALF, toY + 30)));
      }
      if (!frame && Math.hypot(toX - x, toY - y) > STOP + 0.1) {
        last = performance.now();
        frame = requestAnimationFrame(chase);
      }
    };
    const hide = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      cat.removeAttribute("data-on");
    };

    if (bed && bed.bottom > 0 && bed.top < innerHeight) show(bed.left + HALF, bed.top + HALF);
    dispatchEvent(new CustomEvent("playful:cat", { detail: true }));
    addEventListener("pointermove", follow, { passive: true });
    addEventListener("blur", hide);
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      hide();
      dispatchEvent(new CustomEvent("playful:cat", { detail: false }));
      removeEventListener("pointermove", follow);
      removeEventListener("blur", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <div ref={element} data-cat aria-hidden data-print="hide" className={styles.cat}>
      <Sprite poses={["sit", "sleepA", "sleepB", "runA", "runB"]} />
    </div>
  );
}
