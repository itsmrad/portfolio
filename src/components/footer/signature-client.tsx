"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { play } from "@/lib/sound";

import { prefersReducedMotion, whenNear } from "./dom";

// One signature per page, so the drawing code is fetched once per page.
let drawing: Promise<typeof import("./draw")> | undefined;
const load = () => (drawing ??= import("./draw"));

// The pen voice lasts as long as the drawing, and its haptic pair comes with it. Matches
// draw.ts: pen landing, stroke and lift (2.29 s), or the 0.3 s fade under reduced motion.
const SIGN_SECONDS = 2.29;
const FADE_SECONDS = 0.3;

/** The signature's button: signs on first full view, signs again with the pen voice on click. */
export function SignButton(props: React.ComponentProps<"button">) {
  const ref = useRef<HTMLButtonElement>(null);
  const cancel = useRef<() => void>(null);

  const sign = () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    load().then(
      ({ sign }) => {
        cancel.current?.();
        cancel.current = sign(svg, prefersReducedMotion());
      },
      () => {
        // The drawing code could not load (offline, or a newer deployment): show it signed, still.
        const ink = svg.querySelector("path");
        ink?.style.setProperty("opacity", "1");
        ink?.style.setProperty("stroke-dashoffset", "0");
      },
    );
  };

  const firstView = useEffectEvent(() => cancel.current ?? sign());

  useEffect(() => {
    const button = ref.current;
    if (!button) return;
    // Fetch the drawing code a little before it is needed, sign once it is wholly in view.
    const preload = whenNear(button, () => void load().catch(() => {}), "0px 0px 400px 0px");
    const view = whenNear(button, firstView, "0px 0px -96px 0px", 1);
    return () => {
      preload();
      view();
      cancel.current?.();
    };
  }, []);

  return (
    <button
      type="button"
      data-slot="button"
      {...props}
      ref={ref}
      onClick={() => {
        play("scratch", { duration: prefersReducedMotion() ? FADE_SECONDS : SIGN_SECONDS });
        sign();
      }}
    />
  );
}
