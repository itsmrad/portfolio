# anupamdas.me

The portfolio of Anupam Das: one static page, built with Next.js 16, React 19 and Tailwind CSS 4.

## Develop

```sh
npm install
npm run dev
```

All copy and data live in `src/content/site.ts`. Editing the site's words never needs another file.

## Check

```sh
npm run check   # lint, typecheck, build, Playwright tests, Lighthouse
```

Each gate also runs alone: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run lighthouse`.
The tests and Lighthouse run against the production build, so build first.
They use the Chromium that Playwright resolves; point `PLAYWRIGHT_BROWSERS_PATH` at an existing install, or run `npx playwright install chromium` once.

## Layout

```
src/content/site.ts     all owner copy and data
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

The limits in `tests/budget.spec.ts` and `scripts/lighthouse.mjs` are hard gates: first-load JavaScript, HTML size, font and image weight, layout shift and the Lighthouse scores. Fix the code, not the number.

## License

MIT. Fonts in `src/assets` are under the SIL Open Font License; their licences sit beside them.
