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

const clock = (timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Minutes since midnight on the wall clock of `timeZone` (the visitor's when omitted). */
function wallMinutes(date: Date, timeZone?: string) {
  const [hours = 0, minutes = 0] = clock(timeZone).format(date).split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * The owner's local time, ticking each minute, and how far it is from the
 * visitor's. The server renders the zone alone, which stays true whenever the
 * page was built.
 */
export function Clock({
  timeZone,
  zone,
  ahead,
  behind,
  same,
  children,
}: {
  timeZone: string;
  zone: string;
  ahead: string;
  behind: string;
  same: string;
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

  // Minutes between the two wall clocks, folded into -12h..+12h.
  const diff = ((wallMinutes(now, timeZone) - wallMinutes(now) + 2160) % 1440) - 720;
  const hours = Math.floor(Math.abs(diff) / 60);
  const minutes = Math.abs(diff) % 60;
  const span = [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ");

  return (
    <>
      <time dateTime={now.toISOString()}>
        {clock(timeZone).format(now)} {zone}
      </time>
      <span className="text-muted-foreground"> · {diff === 0 ? same : `${span} ${diff > 0 ? ahead : behind}`}</span>
    </>
  );
}
