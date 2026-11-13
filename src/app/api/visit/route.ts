import { createHmac } from "node:crypto";

import { counterStore, type CounterStore } from "@/components/footer/counter-store";

export const dynamic = "force-dynamic";

const KEY = "visitors";
const WINDOW = 86400; // one count per client address per day
// Crawlers, link previews, uptime checks and scripted clients are never counted.
const BOT = /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|curl|wget|python|axios|node|go-http|java\//i;
// One atomic step: mark the address for a day and count it, or just read the total.
const COUNT_ONCE = `if redis.call("SET", KEYS[2], 1, "NX", "EX", ARGV[1]) then return redis.call("INCR", KEYS[1]) end return tonumber(redis.call("GET", KEYS[1]) or "0")`;
// The CDN holds the total briefly, so reads cost the store at most one command a minute.
const SHARED = "public, s-maxage=60, stale-while-revalidate=600";

/** Every failure answers 200 with no count: the cell stays hatched and the browser logs nothing. */
const answer = (count?: number, cache = "no-store", status = 200) =>
  Response.json(count === undefined ? {} : { count }, { status, headers: { "Cache-Control": cache } });

async function command(store: CounterStore, args: (string | number)[]) {
  const response = await fetch(store.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${store.token}` },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`store ${response.status}`);
  const count = Number(((await response.json()) as { result?: unknown }).result ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("store reply");
  return count;
}

/** The total, for browsers already counted. */
export async function GET() {
  const store = counterStore();
  if (!store) return answer(undefined, "no-store", 404);
  try {
    return answer(await command(store, ["GET", KEY]), SHARED);
  } catch {
    return answer();
  }
}

/**
 * Counts a visit once per client address per day, in production only, and
 * returns the total. Anything that is not a plain same-origin browser visit
 * gets an empty answer without touching the store; the page then reads the
 * cached total with GET.
 */
export async function POST(request: Request) {
  const store = counterStore();
  if (!store) return answer(undefined, "no-store", 404);
  const headers = request.headers;
  // The page sends no body; anything else is not the page.
  if (Number(headers.get("content-length") ?? 0) > 0) return answer(undefined, "no-store", 413);
  const agent = headers.get("user-agent") ?? "";
  // Set by Vercel's edge from the connection, so it cannot be forged by the caller.
  const address = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const countable =
    process.env.VERCEL_ENV === "production" &&
    address &&
    agent &&
    !BOT.test(agent) &&
    headers.get("sec-fetch-site") === "same-origin" &&
    !/prefetch|prerender/i.test(`${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`);
  if (!countable) return answer();
  try {
    // Keyed by the address alone, hashed with the store's secret; the raw address is never stored.
    const caller = createHmac("sha256", store.token).update(address).digest("base64url").slice(0, 22);
    return answer(await command(store, ["EVAL", COUNT_ONCE, 2, KEY, `visitor:${caller}`, WINDOW]));
  } catch {
    return answer();
  }
}
