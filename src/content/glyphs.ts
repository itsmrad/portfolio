/**
 * The banner's tech glyphs (round 4, R23): what a press shows. Each glyph has a
 * colour from the arcade palette (or the accent), a note (0 to 8, the name
 * melody's scale, so a run of presses plays something) and jokes that rotate
 * without an immediate repeat.
 *
 * Jokes: one line, under about 60 characters, lower case, in the margin's
 * annotation voice; about the tools and the shared pain of using them. Nothing
 * about people, employers, clients or anyone's staff; no profanity; nothing a
 * recruiter would wince at. Edit freely; tests/hero-glyphs.spec.ts checks the
 * length and case. The drawings and placements live in scripts/hero-glyphs.mjs.
 */
export type GlyphId =
  | "rust"
  | "ts"
  | "js"
  | "python"
  | "react"
  | "next"
  | "node"
  | "docker"
  | "git"
  | "github"
  | "ai"
  | "term"
  | "db"
  | "tailwind";

type Hue = "accent" | "amber" | "green" | "teal" | "blue" | "violet";

export const glyphs: Record<GlyphId, { name: string; hue: Hue; note: number; jokes: string[] }> = {
  rust: {
    name: "Rust",
    hue: "accent",
    note: 0,
    jokes: [
      "the borrow checker won again. it usually does.",
      "compiled on the first try. checking for cosmic rays.",
      "rewrote it in rust. it was a to-do list.",
      "lifetimes: annotate until the red goes away",
      "a clean build, and only forty minutes",
    ],
  },
  ts: {
    name: "TypeScript",
    hue: "blue",
    note: 2,
    jokes: [
      "any is a type. technically.",
      "as unknown as the thing i wanted",
      "the types pass. the app does not.",
      "strict mode on. confidence off.",
      "@ts-expect-error, since march",
    ],
  },
  js: {
    name: "JavaScript",
    hue: "amber",
    note: 4,
    jokes: [
      "undefined is not a function, again",
      "typeof null is still 'object'",
      "three ways to loop, four to be wrong",
      "it worked in the console, i promise",
    ],
  },
  python: {
    name: "Python",
    hue: "teal",
    note: 5,
    jokes: [
      "pip install worked. which python, though?",
      "a virtualenv inside a virtualenv",
      "requirements.txt, last updated never",
      "the notebook ran fine, out of order",
    ],
  },
  react: {
    name: "React",
    hue: "teal",
    note: 7,
    jokes: [
      "useEffect ran twice. it was meant to.",
      "the dependency array is a suggestion",
      "lifting state up until it hits the ceiling",
      "re-rendered forty times. looks the same.",
    ],
  },
  next: {
    name: "Next.js",
    hue: "violet",
    note: 8,
    jokes: [
      "use client, use server, use caution",
      "hydration error: the server had other plans",
      "cached so well the fix never shipped",
      "works in dev. the build has opinions.",
    ],
  },
  node: {
    name: "Node.js",
    hue: "green",
    note: 3,
    jokes: [
      "node_modules weighs more than the app",
      "works on node 22. you have 18.",
      "a missing await, somewhere. good luck.",
      "npm install, then a short walk",
    ],
  },
  docker: {
    name: "Docker",
    hue: "blue",
    note: 1,
    jokes: [
      "works in my container",
      "the image is two gigabytes. it's a cli.",
      "docker compose up. the fans agree.",
      "rebuilding every layer for one comma",
    ],
  },
  git: {
    name: "git",
    hue: "accent",
    note: 6,
    jokes: [
      "force-pushed. it felt right at the time.",
      "a merge conflict in a file nobody touched",
      "commit message: fix. next one: fix again.",
      "rebased onto main. main moved.",
    ],
  },
  github: {
    name: "GitHub",
    hue: "violet",
    note: 2,
    jokes: [
      "github is down. focus is up.",
      "ci went green on the third re-run",
      "the action failed: runner out of disk",
      "lgtm, after a thorough scroll",
    ],
  },
  ai: {
    name: "AI",
    hue: "accent",
    note: 5,
    jokes: [
      "the model agrees with whatever you say",
      "it apologised, then did it again",
      "confidently wrong, beautifully formatted",
      "you're absolutely right. it wasn't.",
    ],
  },
  term: {
    name: "terminal",
    hue: "green",
    note: 0,
    jokes: [
      "ctrl+r through six months of mistakes",
      "it's in the shell history. somewhere.",
      "a script that only runs from one folder",
      "sudo !!, and a deep breath",
    ],
  },
  db: {
    name: "database",
    hue: "amber",
    note: 4,
    jokes: [
      "a migration on a friday. bold.",
      "the index was there. on staging.",
      "n+1 queries and one very warm database",
      "a where clause, added just in time",
    ],
  },
  tailwind: {
    name: "Tailwind",
    hue: "teal",
    note: 8,
    jokes: [
      "the class list is longer than the component",
      "flex items-center justify-center, again",
      "a custom colour called gray-450",
      "w-full h-full, still not centred",
    ],
  },
};
