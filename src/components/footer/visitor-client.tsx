"use client";

import { useEffect, useRef, useState } from "react";

import { cubicBezier, prefersReducedMotion, whenNear } from "./dom";

// Set once a browser has been counted; setting it by hand opts a browser out (the owner's own, say).
const COUNTED = "visit-counted";
const DIGITS = 6;
const COUNT_FROM = 24; // the last numbers roll up, like an odometer catching up
const DURATION = 1400;
const LIVE_DURATION = 400;
const EASE = cubicBezier(0.2, 0.7, 0.2, 1);

/** The total from this browser's own counted visit, or null. Never throws. */
async function countVisit() {
  try {
    const response = await fetch("/api/visit", { method: "POST" });
    const { count } = (await response.json()) as { count?: unknown };
    return response.ok && Number.isSafeInteger(count) ? (count as number) : null;
  } catch {
    return null;
  }
}

/** Animates a shown number toward a target; returns a cancel. */
function roll(from: number, to: number, duration: number, set: (value: number) => void) {
  if (prefersReducedMotion() || from === to) {
    set(to);
    return () => {};
  }
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    set(Math.round(from + (to - from) * EASE(t)));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  tick(start);
  return () => cancelAnimationFrame(frame);
}

/**
 * The total and, under it, who is here right now. The cell stays hidden (the
 * title block's hatch shows) until a real total arrives, and for good if none
 * does; there is never a made-up number or a waiting state.
 */
export function Counter({ unit, alone, many }: { unit: string; alone: string; many: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  // Never below 1: whoever is looking is here.
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let first = false;
    try {
      first = !localStorage.getItem(COUNTED) && !navigator.webdriver;
    } catch {
      // No storage, no way to count only once: read without counting.
    }
    let posted: Promise<number | null> | undefined;
    const post = () =>
      (posted ??= countVisit().then((count) => {
        if (count !== null) {
          try {
            localStorage.setItem(COUNTED, "1");
          } catch {}
        }
        return count;
      }));
    // A first visit is counted soon after load even if the footer is never reached,
    // but not while the page is only prerendered.
    const count = () => {
      const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1000));
      idle(() => void post());
    };
    if (first) {
      if ((document as Document & { prerendering?: boolean }).prerendering) {
        document.addEventListener("prerenderingchange", count, { once: true });
      } else count();
    }

    let cancelTotal = () => {};
    let cancelLive = () => {};
    let unsubscribe = () => {};
    let gone = false;
    let lastTotal: number | null = null;
    let lastLive: number | null = null;
    const stop = whenNear(element, () => {
      void Promise.all([first ? post() : null, import("./visitors")]).then(
        ([mine, visitors]) => {
          if (gone) return;
          if (mine !== null) visitors.noteTotal(mine);
          unsubscribe = visitors.subscribe(({ total: next, live: here }) => {
            if (next === undefined) return;
            element.closest("dd")?.parentElement?.style.setProperty("visibility", "visible");
            if (next !== lastTotal) {
              cancelTotal();
              cancelTotal = roll(lastTotal ?? Math.max(0, next - COUNT_FROM), next, DURATION, setShown);
              lastTotal = next;
              setTotal(next);
            }
            const people = Math.max(1, here ?? 1);
            if (people !== lastLive) {
              cancelLive();
              cancelLive = roll(lastLive ?? people, people, LIVE_DURATION, setLive);
              lastLive = people;
            }
          });
        },
        () => {},
      );
    });
    return () => {
      gone = true;
      stop();
      unsubscribe();
      cancelTotal();
      cancelLive();
      document.removeEventListener("prerenderingchange", count);
    };
  }, []);

  const digits = String(shown ?? 0).padStart(DIGITS, "0");
  const lead = Math.max(0, DIGITS - String(shown ?? 0).length);

  return (
    <span ref={ref} className="flex flex-col gap-1.5">
      <span aria-hidden className="font-pixel text-base/5 tracking-[0.12em]">
        <span className="text-muted-foreground/60">{digits.slice(0, lead)}</span>
        {digits.slice(lead)}
      </span>
      {total !== null && <span className="sr-only">{`${total.toLocaleString("en-IN")} ${unit}`}</span>}
      {/* Two lines reserved, so the row never grows when the line changes; the live dot is its ::before. */}
      <span
        className={`h-7 font-mono text-[0.625rem]/3.5 tracking-wider text-muted-foreground uppercase ${
          live === null
            ? ""
            : "before:mr-1.5 before:inline-block before:size-1.5 before:rounded-full before:bg-signal before:align-[0.0625rem]"
        }`}
      >
        {live === null ? null : live > 1 ? (
          <>
            <span className="font-pixel text-foreground">{live}</span> {many}
          </>
        ) : (
          alone
        )}
      </span>
    </span>
  );
}
