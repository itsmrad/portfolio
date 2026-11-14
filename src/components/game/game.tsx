"use client";

/**
 * The playable 404's loader. The server page reserves the figure (4:3, shown
 * from 64rem only), so nothing shifts. The game module (breakout.ts, its own
 * chunk) is imported when the canvas first intersects the viewport. A hidden
 * figure (below 64rem) never intersects, so phones never download it, and a
 * window widened later starts it then. If the chunk fails, the figure is
 * removed and the page reads as the plain 404.
 */
import { useEffect, useRef } from "react";

import type { GameCopy } from "@/components/game/breakout";

export function Game({ copy }: { copy: GameCopy }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      import("@/components/game/breakout").then(
        (game) => {
          if (cancelled) return;
          stop = game.start(element, copy, (message) => {
            if (status.current) status.current.textContent = message;
          });
        },
        () => {
          // Never leave play instructions over an empty canvas.
          const figure = element.closest("figure");
          if (figure) figure.hidden = true;
        },
      );
    });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      stop?.();
    };
  }, [copy]);

  return (
    <>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="application"
        aria-label={copy.label}
        aria-describedby="game-caption"
        className="block size-full touch-pan-y font-pixel focus-visible:outline-offset-[-2px]"
      />
      <p ref={status} role="status" className="sr-only" />
    </>
  );
}
