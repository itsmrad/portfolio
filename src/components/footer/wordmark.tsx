import { Dimension, DimensionExtension, DimensionLine } from "@/components/layout/dimension";

import { WordmarkStage } from "./wordmark-client";
import styles from "./wordmark.module.css";

// The drawing's size; wordmark.mjs prints it when the glyphs change.
const WIDTH = 1762;
const HEIGHT = 258;

/**
 * The giant hatched pixel wordmark under the title block. The glyph shapes
 * are CSS masks (wordmark.mjs draws them), so the page carries no path data;
 * the hatch and the cursor-following gradient are tiny inline SVGs in the
 * theme's colours. Below it, a dimension line states its real width.
 */
export function Wordmark() {
  return (
    <WordmarkStage width={WIDTH} className="select-none" data-print="hide" aria-hidden>
      <div className="relative screen-line-bottom after:z-1 after:bg-foreground/15">
        <div className={styles.art}>
          <svg className={styles.hatch} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
            <defs>
              {/* Offset to the 32-unit glyph grid so the hatch meets every corner the same way. */}
              <pattern id="wordmark-hatch" x="1" y="1" width="8" height="8" patternUnits="userSpaceOnUse">
                <path className="stroke-line" d="M-1 1l2-2M0 8l8-8M7 9l2-2" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#wordmark-hatch)" />
          </svg>
          <svg className={styles.glyphs} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
            <defs>
              {/* Stretched so its 0.625 stop sits on the baseline: invisible at rest, it sweeps
                  into the letters as the start follows the pointer sideways. */}
              <linearGradient
                id="wordmark-gradient"
                x1={WIDTH / 2}
                y1="1"
                x2={WIDTH / 2}
                y2={1 + (HEIGHT - 2) / 0.625}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.625" stopColor="var(--foreground)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--foreground)" />
              </linearGradient>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#wordmark-gradient)" />
          </svg>
          <div className={styles.outline} />
        </div>
        <div className={styles.baseline} />
      </div>
      <Dimension className="relative h-8">
        <DimensionExtension className="top-1 bottom-0 left-0" />
        <DimensionExtension className="top-1 right-0 bottom-0" />
        <DimensionLine className="absolute inset-x-0 bottom-0">
          <span className={styles.width} data-width="" />
        </DimensionLine>
      </Dimension>
    </WordmarkStage>
  );
}
