import { createHmac } from "node:crypto";

import { counterStore, type CounterStore } from "./counter-store";

/**
 * Server side of the visitor counter, the live count and the visitor map
 * (routes: /api/visit and /api/visit/live). Ruling R22, in short:
 * - Location comes only from Vercel's request geo headers, rounded to a whole
 *   degree (about 110 km) and kept only as a count per cell. No addresses, no
 *   per-visitor records, no cookies, no third-party requests.
 * - Writes happen in production only, for plain same-origin browser requests,
 *   and never more than DAILY_WRITES a day. Everything shared is served from
 *   the CDN cache, so a flood of reads costs one store read per cache window.
 * - Any failure answers an empty 200: the page shows its plain state.
 */

export const KEYS = {
  total: "visitors",
  cells: "visitors:cells",
  live: "visitors:live",
  day: (now: number) => `visitors:day:${new Date(now).toISOString().slice(0, 10)}`,
  marker: (hash: string) => `visitor:${hash}`,
};

/** One count per client address per day. */
const MARKER_TTL = 86400;
/** Store writes allowed per UTC day, visits and heartbeats together; real traffic is a few a day. */
export const DAILY_WRITES = 1000;
/** A tab is live while it has sent a heartbeat this recently (it beats every 60 s). */
export const LIVE_WINDOW = 130_000;
/** At most this many map cells, busiest first. */
export const MAX_CELLS = 300;
const MAX_COUNT = 1_000_000_000;
const TIMEOUT = 3000;
/** Shared reads: at most one store read per five minutes per CDN region, however many requests. */
export const SHARED = "public, s-maxage=300, stale-while-revalidate=600";
/** Anupam's place: New Delhi. */
export const HOME = { lat: 28.61, lon: 77.21 };
/** Countries whose everyday distances are in miles. */
const MILES = new Set(["US", "GB", "LR", "MM"]);

// Crawlers, link previews, uptime checks and scripted clients never count.
const BOT = /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|curl|wget|python|axios|node|go-http|java\//i;

// Both scripts open with the day's write counter: past the ceiling they write nothing more.
// Billed by Upstash as 1 + each redis.call.
/** -- visit: KEYS day, marker, total, live, cells; ARGV limit, marker ttl, cell or "", live cutoff */
export const VISIT_SCRIPT = `-- visit
local n = redis.call("INCR", KEYS[1])
if n == 1 then redis.call("EXPIRE", KEYS[1], 172800) redis.call("ZREMRANGEBYSCORE", KEYS[4], "-inf", ARGV[4]) end
if n > tonumber(ARGV[1]) then return -1 end
if not redis.call("SET", KEYS[2], 1, "NX", "EX", ARGV[2]) then return -2 end
local total = redis.call("INCR", KEYS[3])
if ARGV[3] ~= "" then redis.call("ZINCRBY", KEYS[5], 1, ARGV[3]) end
return total`;
/** -- live: KEYS day, live; ARGV limit, now, live cutoff, tab id */
export const LIVE_SCRIPT = `-- live
local n = redis.call("INCR", KEYS[1])
if n == 1 then redis.call("EXPIRE", KEYS[1], 172800) redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", ARGV[3]) end
if n > tonumber(ARGV[1]) then return -1 end
redis.call("ZADD", KEYS[2], ARGV[2], ARGV[4])
return 1`;

