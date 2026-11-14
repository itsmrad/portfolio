"use client";

/**
 * The arcade shell: cartridge cards in the wide margins (from 80rem with a
 * mouse, R16), one "Arcade" index card, and the player for the one game that
 * is running. Loaded by components/playful/lazy.tsx on the visitor's first
 * input, so an untouched page and every phone load none of it.
 *
 * It sits outside the aria-hidden gutters: the cards are real controls in a
 * region named "Arcade", at the end of <main> in the tab order. Mounted by the
 * home page only (app/page.tsx), never the 404. Positioned against the
 * layout's relative wrapper around <main>, like the gutters.
 *
 * Other code can open it without a key:
 *   window.dispatchEvent(new CustomEvent("arcade:play", { detail: "snake" }))
 * with a game id, or no detail to focus the index card.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { play } from "@/lib/sound";
import { arcadeCopy as copy } from "@/content/arcade";

import styles from "./arcade.module.css";
import type { Entry } from "./contract";
import { games as a } from "./games/registry-a";
import { games as b } from "./games/registry-b";
import { games as c } from "./games/registry-c";
import { host } from "./host";

const GAMES = [...a, ...b, ...c];
/** The index card is placed like a cartridge, beside About. */
const INDEX: Pick<Entry, "id" | "section" | "near" | "side"> = {
  id: "arcade",
  section: "about",
  near: "final-year",
  side: "right",
};
/** Logical field: 4:3, about one CSS px a unit at 1280. */
const W = 240;
const H = 180;
const BELOW_TITLE = 104;
/** Paper kept clear around every card and margin item. */
const GAP = 16;
/** Left cards keep clear of the scroll ruler's ticks and tracker (its labels draw above the cards). */
const RULER = 88;
/** Sections whose margins stay free: Activity's graph is becoming a game with its own note and arrow. */
const RESERVED = ["activity"];

type Best = { v: number; t?: string };
const readBest = (id: string): Best | null => {
  try {
    return JSON.parse(localStorage.getItem(`arcade:${id}`) ?? "null");
  } catch {
    return null;
  }
};
const writeBest = (id: string, best: Best) => {
  try {
    localStorage.setItem(`arcade:${id}`, JSON.stringify(best));
  } catch {
    // Storage blocked: the best lasts for this visit only.
  }
};

/** The first element in `section` holding `text`, as deep as it goes; the section itself without text. */
function anchor(section: string, text?: string) {
  const root = document.getElementById(section);
  if (!root || !text) return root;
  let hit: Element | null = null;
  for (const element of root.querySelectorAll("*"))
    if (element.textContent?.includes(text) && (!hit || hit.contains(element))) hit = element;
  return hit;
}

type Place = { top: number; side: "left" | "right"; width: number };
type Span = [top: number, bottom: number];

/** Card widths beside the column: right cards clear the margin's height chain, left ones the scroll ruler's ticks. */
function widths(margin: number) {
  return {
    right: Math.min(320, margin - 36 - 20),
    left: Math.min(320, margin - 24 - RULER),
  };
}
/** A card's full height while a game plays (grip, title block, how-to, the 4:3 frame, the readout), plus a gap. */
const playing = (width: number) => 236 + Math.ceil(((width - 26) * 3) / 4) + GAP;

/**
 * The layout plan. Every card gets a slot on its side as tall as it is while playing, so opening a game never
 * covers, pushes or hides anything. Slots avoid every margin item already there (notes, readings, toys, the
 * cat, the timer), the gutters kept free beside RESERVED sections, and the cards placed before it. Cards go in
 * page order and alternate sides unless an entry asks for one; a left card needs room beside the ruler.
 */
