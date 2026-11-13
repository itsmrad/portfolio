"use client";

import { useEffect, useRef, useState } from "react";

import { cubicBezier, prefersReducedMotion, whenNear } from "./dom";

const ENDPOINT = "/api/visit";
// Set once a browser has been counted; setting it by hand opts a browser out (the owner's own, say).
const COUNTED = "visit-counted";
const DIGITS = 6;
const COUNT_FROM = 24; // the last numbers roll up, like an odometer catching up
const DURATION = 1400;
const EASE = cubicBezier(0.2, 0.7, 0.2, 1);

/** The total, or null on any failure. Never throws. */
async function fetchCount(method: "GET" | "POST") {
  try {
    const response = await fetch(ENDPOINT, { method });
    const { count } = (await response.json()) as { count?: unknown };
    return response.ok && typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

/**
 * Counts this browser once and shows the total. The cell stays hidden (the
 * title block's hatch shows) until a real total arrives, and for good if none
 * does; there is never a made-up number or a waiting state.
 */
export function Counter({ unit }: { unit: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let first = false;
    try {
      first = !localStorage.getItem(COUNTED) && !navigator.webdriver;
    } catch {
      // No storage, no way to count only once: read without counting.
    }
    const load = async () => {
      if (first) {
        const count = await fetchCount("POST");
        if (count !== null) {
          try {
            localStorage.setItem(COUNTED, "1");
          } catch {}
          return count;
        }
      }
      return fetchCount("GET");
    };
    // A first visit is counted soon after load even if the footer is never reached,
    // but not while the page is only prerendered.
    let pending: Promise<number | null> | undefined;
    const count = () => {
      const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1000));
      idle(() => (pending ??= load()));
    };
    if (first) {
      if ((document as Document & { prerendering?: boolean }).prerendering) {
        document.addEventListener("prerenderingchange", count, { once: true });
      } else count();
    }

    let frame = 0;
    const stop = whenNear(element, () => {
      void (pending ??= load()).then((count) => {
        if (count === null) return;
        element.closest("dd")?.parentElement?.style.setProperty("visibility", "visible");
        setTotal(count);
        if (prefersReducedMotion()) return setShown(count);
        const from = Math.max(0, count - COUNT_FROM);
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          setShown(Math.round(from + (count - from) * EASE(t)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        tick(start);
      });
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
      document.removeEventListener("prerenderingchange", count);
    };
  }, []);

  const digits = String(shown ?? 0).padStart(DIGITS, "0");
  const lead = Math.max(0, DIGITS - String(shown ?? 0).length);

  return (
    <span ref={ref} className="font-pixel text-base/5 tracking-[0.12em]">
      <span aria-hidden>
        <span className="text-muted-foreground/60">{digits.slice(0, lead)}</span>
        {digits.slice(lead)}
      </span>
      {total !== null && <span className="sr-only">{`${total.toLocaleString("en-IN")} ${unit}`}</span>}
    </span>
  );
}
