import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

import { play } from "@/lib/sound";

import { Sprite } from "./cat-sprite";
import styles from "./margins.module.css";

/**
 * The two margins as one piece: the drawing's working notes. The table stays
 * and the sheet scrolls, so the dot field and the ruler are sticky while
 * everything tied to a section moves with it:
 *
 *   both    pointer-lit dot field; the margin's own width, dimensioned in
 *           line with the column's 640
 *   left    section ruler with a tracker (from 80rem), handwritten notes, the
 *           cat asleep beside "currently building"
 *   right   chained height dimensions, one per section, handwritten notes,
 *           the time-on-sheet readout
 *
 * Every number is measured from the page. Lazy chunk: see lazy.tsx.
 */

/** The page's section ids, in order (the contract of app/page.tsx). */
const SECTIONS = ["top", "about", "experience", "work", "building", "activity", "stack", "education", "contact"];
const WIDE = "(min-width: 64rem) and (pointer: fine)";
/** Where a note sits below the top of its section, and which way its arrow goes. */
const PLACE: Record<string, { dy: number; arrow?: "up" }> = { top: { dy: 214, arrow: "up" } };

type Note = { at: string; side: "left" | "right"; text: string };
type Box = { top: number; height: number };
type Boxes = Record<string, Box>;

/**
 * Top and height of each element relative to the gutter, kept current as the
 * page reflows. `self` is the gutter itself: its height holds the margin's width.
 */
function useBoxes(root: RefObject<HTMLDivElement | null>, notes: readonly Note[]) {
  const [boxes, setBoxes] = useState<Boxes>({});
  const key = [...new Set([...SECTIONS, ...notes.map((note) => note.at)])].join();
  useEffect(() => {
    const host = root.current!;
    const measure = () => {
      const origin = host.getBoundingClientRect();
      const next: Boxes = { self: { top: 0, height: Math.round(origin.width) } };
      for (const id of key.split(",")) {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        if (rect) next[id] = { top: Math.round(rect.top - origin.top), height: Math.round(rect.height) };
      }
      setBoxes((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    // <main> changes size whenever anything inside it moves.
    const observer = new ResizeObserver(measure);
    observer.observe(document.getElementById("main") ?? document.body);
    observer.observe(host);
    return () => observer.disconnect();
  }, [root, key]);
  return boxes;
}

/**
 * Marks `[data-reveal]` children once seen (their draw-in runs once) and
 * `[data-loop]` children while on screen (their loops pause otherwise).
 */
function useOnScreen(root: RefObject<HTMLDivElement | null>, boxes: Boxes, run: number) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) target.setAttribute("data-seen", "");
          target.toggleAttribute("data-live", isIntersecting);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const element of root.current!.querySelectorAll("[data-reveal], [data-loop]")) observer.observe(element);
    return () => observer.disconnect();
  }, [root, boxes, run]);
}

/** Replays the draw-ins when the hot-reload egg fires. */
function useReplay() {
  const [run, setRun] = useState(0);
  useEffect(() => {
    const replay = () => setRun((value) => value + 1);
    addEventListener("playful:reload", replay);
    return () => removeEventListener("playful:reload", replay);
  }, []);
  return run;
}

/** The dot field: a muted grid, and the same grid in the signal colour under a soft circle at the pointer. */
function Dots() {
  const lit = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = lit.current!;
    const wide = matchMedia(WIDE);
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const rect = layer.getBoundingClientRect();
      // Off the band, nothing is lit and nothing repaints.
      const near = x > rect.left - 120 && x < rect.right + 120;
      if (near) {
        layer.style.setProperty("--x", `${x - rect.left}px`);
        layer.style.setProperty("--y", `${y - rect.top}px`);
      }
      layer.style.setProperty("--on", near ? "1" : "0");
    };
    const move = (event: PointerEvent) => {
      if (!wide.matches) return;
      x = event.clientX;
      y = event.clientY;
      frame ||= requestAnimationFrame(paint);
    };
    const dim = () => layer.style.setProperty("--on", "0");
    addEventListener("pointermove", move, { passive: true });
    addEventListener("blur", dim);
    document.documentElement.addEventListener("pointerleave", dim);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", move);
      removeEventListener("blur", dim);
      document.documentElement.removeEventListener("pointerleave", dim);
    };
  }, []);
  return (
    <div className={styles.band}>
      <div className={styles.field}>
        <div className={styles.dots} />
        <div ref={lit} data-lit className={styles.lit} />
      </div>
    </div>
  );
}

/**
 * Dimension lines match the column's own strip (components/layout/dimension.tsx)
 * but are drawn in CSS, line and arrowheads both, so each costs two elements.
 */
const value = "bg-background font-mono text-xs/none text-dimension-foreground tabular-nums";

/** The margin's own width, on the line that states the column's. */
function Width({ px }: { px: number }) {
  return (
    <div data-reveal data-axis="x" className={`${styles.dim} inset-x-0 top-0 h-8`}>
      <span className={`${value} px-1`}>{px}</span>
    </div>
  );
}

/** One link of the chain down the right margin: the real height of a section. */
function Height({ id, box }: { id: string; box: Box }) {
  return (
    <div data-reveal data-measures={id} className={`${styles.dim} left-5 w-px`} style={{ top: box.top, height: box.height }}>
      <span className={`${value} py-1`}>{box.height}</span>
    </div>
  );
}

function Handwritten({ note, box }: { note: Note; box: Box }) {
  const place = PLACE[note.at] ?? { dy: 20 };
  return (
    <p data-reveal data-note={note.at} data-arrow={place.arrow} className={styles.note} style={{ top: box.top + place.dy }}>
      <span className={styles.hand}>{note.text}</span>
      <svg className={styles.arrow} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {/* Shaft, then head: one stroke, so it draws in that order. */}
        <path pathLength={1} d="M32 4c2 14-5 25-21 29M19 37l-8.5-3.5 6.5-7" />
      </svg>
    </p>
  );
}

