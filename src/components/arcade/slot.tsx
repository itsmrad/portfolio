/**
 * Where the arcade mounts: the end of the home page, outside the aria-hidden gutters. The
 * server renders nothing here; the shell is one lazy chunk fetched after the
 * first input once Experience nears the viewport, and only where the margins
 * are wide enough for a game (R16).
 */
import { Lazy } from "@/components/playful/lazy";

export const ARCADE_WIDE = "(min-width: 80rem) and (pointer: fine)";

export function ArcadeSlot() {
  // Once Experience nears: the first input alone stays inside the playful budget.
  return <Lazy piece="arcade" when={ARCADE_WIDE} near="experience" data={null} />;
}
