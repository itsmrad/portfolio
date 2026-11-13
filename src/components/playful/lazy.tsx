"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * The loader of the playful layer, and nearly all of its always-loaded code.
 * Each piece is its own chunk, fetched on the visitor's first input (a pointer
 * move, a press, a key, the wheel, a touch) and only on a device where it can
 * show (`when`). An untouched page has loaded none of it, and a phone never
 * downloads the margins or the eggs.
 */
const pieces = {
  lean: () => import("./lean").then((module) => module.Lean),
  left: () => import("./margins").then((module) => module.Left),
  right: () => import("./margins").then((module) => module.Right),
  eggs: () => import("./eggs").then((module) => module.Eggs),
};
const INPUTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];

type Pieces = typeof pieces;
type Data<K extends keyof Pieces> = Parameters<Awaited<ReturnType<Pieces[K]>>>[0] extends { data: infer D } ? D : null;

export function Lazy<K extends keyof Pieces>({ piece, when, data }: { piece: K; when: string; data: Data<K> }) {
  const [Piece, setPiece] = useState<ComponentType<{ data: Data<K> }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stop = () => INPUTS.forEach((type) => removeEventListener(type, load, true));
    const load = () => {
      if (!matchMedia(when).matches) return;
      stop();
      (pieces[piece]() as Promise<ComponentType<{ data: Data<K> }>>).then(
        (loaded) => cancelled || setPiece(() => loaded),
        () => {}, // Decoration: a failed fetch leaves the page as it was.
      );
    };
    INPUTS.forEach((type) => addEventListener(type, load, { capture: true, passive: true }));
    return () => {
      cancelled = true;
      stop();
    };
  }, [piece, when]);

  return Piece && <Piece data={data} />;
}
