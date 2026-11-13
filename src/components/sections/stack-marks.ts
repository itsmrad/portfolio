/**
 * Logo marks for the stack pills: the slot of each mark in stack-marks.svg
 * (one strip of 24px cells, used as a CSS mask so a single grey shape can take
 * any colour) and the brand's colour, shown on hover. A brand whose colour is
 * black has none here and takes the text colour, so it survives the dark theme.
 * A name with no entry is shown without a mark.
 */
export const MARKS: Record<string, readonly [slot: number, colour?: string]> = {
  Rust: [0],
  TypeScript: [1, "#3178c6"],
  Python: [2, "#3776ab"],
  React: [3, "#61dafb"],
  "Next.js": [4],
  "Tailwind CSS": [5, "#06b6d4"],
  CodeMirror: [6, "#d30707"],
  PostgreSQL: [7, "#4169e1"],
  SQLite: [8, "#0f80cc"],
  "GitHub Actions": [9, "#2088ff"],
  Playwright: [10, "#2ead33"],
  Vitest: [11, "#6e9f18"],
  Nix: [12, "#5277c3"],
  Sentry: [13, "#6c5fc7"],
};
