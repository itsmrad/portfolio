/**
 * The banner glyphs' hit-testing (round 4): the glyphs are mask layers on the monogram's box (hero.module.css), so
 * they cost no element; a pointer over one is found by position from the layers' own computed masks. A pointer
 * cursor shows over a tile, hovering one fetches the press chunk (glyphs.ts), and a press is handed to it.
 * Fetched by effects.ts on the first press in the hero.
 */
// The glyphs are mask layers on the monogram's box (hero.module.css), so they cost no element: a press is found
// by position, from the layers' own computed masks, and handed to the glyph chunk (glyphs.ts).
type Layer = { ids: string[]; boxes: number[][]; images: string[] };
let layers: Layer[] | null = null;
let layersAt = 0;
const glyphChunk = () => import("./glyphs");

function glyphAt(x: number, y: number) {
  const mark = document.querySelector<HTMLElement>("[data-glyphs]");
  if (!mark || !mark.offsetWidth) return null;
  // Positions are fixed per width: read them again only when the width changes.
  if (!layers || layersAt !== innerWidth) {
    layersAt = innerWidth;
    layers = ["before", "after"].map((which) => {
      const style = getComputedStyle(mark, `::${which}`);
      const sizes = style.maskSize.split(",").map(parseFloat);
      return {
        ids: getComputedStyle(mark).getPropertyValue(`--glyphs-${which}`).replace(/"/g, "").trim().split(" "),
        boxes: style.maskPosition.split(",").map((pair, i) => {
          const [px, py] = pair.trim().split(" ").map(parseFloat);
          // A tile is 54 by 38 units: its height follows its width.
          return [parseFloat(style.left) + px!, parseFloat(style.top) + py!, sizes[i]!, (sizes[i]! * 38) / 54];
        }),
        images: style.maskImage.split(/,\s*(?=url\()/),
      };
    });
  }
  const origin = mark.getBoundingClientRect();
  for (const layer of layers)
    for (const [i, [left, top, width, height]] of layer.boxes.entries()) {
      // Inside the tile's outline: a diamond on top, its two sides below.
      const u = (x - origin.left - left!) / width!;
      const v = (y - origin.top - top!) / height!;
      if (u < 0 || u > 1 || v < 0 || v > 1 || Math.abs(u - 0.5) * 2 + Math.abs(v - 0.48) * 1.9 > 1.15) continue;
      return { id: layer.ids[i]!, left: left!, top: top!, width: width!, height: height!, image: layer.images[i]!, mark };
    }
  return null;
}
function glyphPointed(event: PointerEvent) {
  const hit = (event.target as Element).closest?.("#top") ? glyphAt(event.clientX, event.clientY) : null;
  const mark = document.querySelector<HTMLElement>("[data-glyphs]");
  // The cursor says a tile can be pressed, and goes back as soon as the pointer is off it, wherever it went.
  if (mark && mark.style.cursor !== (hit ? "pointer" : "")) mark.style.cursor = hit ? "pointer" : "";
  if (!hit) return;
  // Hovering a glyph fetches its chunk, so the press that follows answers at once.
  const ready = glyphChunk();
  if (event.type === "pointerdown") void ready.then((module) => module.press(hit as Parameters<typeof module.press>[0]), () => {});
}
let started = false;
/** Called by effects.ts with the event that fetched this chunk; from then on this chunk follows the pointer. */
export function start(event: PointerEvent) {
  if (!started) {
    started = true;
    addEventListener("pointermove", glyphPointed, { passive: true });
    addEventListener("pointerdown", glyphPointed, { passive: true });
  }
  glyphPointed(event);
}

