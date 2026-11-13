/**
 * Copy for the footer extras (status strip, visitor counter, signature).
 * Owner facts (name, location, availability, projects) stay in site.ts.
 */
export const footer = {
  /** Screen-reader labels for the status strip's facts, in order. */
  statusLabels: { location: "Location", time: "Local time", work: "Latest work", availability: "Availability" },
  /** Short form of `site.availability` for the one-line strip. */
  availabilityShort: "Open to work",
  /** Prefix for the latest public GitHub activity, e.g. "Building larpcc". */
  buildingPrefix: "Building",
  /** The clock: the zone shown beside the time, and the text before the clock starts (or without JavaScript). */
  zone: "IST",
  zoneFallback: "IST · UTC+05:30",
  /** The clock's note on the visitor's own time zone. */
  timeAhead: "ahead of you",
  timeBehind: "behind you",
  signAgain: "Sign again",
  visitorsUnit: "visitors so far",
} as const;
