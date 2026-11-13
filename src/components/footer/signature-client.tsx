"use client";

import { useEffect, useRef } from "react";

import { play } from "@/lib/sound";

import { prefersReducedMotion, whenNear } from "./dom";

type Draw = typeof import("./draw");

// The sound branch's facade takes `play("scratch", { duration })` (seconds, at most 3); its pair
// vibrates on phones. shortcut: typed loosely so this builds before that facade lands; drop the cast after.
const playScratch = play as (name: string, options?: { duration?: number }) => void;
// Matches draw.ts: pen landing, stroke and lift (2.29 s), or the 0.3 s fade under reduced motion.
const SIGN_SECONDS = 2.29;
const FADE_SECONDS = 0.3;

/** The signature's button: signs on first full view, signs again with the pen voice on click. */
export function SignButton(props: React.ComponentProps<"button">) {
  const ref = useRef<HTMLButtonElement>(null);
  const draw = useRef<Promise<Draw>>(null);
  const cancel = useRef<() => void>(null);

  const sign = () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    void (draw.current ??= import("./draw")).then(({ sign }) => {
      cancel.current?.();
      cancel.current = sign(svg, prefersReducedMotion());
    });
  };

  useEffect(() => {
    const button = ref.current;
    if (!button) return;
    // Fetch the drawing code a little before it is needed, sign once it is wholly in view.
    const preload = whenNear(button, () => void (draw.current ??= import("./draw")), "0px 0px 400px 0px");
    const view = whenNear(button, () => cancel.current ?? sign(), "0px 0px -96px 0px", 1);
    return () => {
      preload();
      view();
      cancel.current?.();
    };
  }, []);

  return (
    <button
      type="button"
      {...props}
      ref={ref}
      onClick={() => {
        playScratch("scratch", { duration: prefersReducedMotion() ? FADE_SECONDS : SIGN_SECONDS });
        sign();
      }}
    />
  );
}
