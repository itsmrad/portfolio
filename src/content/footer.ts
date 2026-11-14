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
  /** The live line under the total. With a handful of visitors a month it is nearly always the first. */
  liveAlone: "just you right now",
  liveMany: "people here right now",
  /** The visitor map on the globe: labels, and the caption under it. */
  mapYou: "you're here",
  mapAnupam: "Anupam's here",
  mapBoth: "you're both here",
  mapNote: "dots: where visitors came from, to about 100 km · nothing personal kept",
  /** {n} and {unit} are filled in; units are "km" or "miles" by the visitor's country. */
  distance: "you're about {n} {unit} from Anupam",
  distanceUnits: { km: "km", mi: "miles" },
  distanceSame: "you're in Anupam's city",
  /** The globe: its text alternative (filled in as the map arrives), the drag hint and the reset. */
  globe: {
    label: "Globe on the Earth's 23.4° axis, with Anupam's pin on New Delhi",
    visitors: "{total} visitors so far from {places} places, {live} on the site now",
    keys: "Drag or use the arrow keys to turn it; Home turns it back",
    role: "interactive globe",
    hint: "DRAG TO TURN",
    reset: "reset view",
  },
} as const;
