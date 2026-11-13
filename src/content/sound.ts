/**
 * Copy for the sound controls and the 404 page (sound + 404 branch).
 * Follows the content rules in site.ts. The 404 lines are not owner-approved yet.
 */
export const soundCopy = {
  singName: "Play my name as a tune",
} as const;

/** The 404 page and its brick-breaker figure. */
export const notFound = {
  eyebrow: "ERR / 404",
  code: "404",
  title: "Not in the drawing set.",
  body: "The address may be mistyped, or the page may have moved.",
  home: "Back to the home page",
  search: { before: "or press", key: "/", after: "to search" },
  game: {
    figure: "FIG. 404",
    caption: "Break the monogram. Click or press Space to launch, move with the mouse or the arrow keys.",
    label: "Brick breaker game",
    start: "CLICK OR PRESS SPACE",
    paused: "PAUSED",
    cleared: "404",
    over: "BALL LOST",
  },
} as const;
