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
const INDEX: Pick<Entry, "id" | "section" | "near" | "side"> = { id: "arcade", section: "about", near: "final-year" };
/** Logical field: 4:3, about one CSS px a unit at 1280. */
const W = 240;
const H = 180;
/** Room each card keeps below its top on its side: a playing card's full height and a gap. */
const SLOT = 400;
const BELOW_TITLE = 104;
/** Left cards must clear the scroll ruler and its labels at the margin's outer edge. */
const RULER = 176;

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
  for (const element of root.querySelectorAll("*")) if (element.textContent?.includes(text) && (!hit || hit.contains(element))) hit = element;
  return hit;
}

type Place = { top: number; side: "left" | "right" };

/** Card tops beside their anchors, kept current as the page reflows; cards on one side never overlap. */
function usePlaces(root: React.RefObject<HTMLElement | null>) {
  const [places, setPlaces] = useState<Record<string, Place>>({});
  useEffect(() => {
    const measure = () => {
      const box = root.current!.getBoundingClientRect();
      // The column is --frame-width, 640px by design.
      const margin = (box.width - 640) / 2;
      const card = Math.min(320, margin - 56);
      const roomLeft = margin - 24 - card >= RULER;
      const next: Record<string, Place> = {};
      const floor = { left: 0, right: 0 };
      // Flow down the page in page order, whatever the registry order.
      const wanted = [INDEX, ...GAMES].flatMap((item) => {
        const element = anchor(item.section, item.near);
        return element ? [{ item, top: Math.round(element.getBoundingClientRect().top - box.top) + (item.near ? 0 : BELOW_TITLE) }] : [];
      });
      for (const { item, top: want } of wanted.sort((x, y) => x.top - y.top)) {
        const side = item.side === "left" && roomLeft ? "left" : "right";
        const top = Math.max(want, floor[side]);
        next[item.id] = { top, side };
        floor[side] = top + SLOT;
      }
      setPlaces((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.getElementById("main") ?? document.body);
    observer.observe(root.current!);
    return () => observer.disconnect();
  }, [root]);
  return places;
}

type Phase = "loading" | "playing" | "over" | "failed";

/** The framed canvas, the readout and the game's lifecycle. Mounted only while its card is active. */
function Player({ entry, best, onBest, onClose, announce }: { entry: Entry; best: Best | null; onBest: (best: Best) => void; onClose: () => void; announce: (text: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const restart = useRef<() => void>(() => {});
  const overAt = useRef(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [score, setScore] = useState<Best | null>(null);
  // Paused means focus has left the canvas (off-screen and hidden-tab pauses need no notice).
  const [focused, setFocused] = useState(true);

  useEffect(() => {
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
    element.focus();
    entry.load().then(
      (module) => {
        if (!alive) return;
        restart.current = () => {
          stop?.();
          h.reset();
          last = { v: 0 };
          setScore(null);
          setPhase("playing");
          stop = module.default(h.ctx);
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
  }, [entry, announce, onBest, onClose]);

  // A key still held from the last round does not restart it.
  const again = () => phase === "over" && Date.now() - overAt.current > 500 && restart.current();
  const overlay =
    phase === "loading" ? copy.loading : phase === "failed" ? copy.failed : phase === "over" ? `${copy.over} ${copy.again}` : focused ? null : copy.paused;

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
          <p className={styles.overlay} data-phase={phase} aria-hidden>
            {overlay}
          </p>
        )}
      </div>
      <div className={styles.readout}>
        <output className="tabular-nums" aria-label={copy.score}>
          <span className="eyebrow">{copy.score}</span> {score ? (score.t ?? score.v) : "—"}
        </output>
        <span className="tabular-nums text-muted-foreground">
          <span className="eyebrow">{copy.best}</span> {best ? (best.t ?? best.v) : "—"}
        </span>
        <button type="button" data-slot="button" className={`${styles.button} ${styles.ghost}`} onClick={onClose} aria-keyshortcuts="Escape">
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
  children?: React.ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const was = useRef(active);
  useEffect(() => {
    // Back from a game: focus returns to its Play button, unless the visitor has moved it somewhere else.
    const focus = document.activeElement;
    if (was.current && !active && (!focus || focus === document.body)) button.current?.focus({ preventScroll: true });
    was.current = active;
  }, [active]);
  return (
    <div
      role="group"
      aria-labelledby={`arcade-${entry.id}-name`}
      data-arcade-card={entry.id}
      data-side={place.side}
      data-active={active || undefined}
      className={styles.card}
      style={{ top: place.top }}
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
        {children}
        {onPlay && !active && (
          <button ref={button} type="button" data-slot="button" className={`${styles.button} ${styles.play}`} onClick={onPlay} aria-label={`${copy.play} ${entry.name}`}>
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
  const [bests, setBests] = useState<Record<string, Best | null>>(() => Object.fromEntries(GAMES.map((game) => [game.id, readBest(game.id)])));
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
    const onPlay = (event: Event) => {
      const id = (event as CustomEvent<string | undefined>).detail;
      if (id) start(id);
      else document.querySelector<HTMLElement>('[data-arcade-card="arcade"] button')?.focus();
    };
    addEventListener("arcade:play", onPlay);
    return () => removeEventListener("arcade:play", onPlay);
  }, [start]);

  // Margin decoration under a card steps aside: tell it where the cards are now.
  useEffect(() => {
    dispatchEvent(new Event("arcade:layout"));
  }, [places, active]);

  const index = places[INDEX.id];
  return (
    <section ref={root} aria-label={copy.label} className={styles.arcade}>
      {index && (
        <Card entry={{ id: INDEX.id, name: copy.index, howTo: copy.indexHowTo }} place={index} active={false}>
          <ul className={styles.list}>
            {GAMES.map((game, i) => (
              <li key={game.id}>
                <button type="button" className="link-underline" onClick={() => start(game.id)}>
                  <span className="eyebrow mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {game.name}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {GAMES.map((game, i) => {
        const place = places[game.id];
        return (
          place && (
            <Card key={game.id} entry={game} number={i + 1} place={place} active={active === game.id} best={bests[game.id]} onPlay={() => start(game.id)}>
              {active === game.id && <Player entry={game} best={bests[game.id] ?? null} onBest={onBest} onClose={close} announce={announce} />}
            </Card>
          )
        );
      })}
      <p ref={status} role="status" className="sr-only" />
    </section>
  );
}
