import { useEffect, useRef, useState, type CSSProperties } from "react";

import { play } from "@/lib/sound";
import { playful } from "@/content/playful";

import styles from "./life.module.css";
import margin from "./margins.module.css";

/**
 * The working notes below the hero: handwriting with arrows at the real things
 * beside them, mono readings, numbered callouts on lists, and five small
 * press-toys with a voice. Copy and anchors: `playful.life`.
 *
 * Its own chunk, fetched by margins.tsx once Experience nears the viewport (so
 * the first input stays inside the playful budget), only where the margins
 * exist. Decoration in the aria-hidden gutter: nothing here is focusable, and
 * anything a cartridge card from the arcade lands on steps aside (hidden).
 */
type Item = (typeof playful.life)[number];
const MONTHS = "janfebmaraprmayjunjulaugsepoctnovdec";
type Anchor = { in: string; text?: string };

/** The first element in the section holding `text`, as deep as it goes; the section itself without text. */
function find({ in: id, text }: Anchor) {
  const section = document.getElementById(id);
  if (!section || !text) return section;
  let hit: Element | null = null;
  for (const element of section.querySelectorAll("*")) if (element.textContent?.includes(text) && (!hit || hit.contains(element))) hit = element;
  return hit;
}

function Note({ item, top }: { item: Extract<Item, { kind: "note" }>; top: number }) {
  return (
    <p data-life data-reveal className={`${margin.note} ${styles.item}`} style={{ top }}>
      <span className={margin.hand}>{item.note}</span>
      <svg className={margin.arrow} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={1} d="M32 4c2 14-5 25-21 29M19 37l-8.5-3.5 6.5-7" />
      </svg>
    </p>
  );
}

function Ratio({ item, top }: { item: Extract<Item, { kind: "ratio" }>; top: number }) {
  return (
    <p data-life className={`${styles.ratio} ${styles.item}`} style={{ top, "--p": item.value / item.of } as CSSProperties}>
      <span className="block tabular-nums text-foreground">
        {item.value} / {item.of}
      </span>
      {item.label}
    </p>
  );
}

/** Five small toys, each tied to the line beside it. Pointer only: the gutter is decoration. */
function Toy({ item, top }: { item: Extract<Item, { kind: "toy" }>; top: number }) {
  const [state, setState] = useState(0);
  const [now] = useState(Date.now);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const items = "items" in item ? item.items : [];
  const later = (ms: number, then: () => void) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(then, ms);
  };

  let body: React.ReactNode;
  let press: (() => void) | undefined;
  let lift: (() => void) | undefined;
  if (item.toy === "dial") {
    // Turns through the providers Codenaya runs on, one notch a press.
    press = () => {
      play("detent");
      setState((value) => value + 1);
    };
    body = (
      <>
        <svg viewBox="0 0 40 40" className={styles.knob} style={{ rotate: `${state * 90}deg` }}>
          <circle cx="20" cy="20" r="15" />
          <path d="M20 8v8" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d="M20 1v3" style={{ rotate: `${i * 90}deg` }} />
          ))}
        </svg>
        <span className={styles.mono}>{items[state % items.length]}</span>
      </>
    );
  } else if (item.toy === "lock") {
    press = () => {
      play(state ? "toggle" : "toggleOff");
      setState((value) => 1 - value);
    };
    body = (
      <svg viewBox="0 0 32 36" className={styles.lock} data-open={state || undefined}>
        <path className={styles.shackle} d="M9 16V10a7 7 0 0 1 14 0v6" />
        <rect x="5" y="16" width="22" height="17" rx="2" />
        <path d="M16 22v5" />
      </svg>
    );
  } else if (item.toy === "terminal") {
    // The finish gate in miniature: checking, then both checks pass.
    press = () => {
      if (state === 1) return;
      play("tap");
      setState(1);
      later(700, () => {
        play("success");
        setState(2);
      });
    };
    body = (
      <span className={styles.terminal}>
        <span>{item.caption}</span>
        <span data-out>{state ? items[state - 1] : "▍"}</span>
      </span>
    );
  } else if (item.toy === "hold") {
    // Hold to talk, let go to paste: the shape of xflow.
    press = () => {
      play("tap");
      clearTimeout(timer.current);
      setState(1);
    };
    lift = () => {
      if (state !== 1) return;
      play("release");
      setState(2);
      later(1600, () => setState(0));
    };
    body = (
      <>
        <span className={styles.key} data-down={state === 1 || undefined}>
          {item.caption}
        </span>
        <span className={styles.wave} data-on={state === 1 || undefined}>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} style={{ animationDelay: `${i * -90}ms` }} />
          ))}
        </span>
        <span className={styles.mono}>{state ? items[state - 1] : " "}</span>
      </>
    );
  } else {
    // The degree as a scale from its first month to its last, with today on it.
    const [from, to] = items.map((label) => new Date(+label.slice(4), MONTHS.indexOf(label.slice(0, 3)) / 3).getTime());
    const at = Math.min(1, Math.max(0, (now - from!) / (to! - from!)));
    press = () => {
      play("detent");
      setState((value) => value + 1);
    };
    body = (
      <span className={styles.term} style={{ "--at": at } as CSSProperties}>
        <i key={state} data-nudge={state || undefined} />
        <span>{items[0]}</span>
        <span>{items[1]}</span>
      </span>
    );
  }

  return (
    <div
      data-life
      data-toy={item.toy}
      className={`${styles.toy} ${styles.item}`}
      style={{ top }}
      onPointerDown={press}
      onPointerUp={lift}
      onPointerLeave={lift}
    >
      {body}
      {item.toy !== "terminal" && item.toy !== "hold" && <span className={styles.caption}>{item.caption}</span>}
    </div>
  );
}

