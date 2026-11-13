/**
 * SLOT (margins + playful branch): mounted once at the end of <body>.
 *
 * Renders nothing until filled. For page-wide extras that are not tied to a
 * place: summonable easter eggs (cursor companion, key sequences) and the
 * hand-drawn hover marks. Contract:
 * - Anything always-on is at most 1 KB; the rest loads on the event that
 *   summons it. Register palette entries in components/command/shortcuts.ts
 *   through the command branch rather than adding a second key listener.
 * - Hand-drawn hovers attach by CSS (a co-located CSS module) to the existing
 *   `data-slot="button"` and `.link-underline` hooks; do not edit the shared
 *   components.
 */
export function PlayfulLayer() {
  return null;
}
