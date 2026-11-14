/**
 * Owner copy and data used only by the home sections. Everything shared lives
 * in ./site; the same content rules apply here.
 */

/** Phrases of `site.tagline` that get the hand-drawn underline in the hero. */
export const taglineMarks: readonly string[] = ["AI products", "native tools"];

/**
 * "Before you hire me": the awkward questions, answered by the owner in his own
 * words. While the list is empty the block renders nothing.
 */
export type HireQuestion = { question: string; answer: string };
export const hireQuestions: HireQuestion[] = [];

/** From the owner's resume. Shown under education. */
export const achievements: readonly string[] = [
  "Finalist at multiple national-level hackathons.",
  "150+ data structures and algorithms problems solved on Codeforces and LeetCode, across arrays, trees, graphs and dynamic programming.",
];
