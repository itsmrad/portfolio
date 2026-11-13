"use client";

import { useEffect, useRef } from "react";

import { play } from "@/lib/sound";

import { prefersReducedMotion, whenNear } from "./dom";

type Draw = typeof import("./draw");

// The pen voice lasts as long as the drawing (its haptic pair comes with it). Matches draw.ts: pen landing, stroke and lift (2.29 s), or the 0.3 s fade under reduced motion.
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
        play("scratch", { duration: prefersReducedMotion() ? FADE_SECONDS : SIGN_SECONDS });
        sign();
      }}
    />
  );
}
