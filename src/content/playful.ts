/**
 * Copy for the margins and the playful layer. Decoration for wide screens and
 * for people who poke around: the page never depends on any of it.
 *
 * Rules (the same as content/site.ts): only owner-verified facts.
 * - `notes` are handwriting beside the element with id `at`. Each repeats a
 *   fact the page already states. The handwriting font holds only a-z and
 *   . , ' - ! ? (no capitals, no digits), so write them that way.
 * - Sticker and egg labels are the only words those pieces show.
 */
export const playful = {
  notes: [
    { at: "top", side: "left", text: "go on,\npress things" },
    { at: "about", side: "right", text: "final year\nat bpit" },
    { at: "experience", side: "left", text: "plancover,\nsince september" },
    { at: "codenaya", side: "right", text: "over a hundred\nprojects built on it" },
    { at: "xflow", side: "left", text: "benchmarks are\nin the repo" },
    { at: "stack", side: "right", text: "all of it in use\nin the work above" },
    { at: "contact", side: "left", text: "open to roles.\nsay hi" },
  ],
  /** The cat asleep beside "currently building"; clicking it wakes the cursor companion. */
  cat: "asleep on the job.\nclick to wake",
  /** Mono readout at the foot of the margin, followed by m:ss. */
  timer: "here for",
  stickers: {
    /** The command typed in the terminal sticker. */
    terminal: "xflow",
    key: "esc",
    stamp: { centre: "OPEN", ring: "FULL-TIME · INTERNSHIPS · FREELANCE · " },
  },
  eggs: {
    /** Tab title while the visitor is on another tab. */
    away: "Come back, the ink is still wet",
    hotReload: "Performing hot reload...",
    explodedOn: "Exploded view. Press Esc to reassemble.",
    explodedOff: "Reassembled.",
    menu: { label: "Brand mark", copy: "Copy mark as SVG", copied: "Mark copied as SVG", failed: "Could not copy" },
  },
} as const;
