# anupamdas.me

The portfolio of Anupam Das: one static page, built with Next.js 16, React 19 and Tailwind CSS 4.

## Develop

```sh
npm install
npm run dev
```

All copy and data live in `src/content/`: `site.ts` for identity, experience and projects, and one file per feature beside it. No copy is written inside a component.

## Check

```sh
npm run check   # lint, typecheck, build, Playwright tests, Lighthouse
```

Each gate also runs alone: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run lighthouse`.
The tests and Lighthouse run against the production build, so build first.
They use the Chromium that Playwright resolves; point `PLAYWRIGHT_BROWSERS_PATH` at an existing install, or run `npx playwright install chromium` once.
The gates serve the build on `GATE_PORT` and the two ports after it (default 3210); set a different one per checkout to run them side by side.
Lighthouse timings fail the gate only with `npm run lighthouse -- --strict-timing`, for a final run on an idle machine.

## Layout

```
src/content/            all owner copy and data
src/app/                the page, the 404, metadata routes, llms.txt, index.md, globals.css (design tokens)
src/components/layout/  the frame: header, footer, sections, rules, dimension lines
src/components/ui/      button, key cap, image, icons
src/components/…        one folder per feature area
src/lib/                seo, markdown, theme, fonts, sound
src/assets/             avatar, subsetted fonts, share-image fonts
tests/                  Playwright: smoke, seo, budget
scripts/                lighthouse gate, font subsetting, icon rendering
```

## Budgets

The limits in `tests/budget.spec.ts` and `scripts/lighthouse.mjs` are hard gates: first-load JavaScript (with a share per feature), HTML size and element count, font and image weight, layout shift with late fonts, and the Lighthouse scores. Fix the code, not the number.

## License

MIT. Fonts in `src/assets` are under the SIL Open Font License; their licences sit beside them.
