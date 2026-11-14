/**
 * Copy for the margins and the playful layer. Decoration for wide screens and
 * for people who poke around: the page never depends on any of it.
 *
 * Rules (the same as content/site.ts): only owner-verified facts.
 * - `notes` are handwriting beside the element with id `at`. Each must be
 *   literally true against content/site.ts and the owner's resume, word for
 *   word: check every one again whenever that content changes. The handwriting font holds only a-z and
 *   . , ' - ! ? (no capitals, no digits), so write them that way.
 * - Sticker and egg labels are the only words those pieces show.
 */
export const playful = {
  notes: [
    { at: "top", side: "left", text: "go on,\npress things" },
    { at: "about", side: "right", text: "final year\nat bpit" },
    { at: "experience", side: "left", text: "plancover,\nsince september" },
    { at: "codenaya", side: "right", text: "a hundred-plus\nprojects built on it" },
    { at: "xflow", side: "left", text: "benchmarks are\nin the repo" },
    { at: "stack", side: "right", text: "xflow and larpcc\nare the rust ones" },
    { at: "contact", side: "left", text: "open to roles,\nfull-time or freelance" },
  ],
  /**
   * The working notes below the hero (components/playful/life.tsx), loaded once
   * the visitor scrolls towards Experience. Each sits beside the element inside
   * section `in` whose text contains `text` (or the section itself), `dy` px
   * lower. Same truth rule as `notes`: every word and number must match the
   * content beside it; if that text changes, the item disappears rather than lie.
   * Kinds: `note` handwriting with an arrow; `ratio` a mono reading over a
   * scale; `balloons` numbered callouts, one per item of the list holding
   * `text`; `toy` a small press-toy with a voice.
   */
  life: [
    { kind: "note", side: "left", in: "about", text: "is my own product", dy: -46, note: "codenaya and xflow,\nboth further down" },
    { kind: "note", side: "left", in: "experience", text: "SheBuilds Hackathon", dy: -40, note: "two thousand plus\nsigned up" },
    { kind: "note", side: "left", in: "codenaya", dy: 40, note: "his own browser ide,\nlive since february" },
    { kind: "ratio", side: "left", in: "codenaya", text: "777 of its 801", value: 777, of: 801, label: "commits are his" },
    { kind: "note", side: "right", in: "codenaya", text: "Counts from the public", dy: 0, note: "counted from the\npublic repo" },
    { kind: "toy", toy: "dial", side: "left", in: "codenaya", text: "Unlimited", dy: 0, caption: "turn", items: ["openrouter", "openai", "anthropic", "groq"] },
    { kind: "balloons", side: "right", in: "codenaya", text: "An agent with 15 tools" },
    { kind: "note", side: "left", in: "codenaya", text: "Three AI features", dy: -10, note: "ghost text, cmd-k\nand a tooltip" },
    { kind: "note", side: "right", in: "codenaya", text: "Agent runs that outlive", dy: -20, note: "a deploy resumes\nthe run" },
    { kind: "toy", toy: "lock", side: "right", in: "codenaya", text: "Keys that never touch", dy: 30, caption: "aes-256-gcm" },
    { kind: "toy", toy: "terminal", side: "left", in: "codenaya", text: "A build check before", dy: 20, caption: "$ finish", items: ["checking…", "tsc ✓  vite build ✓"] },
    { kind: "note", side: "left", in: "codenaya", text: "Stack by layer", dy: -10, note: "five layers,\ntop to bottom" },
    { kind: "note", side: "right", in: "codenaya", text: "Data and auth", dy: -30, note: "convex and clerk\nhold the data" },
    { kind: "ratio", side: "left", in: "xflow", text: "all 494 commits", value: 494, of: 494, label: "commits are his" },
    { kind: "note", side: "right", in: "xflow", text: "Stop to text, p50", dy: -84, note: "can you beat it?" },
    { kind: "toy", toy: "hold", side: "left", in: "xflow", text: "Hands-free", dy: 10, caption: "hold", items: ["listening…", "pasted at the cursor"] },
    { kind: "note", side: "left", in: "xflow", text: "Memory footprint", dy: -10, note: "every number here\nhas a source file" },
    { kind: "note", side: "right", in: "xflow", text: "Fig. 2", dy: 60, note: "paste is not\ncounted in it" },
    { kind: "balloons", side: "left", in: "xflow", text: "Ten cloud speech providers" },
    { kind: "note", side: "right", in: "xflow", text: "Ten cloud speech providers", dy: -20, note: "ten clouds, or\nyour own machine" },
    { kind: "note", side: "right", in: "xflow", text: "Twenty-minute dictations", dy: -10, note: "twenty minutes,\nno waiting" },
    { kind: "note", side: "left", in: "xflow", text: "Paste into whatever", dy: -10, note: "lands wherever\nyour cursor is" },
    { kind: "note", side: "right", in: "xflow", text: "Daemon and CLI", dy: -40, note: "the daemon is rust" },
    { kind: "note", side: "left", in: "activity", dy: 90, note: "every square\nis one day" },
    { kind: "note", side: "left", in: "stack", text: "AI/LLM", dy: -20, note: "the day job,\nrag and tools" },
    { kind: "note", side: "left", in: "faq", text: "Who is Anupam Das?", dy: -40, note: "nine questions,\nshort answers" },
    { kind: "note", side: "right", in: "faq", text: "How can I contact", dy: -40, note: "ask him the rest,\nit's just below" },
    { kind: "toy", toy: "term", side: "left", in: "education", dy: 70, caption: "final year", items: ["aug 2023", "aug 2027"] },
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
