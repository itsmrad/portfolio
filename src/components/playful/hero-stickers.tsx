/**
 * SLOT (margins + playful branch): first-screen stickers and toys.
 *
 * The hero mounts it inside an aria-hidden box that covers the whole hero
 * section (absolute inset-0, pointer-events-none, overflow visible).
 *
 * Five original stickers (stickers.tsx), drawn as inline SVG in the drawing's
 * own line and hatch: a key cap, a gear, a spark, a terminal and a stamp. They
 * are server-rendered, so they are on the first screen at first paint and
 * spring in with CSS alone. They sink when pressed, each playing its own voice
 * through lib/sound; the lean toward the cursor is a small chunk that arrives
 * with the first input.
 *
 * Contract kept:
 * - Absolutely positioned; the hero's content never moves.
 * - From 64rem they sit in the margins beside the hero. Below that, three
 *   small ones sit on the hatch band under the hero, clear of the name, the
 *   tagline and the buttons at any width.
 * - Nothing focusable; only the stickers take pointer events.
 */
import { playful } from "@/content/playful";

import { Stickers } from "./stickers";

export function HeroStickers() {
  return <Stickers data={playful.stickers} />;
}
