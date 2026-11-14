import { site } from "@/content/site";

/** A year of public contributions, one entry per day, oldest first. */
export type Contributions = {
  total: number;
  /** YYYY-MM-DD of the first day. */
  start: string;
  counts: number[];
  /** GitHub's own 0–4 intensity per day, one digit each. */
  levels: string;
};

// A free mirror of the public contribution calendar; needs no token.
const API = "https://github-contributions-api.jogruber.de/v4";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fetched while the page is built and again at most once a day. Returns null
 * when the data cannot be had at build time, so the section shows its fallback
 * link. During a daily refresh a failure throws instead: the framework then
 * keeps serving yesterday's page rather than replacing a good graph.
 */
export async function contributions(): Promise<Contributions | null> {
  try {
    const response = await fetch(`${API}/${site.handle}?y=last`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub contributions: HTTP ${response.status}`);
    return parse(await response.json());
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build" || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

/** The API is not ours: accept only the exact shape the graph draws. */
export function parse(data: unknown): Contributions {
  const days = (data as { contributions?: unknown }).contributions;
  if (!Array.isArray(days) || days.length < 7 || days.length > 400) throw new Error("GitHub contributions: bad shape");
  for (const day of days as Record<string, unknown>[]) {
    const valid =
      typeof day.date === "string" &&
      DAY.test(day.date) &&
      Number.isInteger(day.count) &&
      (day.count as number) >= 0 &&
      [0, 1, 2, 3, 4].includes(day.level as number);
    if (!valid) throw new Error("GitHub contributions: bad day");
  }
  const list = days as { date: string; count: number; level: number }[];
  // GitHub's own figure for the year when the API passes it on; otherwise the sum of the days.
  const stated = (data as { total?: { lastYear?: unknown } }).total?.lastYear;
  return {
    total: Number.isInteger(stated) ? (stated as number) : list.reduce((sum, day) => sum + day.count, 0),
    start: list[0]!.date,
    counts: list.map((day) => day.count),
    levels: list.map((day) => day.level).join(""),
  };
}
