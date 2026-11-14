/**
 * Where the arcade mounts: beside <main>, outside the aria-hidden gutters. The
 * server renders nothing here; the shell is one lazy chunk fetched on the first
 * input, and only where the margins are wide enough for a game (R16).
 */
import { Lazy } from "@/components/playful/lazy";

export const ARCADE_WIDE = "(min-width: 80rem) and (pointer: fine)";

export function ArcadeSlot() {
  return <Lazy piece="arcade" when={ARCADE_WIDE} data={null} />;
}
