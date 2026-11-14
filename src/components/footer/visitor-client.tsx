"use client";

import { useEffect, useRef, useState } from "react";

import { whenNear } from "./dom";

// Set once a browser has been counted; setting it by hand opts a browser out (the owner's own, say).
const COUNTED = "visit-counted";
const DIGITS = 6;

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

/**
 * The total and, under it, who is here right now. The cell stays hidden (the
 * title block's hatch shows) until a real total arrives, and for good if none
 * does; there is never a made-up number or a waiting state.
 */
export function Counter({ unit, alone, many }: { unit: string; alone: string; many: string }) {
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

    // The rest (reading, rolling the numbers, the live line) loads with the footer.
    let detach = () => {};
    let gone = false;
    const stop = whenNear(element, () => {
      void Promise.all([first ? post() : null, import("./visitors")]).then(
        ([mine, visitors]) => {
          if (!gone) detach = visitors.showCounter(element, mine, { total: setTotal, shown: setShown });
        },
        () => {},
      );
    });
    return () => {
      gone = true;
      stop();
      detach();
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
      {/* Who is here right now, written by the footer's lazy code; two lines reserved so nothing moves. */}
      <span
        data-live
        data-alone={alone}
        data-many={many}
        className="h-7 font-mono text-[0.625rem]/3.5 tracking-wider text-muted-foreground uppercase before:mr-1.5 before:hidden before:size-1.5 before:rounded-full before:bg-signal before:align-[0.0625rem] data-shown:before:inline-block"
      />
    </span>
  );
}
