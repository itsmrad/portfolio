"use client";

import { useEffect, useRef, useState } from "react";

import { cubicBezier, prefersReducedMotion, whenNear } from "./dom";

const ENDPOINT = "/api/visit";
const COUNTED = "visit-counted";
const DIGITS = 6;
const COUNT_FROM = 24; // the last numbers roll up, like an odometer catching up
const DURATION = 1400;
const EASE = cubicBezier(0.2, 0.7, 0.2, 1);

async function fetchCount(method: "GET" | "POST") {
  const response = await fetch(ENDPOINT, { method });
  const { count } = (await response.json()) as { count?: unknown };
  if (!response.ok || typeof count !== "number") throw new Error("no count");
  return count;
}

/**
 * Counts this browser once, ever, and shows the total. Bots and automated
 * browsers only read it. Any failure hides the whole cell, leaving the title
 * block's hatch; there is never a made-up number.
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
    const load = () =>
      fetchCount(first ? "POST" : "GET").then((count) => {
        if (first) {
          try {
            localStorage.setItem(COUNTED, "1");
          } catch {}
        }
        return count;
      });
    // A first visit is counted soon after load even if the footer is never reached.
    let pending: Promise<number> | undefined;
    const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1000));
    if (first) idle(() => (pending ??= load()));

    let frame = 0;
    const stop = whenNear(element, () => {
      (pending ??= load()).then(
        (count) => {
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
        },
        // The cell (dd's parent) gives way to the hatch underneath; its grid slot stays, so nothing moves.
        () => element.closest("dd")?.parentElement?.style.setProperty("visibility", "hidden"),
      );
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, []);

  const digits = shown === null ? "-".repeat(DIGITS) : String(shown).padStart(DIGITS, "0");
  const lead = shown === null ? 0 : DIGITS - String(shown).length;

  return (
    <span ref={ref} className="font-pixel text-base/5 tracking-[0.12em]">
      <span aria-hidden>
        <span className="text-muted-foreground/60">{digits.slice(0, Math.max(0, lead))}</span>
        <span className={shown === null ? "text-muted-foreground/60" : undefined}>{digits.slice(Math.max(0, lead))}</span>
      </span>
      {total !== null && <span className="sr-only">{`${total.toLocaleString("en-IN")} ${unit}`}</span>}
    </span>
  );
}
