/**
 * SLOT (margins + playful branch): mounted once at the end of <body>.
 *
 * Two things live here:
 * - The hand-drawn hovers (hand-drawn.module.css), attached by CSS alone to
 *   the existing `data-slot="button"`, `.link-underline` and `.leader` hooks.
 * - The easter eggs (eggs.tsx): a lazy chunk for devices with a mouse and a
 *   keyboard, fetched on the first input. It owns the key sequences (the Konami code, Shift+R, a typed
 *   word), the tab-title swap and the right-click menu on the header mark, and
 *   it loads the cursor cat, the exploded view and the menu only when one is
 *   summoned.
 *
 * Any other code can summon an egg without a key:
 *   window.dispatchEvent(new CustomEvent("playful:summon", { detail: "cat" }))
 * with detail "cat", "explode" or "reload". The command palette can list them
 * that way.
 */
import { playful } from "@/content/playful";

import styles from "./hand-drawn.module.css";
import { Lazy } from "./lazy";

export function PlayfulLayer() {
  return (
    <>
      {/* Anchors the global hover rules; see hand-drawn.module.css. */}
      <i hidden className={styles.hooks} />
      <Lazy piece="eggs" when="(hover: hover) and (pointer: fine)" data={playful.eggs} />
    </>
  );
}
