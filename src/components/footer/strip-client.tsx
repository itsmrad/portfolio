"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion, whenNear } from "./dom";

// Every glyph exists in the subset Geist Mono, so a cell never falls back to another font.
const GLYPHS = "<>/\\|_-+*#=─│┼";
const RATE = 18; // characters revealed per second
const DELAY = 200;
const STAGGER = 125;

/**
 * Scrambles each `[data-scramble]` text inside it once, when it scrolls into
 * view. The text is mono and keeps its length, so every character holds its
 * cell and nothing reflows; the final text is the server-rendered one.
 */
export function Scramble(props: React.ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    // Read at mount, while every text is still the server-rendered final one.
    const texts = [...root.querySelectorAll("[data-scramble]")].flatMap(({ firstChild: node }) =>
      node?.nodeType === Node.TEXT_NODE ? [{ node, text: node.nodeValue ?? "" }] : [],
    );
    let frame = 0;
    const stop = whenNear(root, () => {
      const start = performance.now();
      const tick = (now: number) => {
        let running = false;
        texts.forEach(({ node, text }, index) => {
          const duration = Math.min(1300, Math.max(450, (text.length / RATE) * 1000));
          const t = Math.min(1, Math.max(0, (now - start - DELAY - index * STAGGER) / duration));
          const shown = Math.floor((1 - (1 - t) ** 2) * text.length);
          node.nodeValue =
            text.slice(0, shown) +
            [...text.slice(shown)].map((c) => (c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
          running ||= t < 1;
        });
        if (running) frame = requestAnimationFrame(tick);
      };
      tick(start);
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
      // Never leave a text scrambled if unmounted mid-way.
      texts.forEach(({ node, text }) => (node.nodeValue = text));
    };
  }, []);

  return (
    <div ref={ref} {...props} />
  );
}

const clock = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** UTC offset in minutes of `timeZone` at `date` (DST, half- and quarter-hour zones included); the visitor's own when omitted. */
function utcOffset(date: Date, timeZone?: string) {
  if (!timeZone) return -date.getTimezoneOffset();
  const name = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  // "GMT+05:30", "GMT-10:00", or plain "GMT" for UTC itself.
  const [, sign, hours = "0", minutes = "0"] = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? "") ?? [];
  return (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(minutes));
}

/**
 * The owner's local time, ticking each minute, and how far it is from the
 * visitor's (nothing when they share it). The server renders the zone alone,
 * which stays true whenever the page was built.
 */
export function Clock({
  timeZone,
  zone,
  ahead,
  behind,
  children,
}: {
  timeZone: string;
  zone: string;
  ahead: string;
  behind: string;
  children: React.ReactNode;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer = 0;
    const update = () => {
      const date = new Date();
      setNow(date);
      timer = window.setTimeout(update, 60_000 - (date.getTime() % 60_000));
    };
    update();
    return () => clearTimeout(timer);
  }, []);

  if (!now) return children;

  // Signed minutes the owner's clock is ahead of the visitor's: -8h 30m (Kiribati) to +17h 30m (Baker Island).
  const diff = utcOffset(now, timeZone) - utcOffset(now);
  const hours = Math.floor(Math.abs(diff) / 60);
  const minutes = Math.abs(diff) % 60;
  const span = [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ");

  return (
    <>
      <time dateTime={now.toISOString()}>
        {clock(timeZone).format(now)} {zone}
      </time>
      {diff !== 0 && <span className="text-muted-foreground"> · {`${span} ${diff > 0 ? ahead : behind}`}</span>}
    </>
  );
}
