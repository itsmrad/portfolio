import { cubicBezier, prefersReducedMotion } from "./dom";

/**
 * The visitor data shared by the counter cell and the globe, loaded lazily
 * when the footer comes near. One stats read and one heartbeat loop per page:
 * - stats (total, live, map cells) on load and every 2 minutes, CDN-cached;
 * - a heartbeat every 60 s while the tab is visible, for at most 30 minutes,
 *   stopped on pagehide; it is also how the server tells this visitor, and
 *   only them, their own coarse place and distance from Anupam.
 * Any failure leaves the state empty: the cell stays hatched, the globe plain.
 */
export type Cell = [lat: number, lon: number, visits: number];
export type Distance = { value: number; unit: "km" | "mi" } | { same: true };
export type Visitors = { total?: number; live?: number; cells: Cell[]; you?: [number, number]; distance?: Distance };

const STATS_EVERY = 120_000;
const BEAT_EVERY = 60_000;
const SESSION = 30 * 60_000;
const TAB = "visit-tab";

let state: Visitors = { cells: [] };
const listeners = new Set<(state: Visitors) => void>();
let started = false;

const emit = (patch: Partial<Visitors>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
};

async function read(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, init);
    const body: unknown = await response.json();
    return response.ok && body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const whole = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && (value as number) >= min;
const place = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length >= 2 && Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;

/** An anonymous id for this tab, kept for the tab's life only. */
function tabId() {
  try {
    const kept = sessionStorage.getItem(TAB);
    if (kept && /^[A-Za-z0-9_-]{22}$/.test(kept)) return kept;
  } catch {}
  const id = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  try {
    sessionStorage.setItem(TAB, id);
  } catch {}
  return id;
}

function start() {
  started = true;
  const began = performance.now();
  const id = tabId();
  let stopped = false;
  // Both are due at once.
  let statsAt = -Infinity;
  let beatAt = -Infinity;
  let timer = 0;
  let ok = false;

  const stats = async () => {
    statsAt = performance.now();
    const body = await read("/api/visit");
    if (!body || !whole(body.count) || !whole(body.live)) return;
    ok = true;
    const cells = Array.isArray(body.cells)
      ? body.cells.filter((cell): cell is Cell => Array.isArray(cell) && whole(cell[2], 1) && place(cell)).slice(0, 300)
      : [];
    emit({ total: Math.max(body.count, state.total ?? 0), live: body.live, cells });
  };

  const beat = async () => {
    beatAt = performance.now();
    const body = await read(`/api/visit/live?id=${id}`, { method: "POST" });
    if (body && place(body.you)) emit({ you: body.you, distance: body.distance as Distance | undefined });
  };

  // One timer serves both: it runs only while the tab is visible and the session is young.
  const tick = async () => {
    clearTimeout(timer);
    if (stopped || document.hidden) return;
    const now = performance.now();
    if (now - began > SESSION) return;
    if (now - statsAt >= STATS_EVERY) await stats();
    if (ok && now - beatAt >= BEAT_EVERY) await beat();
    timer = window.setTimeout(tick, 5000);
  };

  document.addEventListener("visibilitychange", tick);
  addEventListener(
    "pagehide",
    () => {
      stopped = true;
      clearTimeout(timer);
    },
    { once: true },
  );
  void tick();
}

/** Gets the current state now and on every change. Starts the reads on first use. */
export function subscribe(listener: (state: Visitors) => void) {
  listeners.add(listener);
  if (!started) start();
  listener(state);
  return () => void listeners.delete(listener);
}

/** A total this page learned from its own counted visit (fresher than the cached stats). */
export function noteTotal(total: number) {
  if (total > (state.total ?? 0)) emit({ total });
}

const COUNT_FROM = 24; // the total's last numbers roll up, like an odometer catching up
const EASE = cubicBezier(0.2, 0.7, 0.2, 1);

/** Animates a shown number toward a target; returns a cancel. */
function roll(from: number, to: number, duration: number, set: (value: number) => void) {
  if (prefersReducedMotion() || from === to) {
    set(to);
    return () => {};
  }
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    set(Math.round(from + (to - from) * EASE(t)));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  tick(start);
  return () => cancelAnimationFrame(frame);
}

/**
 * Drives the counter cell: reveals it once a real total arrives, rolls the
 * total to each new value, and writes who is here right now ("just you right
 * now", or "3 people here right now" with the number rolling). Live is never
 * below 1: whoever is looking is here. Returns a detach.
 */
export function showCounter(
  element: HTMLElement,
  mine: number | null,
  set: { total: (total: number) => void; shown: (shown: number) => void },
) {
  if (mine !== null) noteTotal(mine);
  const line = element.querySelector<HTMLElement>("[data-live]");
  const number = document.createElement("span");
  number.className = "font-pixel text-foreground";
  const write = (people: number) => {
    if (!line) return;
    line.dataset.shown = "";
    if (people > 1) {
      number.textContent = String(people);
      line.replaceChildren(number, ` ${line.dataset.many ?? ""}`);
    } else line.textContent = line.dataset.alone ?? "";
  };
  let lastTotal: number | null = null;
  let lastLive: number | null = null;
  let cancelTotal = () => {};
  let cancelLive = () => {};
  const unsubscribe = subscribe(({ total, live }) => {
    if (total === undefined) return;
    element.closest("dd")?.parentElement?.style.setProperty("visibility", "visible");
    if (total !== lastTotal) {
      cancelTotal();
      cancelTotal = roll(lastTotal ?? Math.max(0, total - COUNT_FROM), total, 1400, set.shown);
      lastTotal = total;
      set.total(total);
    }
    const people = Math.max(1, live ?? 1);
    if (people !== lastLive) {
      cancelLive();
      cancelLive = roll(lastLive ?? people, people, 400, write);
      lastLive = people;
    }
  });
  return () => {
    unsubscribe();
    cancelTotal();
    cancelLive();
  };
}
