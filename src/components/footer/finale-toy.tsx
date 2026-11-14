import { cn } from "@/lib/utils";

import { FinaleStage } from "./finale-client";
import styles from "./finale.module.css";

/**
 * The last thing on the page: a dithered globe drawn in the drawing's inks,
 * turning slowly, with New Delhi pinned in the signal colour and a satellite
 * on an inclined orbit. Decorative. The code loads when the footer comes near,
 * and it pauses off screen and under reduced motion.
 */
export function FinaleToy() {
  return (
    <FinaleStage className={styles.stage} aria-hidden data-print="hide">
      <div className={styles.scene}>
        <div className={styles.spin} data-scene>
          <div className={cn(styles.silhouette, "hatch")} />
          <canvas className={styles.canvas} />
        </div>
        <div className={styles.satellite} data-satellite>
          <Satellite />
        </div>
      </div>
    </FinaleStage>
  );
}

/** A small survey satellite in line work: body, antenna dish and two hatched panels. */
function Satellite() {
  return (
    <svg viewBox="0 0 64 48" className="size-full" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round">
      <defs>
        <pattern id="satellite-cells" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 4 4 0" className="stroke-cross" strokeWidth={0.75} />
        </pattern>
      </defs>
      <g className="text-foreground">
        <path d="M14 24h9m18 0h9" />
        <path className="fill-background" d="M2 17h12v14H2zM50 17h12v14H50z" />
        <path fill="url(#satellite-cells)" d="M2 17h12v14H2zM50 17h12v14H50z" />
        <path d="M8 17v14M56 17v14" />
        <path className="fill-background" d="M23 16h18v16H23z" />
        <path d="M23 21h18M27 32v4m10-4v4" />
        <path className="fill-background" d="M26 16a6 4 0 0 1 12 0" />
        <path d="M32 12V6m-2 0h4" strokeLinecap="round" />
        <path className="fill-signal stroke-none" d="M30 25h4v4h-4z" />
      </g>
    </svg>
  );
}
