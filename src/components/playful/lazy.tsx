"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

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
  arcade: () => import("@/components/arcade/arcade").then((module) => module.Arcade),
};
const INPUTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];

type Pieces = typeof pieces;
type Data<K extends keyof Pieces> = Parameters<Awaited<ReturnType<Pieces[K]>>>[0] extends { data: infer D } ? D : null;

/** Keys pressed while a piece loads, kept to replay once it is listening (at most 16; text fields excluded). */
type Keys = KeyboardEventInit[];
const record = (keys: Keys) => (event: Event) => {
  const target = event.target as HTMLElement;
  if (!(event instanceof KeyboardEvent) || keys.length > 15 || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  const { key, code, shiftKey, ctrlKey, metaKey, altKey } = event;
  keys.push({ key, code, shiftKey, ctrlKey, metaKey, altKey });
};

/** `replayKeys`: the keys typed while the chunk loads (the first one included) reach the piece once it has mounted. */
export function Lazy<K extends keyof Pieces>({ piece, when, data, replayKeys }: { piece: K; when: string; data: Data<K>; replayKeys?: boolean }) {
  const [Piece, setPiece] = useState<ComponentType<{ data: Data<K> }> | null>(null);
  const pending = useRef<{ keys: Keys; listener: (event: Event) => void } | null>(null);

  // After the piece's own effects: its listeners are attached. Replayed on window, so only window listeners
  // (the piece's, not the page's shortcuts on document) hear them again.
  useEffect(() => {
    const buffer = pending.current;
    if (!Piece || !buffer) return;
    pending.current = null;
    removeEventListener("keydown", buffer.listener, true);
    buffer.keys.forEach((init) => dispatchEvent(new KeyboardEvent("keydown", init)));
  }, [Piece]);

  useEffect(() => {
    const media = matchMedia(when);
    let cancelled = false;
    const unlisten = () => INPUTS.forEach((type) => removeEventListener(type, load, true));
    // Inputs are heard only while the piece could show: a phone listens to nothing.
    const arm = () => {
      unlisten();
      if (media.matches) INPUTS.forEach((type) => addEventListener(type, load, { capture: true, passive: true }));
    };
    const stop = () => {
      unlisten();
      media.removeEventListener("change", arm);
    };
    const load = (event: Event) => {
      stop();
      if (replayKeys) {
        const keys: Keys = [];
        const listener = record(keys);
        listener(event);
        addEventListener("keydown", listener, true);
        pending.current = { keys, listener };
      }
      const drop = () => pending.current && removeEventListener("keydown", pending.current.listener, true);
      (pieces[piece]() as Promise<ComponentType<{ data: Data<K> }>>).then(
        (loaded) => (cancelled ? drop() : setPiece(() => loaded)),
        () => {
          // Decoration: a failed fetch leaves the page as it was.
          drop();
          pending.current = null;
        },
      );
    };
    media.addEventListener("change", arm);
    arm();
    return () => {
      cancelled = true;
      stop();
    };
  }, [piece, when, replayKeys]);

  return Piece && <Piece data={data} />;
}
