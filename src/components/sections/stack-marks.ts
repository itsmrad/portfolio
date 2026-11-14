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
  JavaScript: [2, "#f7df1e"],
  Python: [3, "#3776ab"],
  "C/C++": [4, "#00599c"],
  HTML: [5, "#e34f26"],
  CSS: [6, "#663399"],
  "Node.js": [7, "#5fa04e"],
  "Express.js": [8],
  FastAPI: [9, "#009688"],
  JWT: [10],
  "React.js": [11, "#61dafb"],
  "Next.js": [12],
  "Tailwind CSS": [13, "#06b6d4"],
  "Material-UI": [14, "#007fff"],
  "shadcn/ui": [15],
  PostgreSQL: [16, "#4169e1"],
  MongoDB: [17, "#47a248"],
  LangChain: [18],
  LangGraph: [19],
  OpenRouter: [20, "#94a3b8"],
  "Vercel AI SDK": [21],
  Docker: [22, "#2496ed"],
  Git: [23, "#f03c2d"],
  GitHub: [24],
  Sentry: [25, "#6c5fc7"],
  Postman: [26, "#ff6c37"],
  Figma: [27, "#f24e1e"],
  Zod: [28, "#408aff"],
  Jest: [29, "#c21325"],
  "TanStack Query": [30, "#ff4154"],
  "Better Auth": [31],
  "Passport.js": [32, "#34e27a"],
};
