"use client";

/**
 * The playable 404's loader. The server page reserves the figure (4:3, shown
 * from 64rem only), so nothing shifts. On a desktop-width screen, once the
 * figure scrolls into view, the game module (breakout.ts, its own chunk) is
 * imported and attached to the canvas. Phones never download it.
 */
import { useEffect, useRef } from "react";

import type { GameCopy } from "@/components/game/breakout";

export function Game({ copy }: { copy: GameCopy }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element || !matchMedia("(min-width: 64rem)").matches) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      import("@/components/game/breakout").then(
        (game) => {
          if (!cancelled)
            stop = game.start(element, copy, (message) => {
              if (status.current) status.current.textContent = message;
            });
        },
        () => {}, // the page reads fine without the game
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
        className="block size-full font-pixel focus-visible:outline-offset-[-2px]"
      />
      <p ref={status} role="status" className="sr-only" />
    </>
  );
}
