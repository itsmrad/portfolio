/**
 * Pressing a banner glyph (round 4, R23): its tile dips and springs back in a
 * colour of its own, its note plays (haptics come with the voice on phones),
 * and a one-line joke about it rises beside it, then fades. Its own chunk,
 * fetched when a glyph is first hovered or pressed (effects.ts finds the glyph
 * by position); it adds at most two elements, made on first use and reused:
 * the pressed tile and the popup. Decorative: hidden from assistive tech.
 */
import { glyphs, type GlyphId } from "@/content/glyphs";
import { play } from "@/lib/sound";

import styles from "./glyphs.module.css";

export type Hit = { id: GlyphId; left: number; top: number; width: number; height: number; image: string; mark: HTMLElement };

let tile: HTMLElement | undefined;
let popup: HTMLElement | undefined;
let fade: ReturnType<typeof setTimeout> | undefined;
const shown: Partial<Record<GlyphId, number>> = {};

const made = (className: string, hook: string) => {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute(hook, "");
  element.setAttribute("aria-hidden", "true");
  return element;
};
/** Restarts a CSS animation keyed by an attribute. */
const replay = (element: HTMLElement) => {
  element.removeAttribute("data-on");
  void element.offsetWidth;
  element.setAttribute("data-on", "");
};

/** A joke for this glyph, never the one it showed last. */
export function joke(id: GlyphId) {
  const { jokes } = glyphs[id];
  const last = shown[id];
  // Any of them the first time; afterwards one of the others, so a joke never shows twice in a row.
  let next = Math.floor(Math.random() * (last === undefined ? jokes.length : jokes.length - 1));
  if (last !== undefined && next >= last) next++;
  shown[id] = next;
  return jokes[next]!;
}

/** `left`/`top` are the tile's position inside `mark`, in px. */
export function press(hit: Hit) {
  const { id, mark } = hit;
  const glyph = glyphs[id];
  tile ??= made(styles.tile!, "data-pressed");
  popup ??= made(styles.popup!, "data-joke");
  mark.append(tile, popup);

  Object.assign(tile.style, { left: `${hit.left}px`, top: `${hit.top}px`, width: `${hit.width}px`, height: `${hit.height}px` });
  tile.style.setProperty("--image", hit.image);
  tile.style.setProperty("--hue", `var(--arcade-${glyph.hue})`);
  replay(tile);
  const box = mark.getBoundingClientRect();
  play("note", { index: glyph.note, x: box.left + hit.left + hit.width / 2 });

  popup.textContent = joke(id);
  popup.style.setProperty("--hue", `var(--arcade-${glyph.hue})`);
  place(popup, hit, mark);
  replay(popup);
  clearTimeout(fade);
  fade = setTimeout(() => popup?.removeAttribute("data-on"), 2800);
}

/**
 * Above the tile, centred on it; below it when there is no room above. Always inside the banner (the hero's
 * cover, above the row with the name and the buttons), 8px from its edges and so from the viewport's.
 */
function place(element: HTMLElement, hit: Hit, mark: HTMLElement) {
  const cover = mark.parentElement!;
  const area = cover.getBoundingClientRect();
  const foot = (cover.children[1] as HTMLElement | undefined)?.getBoundingClientRect().top ?? area.bottom;
  const origin = mark.getBoundingClientRect();
  const [w, h] = [element.offsetWidth, element.offsetHeight];
  const [minX, maxX] = [area.left + 8, Math.min(area.right, innerWidth) - 8 - w];
  const [minY, maxY] = [area.top + 8, foot - 8 - h];
  const cx = origin.left + hit.left + hit.width / 2;
  const above = origin.top + hit.top - 6 - h;
  const below = origin.top + hit.top + hit.height + 6;
  const x = Math.min(Math.max(cx - w / 2, minX), maxX);
  const y = Math.min(Math.max(above >= minY ? above : below, minY), maxY);
  element.style.left = `${x - origin.left}px`;
  element.style.top = `${y - origin.top}px`;
}
