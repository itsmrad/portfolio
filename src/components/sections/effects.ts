/**
 * The lazy half of the home sections: plain DOM code over server-rendered
 * markup, fetched on the visitor's first input (see effects-loader). It finds
 * its elements by `data-*` attribute and listens on the document, so nothing
 * here depends on when or how often a section is rendered.
 */
import { play } from "@/lib/sound";

import { paintTime } from "./hero-time";

/* --- Local time ---------------------------------------------------------- */

// Nothing is painted while the tab is hidden; the next tick after it returns is at most 15 s away.
const tick = () =>
  document.hidden ||
  document.querySelectorAll<HTMLElement>("[data-clock]").forEach((clock) => paintTime(clock, clock.dataset.clock!));
tick();
setInterval(tick, 15_000);
document.addEventListener("visibilitychange", tick);

/* --- Clicks, handed over by the loader ----------------------------------- */

async function copy(button: HTMLElement) {
  try {
    await navigator.clipboard.writeText(button.dataset.copy!);
  } catch {
    // Refused: select the address so it can be copied by hand, and say so.
    const address = [button.firstElementChild, ...button.parentElement!.children].find((element) => element?.textContent === button.dataset.copy);
    if (address) getSelection()?.selectAllChildren(address);
    button.querySelector('[role="status"]')!.textContent = button.dataset.failedLabel!;
    return play("error");
  }
  play("copy");
  const status = button.querySelector('[role="status"]')!;
  button.dataset.copied = "";
  status.textContent = button.dataset.copiedLabel!;
  setTimeout(() => {
    delete button.dataset.copied;
    status.textContent = "";
  }, 2000);
}

export function click(event: MouseEvent) {
  const target = event.target as Element;
  const button = target.closest<HTMLElement>("[data-copy]");
  const game = target.closest<HTMLElement>("[data-graph-play]");
  if (button) void copy(button);
  else if (game) void import("@/components/arcade/games/contributions").then((module) => module.toggle(game), () => play("error"));
  else if (target.closest("main summary")) play("detent");
}

/* --- Banner glyphs: pressable by position ---------------------------------- */

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
addEventListener("pointermove", glyphPointed, { passive: true });
addEventListener("pointerdown", glyphPointed, { passive: true });

/* --- Contribution calendar: read out a day ------------------------------- */

const PITCH = 12; // one cell and its gap, in the drawing's units
const DAY = 86_400_000;
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
let selected = -1;

function calendar() {
  const days = document.querySelector<HTMLElement>("[data-calendar]");
  if (!days) return;
  const start = Date.parse(days.dataset.calendar!);
  return {
    days,
    start,
    offset: new Date(start).getUTCDay(),
    counts: days.dataset.counts!.split(","),
    svg: days.querySelector("svg")!,
    cursor: days.querySelector("rect")!,
    tip: days.nextElementSibling as HTMLElement,
  };
}

function select(index: number) {
  const found = calendar();
  if (!found) return;
  const { days, start, offset, counts, svg, cursor, tip } = found;
  selected = index >= 0 && index < counts.length ? index : -1;
  if (selected < 0) {
    cursor.removeAttribute("data-on");
    tip.textContent = "";
    return;
  }
  const [week, day] = [Math.floor((selected + offset) / 7), (selected + offset) % 7];
  cursor.setAttribute("x", String(week * PITCH - 1));
  cursor.setAttribute("y", String(day * PITCH - 1));
  cursor.setAttribute("data-on", "");
  const count = Number(counts[selected]);
  tip.textContent = `${count || "No"} contribution${count === 1 ? "" : "s"} on ${date.format(start + selected * DAY)}`;
  const box = svg.getBoundingClientRect();
  const scale = box.width / svg.viewBox.baseVal.width;
  tip.style.setProperty("--x", `${(week * PITCH + 5) * scale}px`);
  tip.style.bottom = `${days.getBoundingClientRect().bottom - box.top - day * PITCH * scale + 6}px`;
}

function pointed(event: PointerEvent) {
  const found = (event.target as Element).closest?.("[data-calendar]") && calendar();
  if (!found) return selected >= 0 && event.pointerType === "mouse" && select(-1);
  const box = found.svg.getBoundingClientRect();
  const unit = (found.svg.viewBox.baseVal.width / box.width) / PITCH;
  const [week, day] = [Math.floor((event.clientX - box.left) * unit), Math.floor((event.clientY - box.top) * unit)];
  select(day < 0 || day > 6 ? -1 : week * 7 + day - found.offset);
}
addEventListener("pointermove", pointed, { passive: true });
addEventListener("pointerdown", pointed, { passive: true });

/** The input that fetched this chunk, replayed by the loader: a hover or tap on the calendar still reads its day. */
export function wake(event: Event) {
  if (!(event instanceof PointerEvent)) return;
  pointed(event);
  glyphPointed(event);
}

const KEYS: Record<string, (from: number, last: number) => number> = {
  ArrowLeft: (from) => from - 7,
  ArrowRight: (from) => from + 7,
  ArrowUp: (from) => from - 1,
  ArrowDown: (from) => from + 1,
  Home: () => 0,
  End: (_, last) => last,
};

addEventListener("keydown", (event) => {
  const found = (event.target as Element).matches?.("[data-calendar]") && calendar();
  if (!found) return;
  if (event.key === "Escape") return select(-1);
  const last = found.counts.length - 1;
  const next = KEYS[event.key]?.(selected < 0 ? last : selected, last);
  if (next === undefined) return;
  // Arrow keys read days here; they must not also scroll the page.
  event.preventDefault();
  if (next >= 0 && next <= last) {
    select(next);
    play("tick");
  }
});
// Arriving by keyboard starts on today; leaving puts the read-out away.
addEventListener("focusin", (event) => {
  const target = event.target as Element;
  if (target.matches("[data-calendar]:focus-visible") && selected < 0) select(calendar()!.counts.length - 1);
});
addEventListener("focusout", (event) => (event.target as Element).matches("[data-calendar]") && select(-1));

/* --- Contribution calendar: wave in -------------------------------------- */

// Only when it is still below the fold and motion is welcome, so nothing the
// visitor can already see ever blinks out.
const days = document.querySelector<HTMLElement>("[data-calendar]");
if (
  days &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches &&
  days.getBoundingClientRect().top > innerHeight
) {
  days.dataset.wave = "wait";
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry!.isIntersecting) return;
      observer.disconnect();
      days.dataset.wave = "in";
    },
    { threshold: 0.4 },
  );
  observer.observe(days);
}