function Notes({ notes, boxes }: { notes: readonly Note[]; boxes: Boxes }) {
  return notes.map((note) => {
    const box = boxes[note.at];
    return box && <Handwritten key={note.at} note={note} box={box} />;
  });
}

/** Tick length by distance from the focused row. */
const WAVE = [1, 44 / 56, 36 / 56, 28 / 56];

/** Scroll-spy ruler: three ticks a section, a tracker on the current one, a dock-style wave under the pointer. */
function Rail({ ids }: { ids: string[] }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const key = ids.join();

  useEffect(() => {
    const wide = matchMedia("(min-width: 80rem)");
    let frame = 0;
    const spy = () => {
      frame = 0;
      // A section is current once its top passes 42% of the viewport.
      const line = innerHeight * 0.42;
      const passed = key.split(",").filter((id) => document.getElementById(id)!.getBoundingClientRect().top < line);
      setActive(Math.max(0, passed.length - 1));
    };
    const onScroll = () => {
      if (wide.matches) frame ||= requestAnimationFrame(spy);
    };
    addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", onScroll);
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", onScroll);
    };
  }, [key]);

  const focus = hover ?? active;
  return (
    <div className={styles.railTrack}>
      <div className={styles.rail} data-reveal onPointerLeave={() => setHover(null)} style={{ "--rows": ids.length } as CSSProperties}>
        <i className={styles.tracker} style={{ translate: `0 ${active * 30}px` }} />
        {ids.map((id, index) => (
          <div
            key={id}
            data-rail={id}
            data-active={index === active || undefined}
            data-hover={index === hover || undefined}
            className={styles.row}
            style={{ "--wave": WAVE[Math.min(Math.abs(index - focus), 3)] } as CSSProperties}
            onPointerEnter={() => setHover(index)}
            onClick={() => {
              play("tick");
              document.getElementById(id)?.scrollIntoView();
            }}
          />
        ))}
      </div>
    </div>
  );
}
/** The cat's bed. Clicking it wakes the cursor companion (eggs.tsx); while the cat is out the bed is empty. */
function Bed({ hint, box }: { hint: string; box: Box }) {
  const [away, setAway] = useState(false);
  useEffect(() => {
    const onCat = (event: Event) => setAway((event as CustomEvent<boolean>).detail);
    addEventListener("playful:cat", onCat);
    return () => removeEventListener("playful:cat", onCat);
  }, []);
  return (
    <div
      data-loop
      data-reveal
      data-cat-bed
      data-away={away || undefined}
      className={styles.bed}
      style={{ top: box.top + 12 }}
      onClick={() => dispatchEvent(new CustomEvent("playful:summon", { detail: "cat" }))}
    >
      <span className={styles.hand}>{hint}</span>
      <Sprite poses={["sleepA", "sleepB"]} />
    </div>
  );
}

/** "here for 0:42": time on the sheet, ticking only while it is on screen. */
function Timer({ label }: { label: string }) {
  const element = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const seconds = Math.floor(performance.now() / 1000);
      setText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`);
    };
    // The clock runs only while the readout is on screen in a visible tab.
    let seen = false;
    const sync = () => {
      clearInterval(timer);
      timer = seen && !document.hidden ? setInterval(tick, 1000) : undefined;
    };
    const observer = new IntersectionObserver((entries) => {
      seen = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    observer.observe(element.current!);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <p ref={element} data-timer className="eyebrow absolute bottom-4 left-11 whitespace-nowrap tabular-nums">
      {text && `${label} ${text}`}
    </p>
  );
}

/** Everything a margin needs: its box, the measured sections, the reveal observer and the replay key. */
function useMargin(notes: readonly Note[]) {
  const root = useRef<HTMLDivElement>(null);
  const boxes = useBoxes(root, notes);
  const run = useReplay();
  useOnScreen(root, boxes, run);
  // The handwriting face is asked for only where a note has somewhere to sit (not on the 404).
  const written = notes.some((note) => boxes[note.at]);
  useEffect(() => {
    if (!written) return;
    // Notes stay unwritten until the face is in (or has failed), so they never restyle.
    const inked = () => root.current?.setAttribute("data-inked", "");
    document.fonts.load("20px Caveat").then(inked, inked);
  }, [written]);
  return { root, boxes, run };
}

export function Left({ data }: { data: { notes: readonly Note[]; cat: string } }) {
  const { root, boxes, run } = useMargin(data.notes);
  const present = SECTIONS.filter((id) => boxes[id]);
  return (
    <div ref={root} data-margin="left" className={styles.root}>
      <Dots />
      <div key={run} className="contents">
        {boxes.top && boxes.self && <Width px={boxes.self.height} />}
        <Notes notes={data.notes} boxes={boxes} />
        {boxes.building && <Bed hint={data.cat} box={boxes.building} />}
        {present.length > 1 && <Rail ids={present} />}
      </div>
    </div>
  );
}

export function Right({ data }: { data: { notes: readonly Note[]; timer: string } }) {
  const { root, boxes, run } = useMargin(data.notes);
  return (
    <div ref={root} data-margin="right" className={styles.root}>
      <Dots />
      <div key={run} className="contents">
        {boxes.top && boxes.self && <Width px={boxes.self.height} />}
        {SECTIONS.map((id) => boxes[id] && <Height key={id} id={id} box={boxes[id]} />)}
        <Notes notes={data.notes} boxes={boxes} />
        {boxes.contact && <Timer label={data.timer} />}
      </div>
    </div>
  );
}
