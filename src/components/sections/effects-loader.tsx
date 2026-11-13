"use client";

import { useEffect } from "react";

/**
 * Everything interactive in the home sections apart from the monogram (the
 * clock's tick, copy buttons, the palette button, the calendar's read-out and
 * its wave) lives in one chunk that is fetched on the visitor's first input,
 * so it costs nothing before then. Clicks are handed to it from here, so the
 * click that arrives while the chunk is still on its way is not lost.
 */
let effects: Promise<typeof import("./effects")> | undefined;
const load = () =>
  (effects ??= import("./effects").catch((error) => {
    effects = undefined; // offline or a replaced deploy: try again on the next input
    throw error;
  }));
const FIRST_INPUT = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel"];

export function Effects() {
  useEffect(() => {
    const wake = () => void load().catch(() => {});
    const click = (event: MouseEvent) =>
      void load().then(
        (module) => module.click(event),
        () => {},
      );
    FIRST_INPUT.forEach((type) => addEventListener(type, wake, { once: true, passive: true }));
    addEventListener("click", click);
    return () => {
      FIRST_INPUT.forEach((type) => removeEventListener(type, wake));
      removeEventListener("click", click);
    };
  }, []);
  return null;
}
