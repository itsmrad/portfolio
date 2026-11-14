import { footer } from "@/content/footer";
import { cn } from "@/lib/utils";

import { FinaleStage } from "./finale-client";
import styles from "./finale.module.css";

/**
 * The last thing on the page: a dithered globe drawn in the drawing's inks,
 * turning slowly, with a satellite on an inclined orbit, Anupam's pin on New
 * Delhi and, once the visitor counter answers, where visitors have come from
 * and where this visitor is. The code loads when the footer comes near, and
 * it pauses off screen and under reduced motion.
 */
export function FinaleToy() {
  return (
    <div className="relative" data-print="hide">
      <FinaleStage className={styles.stage} aria-hidden>
        <div className={styles.scene}>
          <div className={styles.spin} data-scene>
            <div className={cn(styles.silhouette, "hatch")} />
            <canvas className={styles.canvas} />
          </div>
          <div className={styles.satellite} data-satellite>
            <Satellite />
          </div>
          {/* Annotations, above the satellite, placed by the globe beside their dots; hidden until placed.
              Anupam's tag reads "you're both here" when this visitor shares his place. */}
          <div className={styles.labels} data-labels>
            <Label name="home" className="text-foreground" both={footer.mapBoth}>
              {footer.mapAnupam}
            </Label>
            <Label name="you" className="text-signal">
              {footer.mapYou}
            </Label>
          </div>
        </div>
      </FinaleStage>
      {/* What the dots are, and how far this visitor is; shown once the map has data. */}
      <p
        className={cn(styles.caption, "font-mono text-[0.625rem]/4 tracking-wider text-muted-foreground uppercase")}
        data-caption
        data-distance={footer.distance}
        data-km={footer.distanceUnits.km}
        data-mi={footer.distanceUnits.mi}
        data-same={footer.distanceSame}
      >
        {footer.mapNote}
        <span className="block text-foreground" data-distance-line />
      </p>
    </div>
  );
}

/** One element: the tag, placed by the globe; its leader to the dot is drawn in CSS from variables the globe sets. */
function Label({ name, className, both, children }: { name: string; className: string; both?: string; children: string }) {
  return (
    <span
      className={cn(styles.tag, className, "font-mono text-[0.625rem]/3.5 tracking-wider uppercase")}
      data-label={name}
      data-text={children}
      data-both={both}
    >
      {children}
    </span>
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
        {/* Shapes that share a style share a path. */}
        <path className="fill-background" d="M2 17h12v14H2zM50 17h12v14H50zM23 16h18v16H23zM26 16a6 4 0 0 1 12 0" />
        <path fill="url(#satellite-cells)" d="M2 17h12v14H2zM50 17h12v14H50z" />
        <path d="M14 24h9m18 0h9M8 17v14M56 17v14M23 21h18M27 32v4m10-4v4" />
        <path d="M32 12V6m-2 0h4" strokeLinecap="round" />
        <path className="fill-signal stroke-none" d="M30 25h4v4h-4z" />
      </g>
    </svg>
  );
}
