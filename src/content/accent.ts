/**
 * What the accent marks, by exact text (see "Highlights" in globals.css). Keep it
 * short: at most one or two marks per screenful, or emphasis stops meaning anything.
 * A phrase that no longer appears in its text simply stops being marked.
 */

/** Per featured project: the phrase of the tagline that says what it is, and the stat cells in accent numerals. */
export const projectAccents: Record<string, { phrase: string; metrics: string[] }> = {
  codenaya: {
    phrase: "Codenaya writes it, runs it in your browser and hands you the code",
    metrics: ["Merged pull requests", "Projects built"],
  },
  xflow: {
    phrase: "xflow types what you said into whatever app you are using",
    metrics: ["Idle memory", "Stop to text, p50"],
  },
};

/** The strongest outcome numbers in the experience entries. */
export const experienceAccents: readonly string[] = [
  "a user base of 100+",
  "query response time by 40%",
  "2,000+ registrations nationwide",
];