const json = (body: object, cache = "no-store", status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": cache } });

// After the ceiling, this instance stops calling the store until the next UTC day.
let closedUntil = 0;
const nextUtcDay = (now: number) => (Math.floor(now / 86_400_000) + 1) * 86_400_000;

async function call(store: CounterStore, path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${store.url}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${store.token}` },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`store ${response.status}`);
  return response.json();
}

/** A store integer: a whole number from 0 to MAX_COUNT, or a failure. */
function count(value: unknown, min = 0) {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < min || number > MAX_COUNT) {
    throw new Error("store value");
  }
  return number;
}

export type Cell = [lat: number, lon: number, visits: number];

/** "28:77" from the store, checked: whole degrees within range, or null. */
function parseCell(member: unknown): [number, number] | null {
  const match = typeof member === "string" ? /^(-?\d{1,2}):(-?\d{1,3})$/.exec(member) : null;
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
}

/** The requester's place from Vercel's geo headers, to the whole degree, or null if absent or invalid. */
export function cellFrom(headers: Headers): [number, number] | null {
  const read = (name: string) => {
    const raw = headers.get(name)?.trim() ?? "";
    // A plain decimal, as Vercel sends it; nothing else is trusted.
    return /^-?\d{1,3}(\.\d{1,8})?$/.test(raw) ? Number(raw) : NaN;
  };
  const lat = read("x-vercel-ip-latitude");
  const lon = read("x-vercel-ip-longitude");
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null;
  // 0 rather than -0, so a cell has one name.
  return [Math.round(lat) || 0, Math.round(lon) === -180 ? 180 : Math.round(lon) || 0];
}

export type Distance = { value: number; unit: "km" | "mi" } | { same: true };

/**
 * How far the requester's cell is from Anupam, rounded as honestly as a 1°
 * cell allows: to 10 below 1,000, to 100 above. Miles where people use them.
 */
export function distanceFrom(cell: [number, number], country: string | null): Distance {
  const home: [number, number] = [Math.round(HOME.lat), Math.round(HOME.lon)];
  if (cell[0] === home[0] && cell[1] === home[1]) return { same: true };
  const rad = Math.PI / 180;
  const [lat1, lon1, lat2, lon2] = [cell[0] * rad, cell[1] * rad, HOME.lat * rad, HOME.lon * rad];
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  const unit = MILES.has((country ?? "").toUpperCase()) ? "mi" : "km";
  const raw = unit === "mi" ? km * 0.621371 : km;
  const step = raw < 1000 ? 10 : 100;
  return { value: Math.max(step, Math.round(raw / step) * step), unit };
}

/** A plain same-origin browser request, not a bot, prefetch or prerender. */
function fromPage(headers: Headers) {
  const agent = headers.get("user-agent") ?? "";
  return (
    agent.length > 0 &&
    agent.length < 512 &&
    !BOT.test(agent) &&
    headers.get("sec-fetch-site") === "same-origin" &&
    !/prefetch|prerender/i.test(`${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`)
  );
}

/** Writes need production, a page request, and the day's ceiling not yet reached on this instance. */
const mayWrite = (headers: Headers, now: number) =>
  process.env.VERCEL_ENV === "production" && fromPage(headers) && now >= closedUntil;

/** GET /api/visit: the shared numbers, cached by the CDN. Without a store, an empty answer cached for a day. */
export async function stats() {
  const store = counterStore();
  if (!store) return json({}, "public, s-maxage=86400");
  const now = Date.now();
  try {
    const replies = (await call(store, "/pipeline", [
      ["GET", KEYS.total],
      ["ZCOUNT", KEYS.live, now - LIVE_WINDOW, "+inf"],
      ["ZREVRANGE", KEYS.cells, 0, MAX_CELLS - 1, "WITHSCORES"],
    ])) as { result?: unknown }[];
    if (!Array.isArray(replies) || replies.length !== 3) throw new Error("store reply");
    const [total, live, ranked] = replies.map((reply) => reply?.result);
    const flat = Array.isArray(ranked) ? ranked.slice(0, MAX_CELLS * 2) : [];
    const cells: Cell[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const cell = parseCell(flat[i]);
      // A bad member is skipped, not trusted.
      if (cell) cells.push([...cell, count(flat[i + 1], 1)]);
    }
    return json({ count: count(total ?? 0), live: count(live ?? 0), cells }, SHARED);
  } catch {
    return json({});
  }
}

/**
 * POST /api/visit: counts a visit once per client address per day and adds
 * its cell to the map. Returns the new total when it counted, else {}.
 */
export async function visit(request: Request) {
  const store = counterStore();
  if (!store) return json({}, "no-store", 404);
  const headers = request.headers;
  // The page sends no body; anything else is not the page.
  if (Number(headers.get("content-length") ?? 0) > 0) return json({}, "no-store", 413);
  const now = Date.now();
  // Set by Vercel's edge from the connection, so the caller cannot forge it.
  const address = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!address || !mayWrite(headers, now)) return json({});
  const cell = cellFrom(headers);
  try {
    // Keyed by the address alone, hashed with the store's secret; the raw address is never stored.
    const hash = createHmac("sha256", store.token).update(address).digest("base64url").slice(0, 22);
    const reply = (await call(store, "", [
      "EVAL",
      VISIT_SCRIPT,
      5,
      KEYS.day(now),
      KEYS.marker(hash),
      KEYS.total,
      KEYS.live,
      KEYS.cells,
      DAILY_WRITES,
      MARKER_TTL,
      cell ? `${cell[0]}:${cell[1]}` : "",
      now - LIVE_WINDOW,
    ])) as { result?: unknown };
    const result = count(reply?.result, -2);
    if (result === -1) closedUntil = nextUtcDay(now);
    return json(result > 0 ? { count: result } : {});
  } catch {
    return json({});
  }
}

/**
 * POST /api/visit/live?id=<tab>: a heartbeat. Marks the tab live (in
 * production) and tells the requester, and only them, where they are: their
 * cell and their distance from Anupam. Never cached, never stored beyond the
 * map's aggregate.
 */
export async function live(request: Request) {
  const store = counterStore();
  if (!store) return json({}, "no-store", 404);
  const headers = request.headers;
  if (Number(headers.get("content-length") ?? 0) > 0) return json({}, "no-store", 413);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{22}$/.test(id) || !fromPage(headers)) return json({});
  const now = Date.now();
  const cell = cellFrom(headers);
  const country = headers.get("x-vercel-ip-country");
  const you = cell ? { you: cell, distance: distanceFrom(cell, /^[A-Za-z]{2}$/.test(country ?? "") ? country : null) } : {};
  if (mayWrite(headers, now)) {
    try {
      const reply = (await call(store, "", ["EVAL", LIVE_SCRIPT, 2, KEYS.day(now), KEYS.live, DAILY_WRITES, now, now - LIVE_WINDOW, id])) as {
        result?: unknown;
      };
      if (count(reply?.result, -1) === -1) closedUntil = nextUtcDay(now);
    } catch {
      // The requester still gets their own place; only the live count misses this beat.
    }
  }
  return json(you);
}

/** For tests: forget this instance's ceiling. */
export function reopen() {
  closedUntil = 0;
}
