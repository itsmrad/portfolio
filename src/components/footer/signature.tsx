import { footer } from "@/content/footer";
import { site } from "@/content/site";
import { TitleBlockField } from "@/components/layout/title-block";

import { SignButton } from "./signature-client";
import styles from "./signature.module.css";

/** The owner's name in an original handwriting-style hand: three strokes, "Anupam", "D", "as" and the underline. */
const INK =
  "M8 100c2-3 9-11 15-20c6-9 14-22 20-32c7-10 14-23 18-28c3-5 4-5 5-4c1 1 1 1 2 8c0 7-1 23-1 32c0 9 0 19 0 24c0 5 1 7 2 8c1 1 4 2 4-2c1-4-1-18-4-22c-3-4-10-4-15-4c-5 0-14 1-14 2c-1 1 7 4 13 4c5 0 15-2 21-4c5-2 12-8 13-6c2 2-3 11-4 16c-1 5-3 13-2 12c1-1 5-13 8-18c3-5 7-9 10-10c3-1 6 0 8 2c1 2 1 6 0 10c0 4-4 14-3 16c1 2 4 2 7-2c2-4 8-21 9-22c1-1-4 12-4 16c0 4 1 7 2 8c1 1 4 1 6 0c2-1 4-4 6-8c2-4 6-16 6-16c1 0-2 12-3 16c0 4-1 7 0 8c1 1 3 2 6-2c2-4 8-22 9-22c1 0-3 13-5 20c-2 7-5 19-7 24c-2 5-4 10-3 8c0-2 4-13 6-20c2-7 5-18 8-24c3-6 7-8 10-10c3-1 6-1 8 1c1 2 2 6 1 9c-1 4-6 10-9 12c-3 2-8 3-10 2c-3-1-4-5-3-6c1-1 6 2 10 2c3 0 8-1 13-4c4-3 13-9 15-12c1-3-3-5-5-5c-2 0-6 2-8 5c-2 3-5 11-5 14c0 4 2 7 4 7c2 0 5-2 8-5c2-3 5-9 7-12c1-3 3-9 3-8c0 1-3 10-4 14c-1 4-2 10-1 12c1 2 3 2 6-2c2-4 8-20 9-22c2-2-1 8-2 12c-1 4-4 13-3 12c1-1 5-12 7-16c3-4 6-9 9-10c2-1 4 0 5 2c1 2 0 6 0 10c-1 4-5 14-4 14c1 0 4-12 7-16c3-4 7-9 10-10c2-1 4 0 5 2c1 2 0 6 0 10c-1 4-3 9-2 12c0 3 1 4 3 4c3 0 8-5 10-6M273 20c-1 5-4 20-7 30c-3 10-7 26-9 32c-3 6-6 4-8 4c-1 0-1-4 0-6c1-2 5-4 9-4c4 0 10 6 15 4c5-2 13-8 18-14c4-6 7-15 7-22c1-7-1-14-5-18c-3-4-10-7-16-8c-6-1-14 2-19 4c-4 2-7 7-8 8M320 62c-1-1-3-5-5-5c-2 0-6 2-8 5c-2 3-5 11-5 14c0 4 2 7 4 7c2 0 5-2 8-5c2-3 5-9 7-12c1-3 3-9 3-8c0 1-3 10-4 14c-1 4-2 10-1 12c1 2 3 0 6-2c2-2 6-8 9-12c2-4 6-13 7-14c2-1 2 5 2 8c0 3 1 7 0 10c-2 3-4 7-7 9c-2 2-6 2-8 1c-2 0-1-5-3-4c-1 1 1 5-6 8c-7 3-19 8-39 10c-20 2-54 4-81 4c-26 0-56-1-79-2c-23-1-49-3-59-4";

/**
 * "Approved by" cell: the signature draws itself when it scrolls into view
 * and again, with the pen voice, on click. Without JavaScript it is simply
 * shown, already signed.
 */
export function Signature() {
  return (
    // The block's last row, full width at two and at four columns.
    <TitleBlockField label="Approved by" className="col-span-2 sm:col-span-4">
      <div className="flex h-full flex-col justify-end gap-2">
        <SignButton
          aria-label={footer.signAgain}
          className="ml-1 h-12 w-auto self-start rounded-sm text-foreground touch-target"
        >
          <svg
            className="block h-full w-auto"
            viewBox="6 14 340 100"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            // The pen reaches past the drawing.
            overflow="visible"
            aria-hidden
          >
            <path className={styles.ink} d={INK} pathLength={1} />
            <g className={styles.pen}>
              <FountainPen />
            </g>
          </svg>
        </SignButton>
        <span className="border-t border-line pt-2 font-sans text-sm/none font-medium tracking-wide uppercase">
          {site.name}
        </span>
      </div>
    </TitleBlockField>
  );
}

/**
 * A fountain pen drawn upright with the nib tip at the origin, in the
 * signature's units. Filled with the page background so ink never shows
 * through it; the band takes the ink colour.
 */
function FountainPen() {
  return (
    <g className="fill-background" strokeWidth={2.5}>
      <path d="M9 -72V-150Q9 -158 0 -158T-9 -150V-72Z" />
      <path className="fill-current" d="M-10 -66H10V-74H-10Z" />
      <path d="M-8 -40V-66H8V-40Z" />
      <path d="M0 0-9-28Q-10-36-6-40H6Q10-36 9-28Z" />
      <path d="M0 -3V-22" />
      <circle cx="0" cy="-26" r="2.5" />
    </g>
  );
}
