import type { CSSProperties, ReactNode } from "react";

import type { SoundName } from "@/lib/sound";

import { Lazy } from "./lazy";
import { Press } from "./press";
import styles from "./stickers.module.css";

/**
 * The hero's stickers: original drawings in the page's own line and hatch,
 * each a die-cut piece of the card colour. Monochrome at rest; the signal
 * colour appears only while one is under the pointer.
 *
 * Rendered on the server as inline SVG, so they are there at first paint and
 * cost no script. CSS does the entrance (a 0.6s spring, bounce 0.38, each 0.1s
 * after the one before), the hover (1.075 and a turn to the tilt) and the
 * press (0.94 and 0.6 of the tilt back). A press plays the sticker's voice
 * (press.tsx); the lean toward the pointer arrives with the first input
 * (lean.tsx). Under reduced motion they only dim.
 */
function Sticker({
  name,
  voice,
  tilt,
  order,
  children,
}: {
  name: string;
  voice: SoundName;
  /** Degrees it turns to under the pointer. */
  tilt: number;
  order: number;
  children: ReactNode;
}) {
  return (
    <div data-sticker={name} className={`${styles.slot} ${styles[name]}`} style={{ "--i": order, "--tilt": `${tilt}deg` } as CSSProperties}>
      <div data-voice={voice} className={styles.sticker}>
        {children}
      </div>
    </div>
  );
}

/** The die-cut edge: the same shapes as the drawing, stroked wide in the card colour. */
function Cut({ children }: { children: ReactNode }) {
  return <g className={styles.paper}>{children}</g>;
}

const HATCH = "url(#sticker-hatch)";

function Keycap({ label }: { label: string }) {
  const skirt = <rect x="8" y="10" width="72" height="70" rx="12" />;
  return (
    <svg viewBox="0 0 88 88">
      <Cut>{skirt}</Cut>
      <g className={styles.ink}>
        {skirt}
        <rect x="8" y="10" width="72" height="70" rx="12" fill={HATCH} stroke="none" />
        <g className={styles.cap}>
          <rect x="17" y="14" width="54" height="52" rx="8" />
          <text x="25" y="33" className="font-mono text-[11px]">
            {label}
          </text>
        </g>
      </g>
    </svg>
  );
}

function Terminal({ command }: { command: string }) {
  const frame = <rect x="6" y="6" width="116" height="80" rx="10" />;
  // Mono glyphs advance 0.6em: the cursor sits one cell after "$ command".
  const cursor = 16 + (command.length + 3) * 6.6;
  return (
    <svg viewBox="0 0 128 92">
      <Cut>{frame}</Cut>
      <g className={styles.ink}>
        {frame}
        <path d="M6 25h116" />
        <path d="M15.5 15.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0m9 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0m9 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0" />
        <rect x="48" y="12" width="64" height="7" rx="1" fill={HATCH} stroke="none" />
        <text x="16" y="46" className="font-mono text-[11px]">
          <tspan className={styles.dim}>$</tspan> {command}
        </text>
        <rect className={styles.cursor} x={cursor} y="36.5" width="6.6" height="12" stroke="none" />
        <path className={styles.dim} d="M16 61h54M16 71h36" />
      </g>
    </svg>
  );
}

/** Eight teeth: root radius 27, tip radius 34, about the centre of a 92px square. */
const PROFILE: [radius: number, degrees: number][] = [
  [27, -10],
  [34, -5.5],
  [34, 5.5],
  [27, 10],
];
const TEETH = Array.from({ length: 8 }, (_, tooth) =>
  PROFILE.map(([radius, offset]) => {
      const angle = ((tooth * 45 + offset) * Math.PI) / 180;
    return `${(46 + radius * Math.cos(angle)).toFixed(1)} ${(46 + radius * Math.sin(angle)).toFixed(1)}`;
  }).join("L"),
).join("L");

function Gear() {
  const cog = <path d={`M${TEETH}Z`} />;
  return (
    <svg viewBox="0 0 92 92">
      <Cut>{cog}</Cut>
      <g className={styles.ink}>
        <g className={styles.cog}>
          {cog}
          <circle cx="46" cy="46" r="20" strokeWidth="1" />
        </g>
        <circle cx="46" cy="46" r="12.5" />
        <text x="46" y="49.5" textAnchor="middle" className="font-mono text-[10px]">
          rs
        </text>
        {/* Centre lines, as on a part drawing. */}
        <path className={styles.centre} d="M4 46h84M46 4v84" />
      </g>
    </svg>
  );
}

function Spark() {
  const stars = (
    <>
      <path d="M38 16c2 17 9 24 26 26-17 2-24 9-26 26-2-17-9-24-26-26 17-2 24-9 26-26Z" />
      <path d="M65 10c1 7 3 9 10 10-7 1-9 3-10 10-1-7-3-9-10-10 7-1 9-3 10-10Z" />
    </>
  );
  return (
    <svg viewBox="0 0 84 84">
      <Cut>{stars}</Cut>
      <g className={`${styles.ink} ${styles.stars}`}>
        {stars}
        <path d="M38 16c2 17 9 24 26 26-17 2-24 9-26 26-2-17-9-24-26-26 17-2 24-9 26-26Z" fill={HATCH} stroke="none" />
        <path d="M14 66v8M10 70h8" />
      </g>
    </svg>
  );
}

function Stamp({ centre, ring }: { centre: string; ring: string }) {
  // The ring text is stretched to exactly one turn of its 35px circle.
  const turn = (2 * Math.PI * 35).toFixed(1);
  return (
    <svg viewBox="0 0 104 104">
      {/* Clear target for the pointer: a stamp is ink, not paper. */}
      <circle cx="52" cy="52" r="48" fill="transparent" stroke="none" />
      <circle cx="52" cy="52" r="47" strokeWidth="2" />
      <circle cx="52" cy="52" r="28" />
      <path id="sticker-ring" d="M52 87a35 35 0 1 1 0-70 35 35 0 1 1 0 70" stroke="none" />
      <text className="font-pixel text-[8.5px]">
        <textPath href="#sticker-ring" textLength={turn} lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      <text x="52" y="57.5" textAnchor="middle" className="font-pixel text-[15px]">
        {centre}
      </text>
      <path d="M33 44h38M33 63h38" />
    </svg>
  );
}

export function Stickers({ data }: { data: { terminal: string; key: string; stamp: { centre: string; ring: string } } }) {
  return (
    <Press data-stickers data-print="hide" className={styles.root}>
      <svg width="0" height="0" className="absolute">
        <pattern id="sticker-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <path d="M0 0v4" stroke="var(--foreground)" strokeWidth="0.8" opacity="0.28" />
        </pattern>
      </svg>
      <Sticker name="keycap" voice="key" tilt={-7} order={0}>
        <Keycap label={data.key} />
      </Sticker>
      <Sticker name="terminal" voice="tick" tilt={4} order={1}>
        <Terminal command={data.terminal} />
      </Sticker>
      <Sticker name="spark" voice="pop" tilt={-9} order={2}>
        <Spark />
      </Sticker>
      <Sticker name="gear" voice="detent" tilt={7} order={3}>
        <Gear />
      </Sticker>
      <Sticker name="stamp" voice="tap" tilt={-5} order={4}>
        <Stamp {...data.stamp} />
      </Sticker>
      <Lazy piece="lean" when="(hover: hover) and (pointer: fine)" data={null} />
    </Press>
  );
}