export function Life({ side }: { side: "left" | "right" }) {
  const root = useRef<HTMLDivElement>(null);
  const items = playful.life.filter((item) => item.side === side);
  const [tops, setTops] = useState<(number | number[] | null)[]>([]);

  useEffect(() => {
    const host = root.current!.parentElement!;
    const cover = () => {
      const cards = [...document.querySelectorAll("[data-arcade-card]")].map((card) => card.getBoundingClientRect());
      for (const element of host.querySelectorAll("[data-life]")) {
        const box = element.getBoundingClientRect();
        element.toggleAttribute("data-covered", cards.some((card) => box.left < card.right && box.right > card.left && box.top < card.bottom + 16 && box.bottom > card.top - 16));
      }
    };
    const measure = () => {
      const origin = host.getBoundingClientRect().top;
      const y = (element: Element) => Math.round(element.getBoundingClientRect().top - origin);
      const next = items.map((item) => {
        const element = find(item as Anchor);
        if (!element) return null;
        if (item.kind === "balloons") return [...element.parentElement!.children].map(y);
        return y(element) + ("dy" in item ? item.dy : 0);
      });
      setTops((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
      requestAnimationFrame(cover);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.getElementById("main") ?? document.body);
    addEventListener("arcade:layout", cover);
    return () => {
      observer.disconnect();
      removeEventListener("arcade:layout", cover);
    };
    // `items` is a fixed slice of the content file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Written in once seen, like the margin's own notes.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(({ target, isIntersecting }) => isIntersecting && target.setAttribute("data-seen", "")),
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const element of root.current!.querySelectorAll("[data-life]")) observer.observe(element);
    return () => observer.disconnect();
  }, [tops]);

  return (
    <div ref={root} className="contents">
      {items.map((item, i) => {
        const top = tops[i];
        if (top == null) return null;
        if (Array.isArray(top))
          return top.map((y, n) => (
            <span key={`${i}-${n}`} data-life className={`${styles.balloon} ${styles.item}`} style={{ top: y }}>
              {n + 1}
            </span>
          ));
        if (item.kind === "note") return <Note key={i} item={item} top={top} />;
        if (item.kind === "ratio") return <Ratio key={i} item={item} top={top} />;
        if (item.kind === "toy") return <Toy key={i} item={item} top={top} />;
        return null;
      })}
    </div>
  );
}
