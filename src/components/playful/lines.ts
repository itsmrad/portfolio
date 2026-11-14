/** Spans down the page, relative to some origin: [top, bottom]. */
export type Span = [number, number];

/**
 * The page's full-bleed ruled lines (section rules, screen lines, hatch bands) as spans relative to `origin`
 * (a viewport y). Margin text must never sit on one (owner review round 2).
 */
export function ruled(origin: number): Span[] {
  const spans: Span[] = [];
  for (const element of document.querySelectorAll(".screen-line-top, .screen-line-bottom, .rule, .hatch-band")) {
    const { top, bottom } = element.getBoundingClientRect();
    const { classList } = element;
    if (classList.contains("hatch-band")) spans.push([top - origin, bottom - origin]);
    if (classList.contains("screen-line-top") || classList.contains("rule")) spans.push([top - origin, top - origin + 1]);
    if (classList.contains("screen-line-bottom")) spans.push([bottom - origin - 1, bottom - origin]);
  }
  return spans;
}

/** The first top at or below `y` where a block `height` tall keeps 12px of paper from every span (tilted handwriting reaches a few px past its box). */
export function clear(y: number, height: number, spans: Span[]) {
  for (let moved = true; moved; ) {
    moved = false;
    for (const [from, to] of spans)
      if (y < to + 12 && y + height > from - 12) {
        y = Math.ceil(to + 12);
        moved = true;
      }
  }
  return y;
}
