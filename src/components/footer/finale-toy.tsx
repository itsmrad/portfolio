import { footer } from "@/content/footer";
import { cn } from "@/lib/utils";

import { FinaleStage } from "./finale-client";
import styles from "./finale.module.css";

/**
 * The footer's figure: the whole Earth as a field of dots on its 23.4° axis,
 * drawn like a detail on the sheet, with Anupam's pin on New Delhi and, once
 * the visitor counter answers, where visitors have come from and where this
 * visitor is. Drag, arrow keys or the reset turn it. The code loads when the
 * footer comes near; the server sends a still, hatched silhouette.
 */
export function FinaleToy() {
  const label = footer.globe;
  return (
    <figure className={cn(styles.figure, "screen-line-top")} data-print="hide">
      <FinaleStage
        className={styles.stage}
        role="img"
        aria-label={label.label}
        data-alt={label.label}
        data-alt-visitors={label.visitors}
        data-alt-keys={label.keys}
        data-role={label.role}
        data-hint={label.hint}
        data-distance={footer.distance}
        data-km={footer.distanceUnits.km}
        data-mi={footer.distanceUnits.mi}
        data-same={footer.distanceSame}
      >
        <div className={cn(styles.silhouette, "hatch")} />
        <canvas className={styles.canvas} />
        {/* Placed by the globe beside their dots; hidden until placed. Anupam's tag reads
            "you're both here" when this visitor shares his place. */}
        <Label name="home" className="text-foreground" both={footer.mapBoth}>
          {footer.mapAnupam}
        </Label>
        <Label name="you" className="text-signal">
          {footer.mapYou}
        </Label>
      </FinaleStage>
      <button type="button" className={cn(styles.reset, "font-mono uppercase")} data-reset hidden>
        {label.reset}
      </button>
      {/* What the dots are, and how far this visitor is; shown once the map has data. */}
      <figcaption
        id="globe-caption"
        className={cn(styles.caption, "font-mono text-[0.625rem]/4 tracking-wider text-muted-foreground uppercase")}
        data-caption
      >
        {footer.mapNote}
        <span className="block text-foreground" data-distance-line />
      </figcaption>
    </figure>
  );
}

/** One element: the tag, placed by the globe; its leader to the dot is drawn in CSS from variables the globe sets. */
function Label({ name, className, both, children }: { name: string; className: string; both?: string; children: string }) {
  return (
    <span
      aria-hidden
      className={cn(styles.tag, className, "font-mono text-[0.625rem]/3.5 tracking-wider uppercase")}
      data-label={name}
      data-text={children}
      data-both={both}
    >
      {children}
    </span>
  );
}
