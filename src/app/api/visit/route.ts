import { createHash } from "node:crypto";

import { counterStore } from "@/components/footer/counter-store";

export const dynamic = "force-dynamic";

const KEY = "visitors";
// Crawlers, link previews, uptime checks and scripted clients are never counted.
const BOT = /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|curl|wget|python|axios|node|go-http|java\//i;
// Atomically: count this caller only if it has not been counted in the last 30 minutes.
const COUNT_ONCE = `if redis.call("SET", KEYS[2], 1, "NX", "EX", 1800) then return redis.call("INCR", KEYS[1]) end return tonumber(redis.call("GET", KEYS[1]) or "0")`;

async function command(args: (string | number)[]) {
  const store = counterStore();
  if (!store) return null;
  const response = await fetch(store.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${store.token}` },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`store ${response.status}`);
  return Number(((await response.json()) as { result: unknown }).result ?? 0);
}

function reply(count: number | null) {
  return Response.json(count === null ? {} : { count }, {
    status: count === null ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}

/** The total, for visitors already counted in this browser. */
export async function GET() {
  try {
    return reply(await command(["GET", KEY]));
  } catch {
    return Response.json({}, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

/** Counts a first visit from this browser (once per 30 minutes per network and browser) and returns the total. */
export async function POST(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  const human = agent && !BOT.test(agent) && request.headers.get("sec-fetch-site") === "same-origin";
  try {
    if (!human) return reply(await command(["GET", KEY]));
    // Hashed, never stored raw; the key expires with the 30-minute window.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const caller = createHash("sha256").update(`${ip}|${agent}`).digest("base64url").slice(0, 22);
    return reply(await command(["EVAL", COUNT_ONCE, 2, KEY, `visitor:${caller}`]));
  } catch {
    return Response.json({}, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