function usePlaces(root: React.RefObject<HTMLElement | null>) {
  const [places, setPlaces] = useState<Record<string, Place>>({});
  useEffect(() => {
    const measure = () => {
      const box = root.current!.getBoundingClientRect();
      // The column is --frame-width, 640px by design.
      const width = widths((box.width - 640) / 2);
      const roomLeft = width.left >= 280;
      const y = (rect: DOMRect): Span => [rect.top - box.top - GAP, rect.bottom - box.top + GAP];
      const taken = { left: [] as Span[], right: [] as Span[] };
      for (const side of ["left", "right"] as const)
        for (const item of document.querySelectorAll(`[data-margin="${side}"] :is([data-life], [data-note], [data-cat-bed], [data-timer])`))
          taken[side].push(y(item.getBoundingClientRect()));
      for (const id of RESERVED) {
        const section = document.getElementById(id);
        if (!section) continue;
        taken.left.push(y(section.getBoundingClientRect()));
        taken.right.push(y(section.getBoundingClientRect()));
      }
      const next: Record<string, Place> = {};
      let flip: Place["side"] = "left";
      const wanted = [INDEX, ...GAMES].flatMap((item) => {
        const element = anchor(item.section, item.near);
        return element
          ? [
              {
                item,
                top: Math.round(element.getBoundingClientRect().top - box.top) + (item.near ? 0 : BELOW_TITLE),
              },
            ]
          : [];
      });
      for (const { item, top: want } of wanted.sort((a, b) => a.top - b.top)) {
        flip = flip === "left" ? "right" : "left";
        const side = (item.side ?? flip) === "left" && roomLeft ? "left" : "right";
        // The index is as tall as its list (two columns where it fits); a cartridge, as tall as it is playing.
        const height =
          item === INDEX
            ? 132 + Math.ceil(GAMES.length / Math.max(1, Math.floor((width[side] - 26) / 136))) * 26 + GAP
            : playing(width[side]);
        // Down from where it wants to be, to the first gap tall enough.
        let top = want;
        for (let clash = true; clash;) {
          const hit = taken[side].find(([from, to]) => top < to && top + height > from);
          clash = !!hit;
          if (hit) top = Math.ceil(hit[1]);
        }
        taken[side].push([top, top + height]);
        next[item.id] = { top, side, width: width[side] };
      }
      setPlaces((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.getElementById("main") ?? document.body);
    observer.observe(root.current!);
    // The working notes arrive in their own chunk; plan again once they are placed.
    addEventListener("life:layout", measure);
    return () => {
      observer.disconnect();
      removeEventListener("life:layout", measure);
    };
  }, [root]);
  return places;
}

type Phase = "loading" | "playing" | "over" | "failed";

const better = (entry: Entry, score: Best, best: Best | null) => !!best && (entry.lower ? score.v < best.v : score.v > best.v);

/**
 * The framed canvas, the readout and the game's lifecycle. Mounted while its card is open or closing; the game
 * runs only while `open`, so it stops the moment the card starts to fold and its last frame folds with it.
 */
function Player({
  entry,
  open,
  best,
  onBest,
  onClose,
  announce,
}: {
  entry: Entry;
  open: boolean;
  best: Best | null;
  onBest: (best: Best) => void;
  onClose: () => void;
  announce: (text: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const restart = useRef<() => void>(() => {});
  const overAt = useRef(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [score, setScore] = useState<Best | null>(null);
  // Paused means focus has left the canvas (off-screen and hidden-tab pauses need no notice).
  const [focused, setFocused] = useState(true);
  // The best as it stood when the round began, so beating it shows the moment it happens.
  const [mark, setMark] = useState(best);

  useEffect(() => {
    if (!open) return;
    const element = canvas.current!;
    let stop: (() => void) | undefined;
    let alive = true;
    let last: Best = { v: 0 };
    const h = host(element, {
      width: W,
      height: H,
      exclusive: true,
      pauseOnBlur: true,
      announce,
      onScore: (v, t) => setScore((last = { v, t })),
      onOver: (result) => {
        // Paint the round's final state (it may have ended inside a key handler), then keep it under the result.
        h.repaint();
        stop?.();
        stop = undefined;
        h.reset(false);
        overAt.current = Date.now();
        setPhase("over");
        onBest(last);
        announce(result ?? `${copy.over} ${last.t ?? last.v}`);
      },
    });
    element.focus({ preventScroll: true });
    // Bring the card's full playing height into view now, while it unfolds (the loop runs only on screen).
    const card = element.closest<HTMLElement>("[data-arcade-card]")!;
    const box = card.getBoundingClientRect();
    const below = box.top + playing(box.width) - GAP - innerHeight;
    const above = box.top - 72;
    const by = below > 0 ? Math.min(below + 16, above) : 0;
    if (by > 0) scrollBy({ top: by, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    entry.load().then(
      (module) => {
        if (!alive) return;
        restart.current = () => {
          stop?.();
          h.reset();
          last = { v: 0 };
          setScore(null);
          setMark(readBest(entry.id));
          setPhase("playing");
          stop = module.default(h.ctx);
          // The opening frame, even before the loop runs (the card may still be unfolding below the fold).
          h.repaint();
        };
        restart.current();
      },
      () => alive && setPhase("failed"),
    );
    // Esc always exits, wherever focus is, unless a dialog (the palette) owns it.
    const onEscape = (event: KeyboardEvent) => event.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    document.addEventListener("keydown", onEscape);
    return () => {
      alive = false;
      stop?.();
      h.stop();
      document.removeEventListener("keydown", onEscape);
    };
  }, [entry, open, announce, onBest, onClose]);

  // A key still held from the last round does not restart it.
  const again = () => {
    if (phase !== "over" || Date.now() - overAt.current < 500) return;
    play("tap");
    restart.current();
  };
  const beaten = !!score && better(entry, score, mark);
  const overlay =
    phase === "loading"
      ? copy.loading
      : phase === "failed"
        ? copy.failed
        : phase === "over"
          ? `${beaten ? copy.newBest : copy.over} ${copy.again}`
          : focused
            ? null
            : copy.paused;

  return (
    <>
      <div className={styles.frame}>
        <canvas
          ref={canvas}
          data-game={entry.id}
          tabIndex={0}
          role="application"
          aria-label={`${entry.name} game`}
          aria-describedby={`arcade-${entry.id}-how`}
          className={styles.canvas}
          onKeyDown={(event) => !event.repeat && (event.key === " " || event.key === "Enter") && again()}
          onPointerDown={again}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {overlay && (
          <p className={styles.overlay} data-phase={phase} data-beaten={(phase === "over" && beaten) || undefined} aria-hidden>
            {overlay}
          </p>
        )}
      </div>
      <div className={styles.readout}>
        <output className="tabular-nums" aria-label={copy.score}>
          <span className="eyebrow">{copy.score}</span> {/* Keyed by the value: each change replays the small tick. */}
          <span key={score?.v ?? "none"} className={score ? styles.tick : undefined}>
            {score ? (score.t ?? score.v) : "—"}
          </span>
        </output>
        <span className={`${styles.best} tabular-nums`} data-beaten={beaten || undefined}>
          <span className="eyebrow">{beaten ? copy.newBest : copy.best}</span>{" "}
          {beaten ? (score.t ?? score.v) : mark ? (mark.t ?? mark.v) : "—"}
        </span>
        <button
          type="button"
          data-slot="button"
          className={`${styles.button} ${styles.ghost}`}
          onClick={onClose}
          aria-keyshortcuts="Escape"
        >
          {copy.close} <kbd className="font-mono text-xs">Esc</kbd>
        </button>
      </div>
    </>
  );
}

function Card({
  entry,
  number,
  place,
  active,
  best,
  onPlay,
  children,
}: {
  entry: Pick<Entry, "id" | "name" | "howTo">;
  number?: number;
  place: Place;
  active: boolean;
  best?: Best | null;
  onPlay?: () => void;
  /** The player, given whether the card is open; mounted while open or folding closed. */
  children?: (open: boolean) => React.ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const was = useRef(active);
  // Still unfolding or folding: the stage keeps its content until the motion ends (or at once, reduced).
  const [shown, setShown] = useState(active);
  if (active && !shown) setShown(true);
  useEffect(() => {
    // Back from a game: focus returns to its Play button, unless the visitor has moved it somewhere else.
    const focus = document.activeElement;
    if (
      was.current &&
      !active &&
      (!focus || focus === document.body || focus.closest("[data-arcade-card]") === button.current?.closest("[data-arcade-card]"))
    )
      button.current?.focus({ preventScroll: true });
    was.current = active;
    if (active) return;
    const timer = setTimeout(() => setShown(false), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320);
    return () => clearTimeout(timer);
  }, [active]);
  return (
    <div
      role="group"
      aria-labelledby={`arcade-${entry.id}-name`}
      data-arcade-card={entry.id}
      data-side={place.side}
      data-active={active || undefined}
      className={styles.card}
      style={{ top: place.top, width: place.width }}
    >
      <div className={`${styles.grip} hatch`} aria-hidden />
      <div className={styles.body}>
        <p className="eyebrow flex justify-between" aria-hidden={number === undefined || undefined}>
          <span>{number === undefined ? copy.index : `${copy.cart} ${String(number).padStart(2, "0")}`}</span>
          {best !== undefined && !active && (
            <span className="tabular-nums">
              {copy.best} {best ? (best.t ?? best.v) : "—"}
            </span>
          )}
        </p>
        <p id={`arcade-${entry.id}-name`} className={styles.name}>
          {entry.name}
        </p>
        <p id={`arcade-${entry.id}-how`} className={styles.how}>
          {entry.howTo}
        </p>
        {children && !onPlay && children(true)}
        {onPlay && (
          <div className={styles.stage} data-open={active || undefined}>
            <div>{shown && children?.(active)}</div>
          </div>
        )}
        {onPlay && !active && (
          <button
            ref={button}
            type="button"
            data-slot="button"
            className={`${styles.button} ${styles.play}`}
            onClick={onPlay}
            aria-label={`${copy.play} ${entry.name}`}
          >
            <svg viewBox="0 0 12 12" aria-hidden className="size-3" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
            {copy.play}
          </button>
        )}
      </div>
    </div>
  );
}

export function Arcade() {
  const root = useRef<HTMLElement>(null);
  const places = usePlaces(root);
  const [active, setActive] = useState<string | null>(null);
  const [bests, setBests] = useState<Record<string, Best | null>>(() =>
    Object.fromEntries(GAMES.map((game) => [game.id, readBest(game.id)])),
  );
  const status = useRef<HTMLParagraphElement>(null);

  const announce = useCallback((text: string) => {
    if (status.current) status.current.textContent = text;
  }, []);
  const start = useCallback(
    (id: string) => {
      const entry = GAMES.find((game) => game.id === id);
      if (!entry) return;
      play("open");
      setActive(id);
      announce(`${entry.name} ${copy.started}`);
    },
    [announce],
  );
  const close = useCallback(() => {
    play("close");
    setActive(null);
    announce(copy.stopped);
  }, [announce]);
  const onBest = useCallback(
    (score: Best) =>
      setBests((all) => {
        const entry = GAMES.find((game) => game.id === active)!;
        const best = all[entry.id];
        if (score.v <= 0 && !entry.lower) return all;
        if (best && (entry.lower ? score.v >= best.v : score.v <= best.v)) return all;
        writeBest(entry.id, score);
        return { ...all, [entry.id]: score };
      }),
    [active],
  );

  useEffect(() => {
    const open = (id?: string) => {
      if (id && id !== "arcade") start(id);
      else document.querySelector<HTMLElement>('[data-arcade-card="arcade"] button')?.focus();
    };
    const onPlay = (event: Event) => open((event as CustomEvent<string | undefined>).detail);
    // A request left by the command palette (html[data-arcade]), possibly made before this chunk loaded.
    const onRequest = () => {
      const { dataset } = document.documentElement;
      const id = dataset.arcade;
      if (id === undefined) return;
      delete dataset.arcade;
      // shortcut: a fixed wait for the cards' first placement; tie it to the layout if it ever races.
      clearTimeout(waiting);
      waiting = setTimeout(() => open(id), 300);
    };
    let waiting: ReturnType<typeof setTimeout> | undefined;
    onRequest();
    addEventListener("arcade:play", onPlay);
    addEventListener("arcade:request", onRequest);
    return () => {
      clearTimeout(waiting);
      removeEventListener("arcade:play", onPlay);
      removeEventListener("arcade:request", onRequest);
    };
  }, [start]);

  // Margin decoration under a card steps aside: tell it where the cards are now.
  useEffect(() => {
    dispatchEvent(new Event("arcade:layout"));
  }, [places, active]);

  const index = places[INDEX.id];
  // Page order (top to bottom) for the numbers, the index and the tab order, whatever the registry order.
  const ordered = [...GAMES].sort((a, b) => (places[a.id]?.top ?? Infinity) - (places[b.id]?.top ?? Infinity));
  return (
    <section ref={root} aria-label={copy.label} className={styles.arcade}>
      {index && (
        <Card entry={{ id: INDEX.id, name: copy.index, howTo: copy.indexHowTo }} place={index} active={false}>
          {() => (
            <ul className={styles.list}>
              {ordered.map((game, i) => (
                <li key={game.id}>
                  <button type="button" className="link-underline" onClick={() => start(game.id)}>
                    <span className="eyebrow mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {game.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {ordered.map((game, i) => {
        const place = places[game.id];
        return (
          place && (
            <Card
              key={game.id}
              entry={game}
              number={i + 1}
              place={place}
              active={active === game.id}
              best={bests[game.id]}
              onPlay={() => start(game.id)}
            >
              {(open) => (
                <Player entry={game} open={open} best={bests[game.id] ?? null} onBest={onBest} onClose={close} announce={announce} />
              )}
            </Card>
          )
        );
      })}
      <p ref={status} role="status" className="sr-only" />
    </section>
  );
}
