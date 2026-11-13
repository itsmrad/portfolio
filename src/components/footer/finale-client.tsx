"use client";

import { useEffect, useRef } from "react";

import { whenNear } from "./dom";

/** Loads and starts the globe when the footer comes within 400px of the viewport. */
export function FinaleStage(props: React.ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    let stop: (() => void) | undefined;
    let gone = false;
    const unwatch = whenNear(
      stage,
      () =>
        void import("./globe").then(({ mountGlobe }) => {
          if (!gone) stop = mountGlobe(stage);
        }),
      "0px 0px 400px 0px",
    );
    return () => {
      gone = true;
      unwatch();
      stop?.();
    };
  }, []);

  return <div ref={ref} {...props} />;
}
