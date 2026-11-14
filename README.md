# anupamdas.me

The portfolio of Anupam Das: one static page drawn like a technical sheet, with a command palette, single-key shortcuts, code-generated sounds, a playable 404 and a few easter eggs.

**Stack:** Next.js 16 (static output on Vercel), React 19, Tailwind CSS 4, TypeScript. No animation or UI framework: native `<dialog>` and popover, Web Audio for sound, CSS for motion. One dynamic route, `/api/visit`, for the visitor counter.

## Develop

```sh
npm ci
npm run dev
```

All copy and data live in `src/content/`: `site.ts` for identity, experience, projects and stack, and one file per feature beside it (`home.ts`, `command.ts`, `sound.ts`, `playful.ts`, `footer.ts`). No copy is written inside a component. The content rules are at the top of `site.ts` and `tests/seo.spec.ts` enforces them (no phone number anywhere, only the owner's email, no audience claims).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build / serve it |
| `npm run lint`, `npm run typecheck` | ESLint, TypeScript |
| `npm test` | Playwright against the production build (build first) |
| `npm run lighthouse` | Lighthouse gate, mobile, median of three; add `-- --strict-timing` to fail on LCP and blocking time too (use an idle machine) |
| `npm run check` | all of the above in order |
| `npm run fonts`, `npm run icons` | re-subset the fonts, re-render the icons |

The browser gates use the Chromium Playwright resolves (`PLAYWRIGHT_BROWSERS_PATH`, or `npx playwright install chromium` once). They serve the build on `GATE_PORT` and the two ports after it (default 3210).

The limits in `tests/budget.spec.ts` and `scripts/lighthouse.mjs` are hard gates: first-load JavaScript, HTML size and element count (the page is close to its 1400-element limit), fonts, images, layout shift with late fonts, Lighthouse scores. Fix the code, not the number.

## Owner tasks

**Swap the resume.** Replace `public/Anupam-Das-Resume.pdf` with the new file under the same name (or change `site.resume` in `src/content/site.ts`). Every download button, the `r` key, the palette row, `llms.txt` and `index.md` follow. The PDF is served as is: check it before publishing.

**Add a project clip.** Each project in `src/content/site.ts` has an `OWNER CLIP SLOT` comment. Put the WebM in `public/clips/`, a poster still in `src/assets/projects/`, import the poster at the top of `site.ts` and set `clip: { src: "/clips/<name>.webm", poster: <import>, caption: "<one line>" }`. It renders under "The product" and plays only on request.

**Connect the visitor counter.** In Vercel: Storage, Create Database, Upstash for Redis (free plan). Connect it to **Production only** and leave the variable prefix empty, so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set. Redeploy production; the "Visitors" cell appears with that build. Only production traffic counts (`VERCEL_ENV === "production"`), once per address per day. To leave your own browser out, run `localStorage.setItem("visit-counted", "1")` in its console on the live site. With no variables the cell is not rendered and `/api/visit` answers 404.

**Search and assistants.** To verify the site with a meta tag instead of DNS, paste the token into `site.googleVerification` or `site.bingVerification` in `src/content/site.ts` (or set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` in Vercel); nothing renders while they are empty. When the page's facts change, edit them in `src/content/site.ts` and `src/content/faq.ts` and bump `site.updated`: it is the sitemap's `lastmod`, the structured data's `dateModified` and the visible "Updated" line. IndexNow pings Bing and the other IndexNow engines after every production deploy (`.github/workflows/indexnow.yml`, key in `public/<key>.txt`); to ping by hand run `node scripts/indexnow.mjs`.

No other environment variables are needed.

## Layout

```
src/content/            all copy and data
src/app/                the page, the 404, metadata routes, llms.txt, index.md, /api/visit, globals.css (tokens)
src/components/layout/  the frame: header, footer, sections, rules, dimension lines
src/components/ui/      button, key cap, image, icons, dialog
src/components/…        one folder per feature: sections, projects, command, theme, sound, game, playful, footer
src/lib/                seo, markdown, theme, fonts, sound facade and engine, haptics
tests/                  Playwright specs, one per area
scripts/                Lighthouse gate, font subsetting, icon rendering
```

## License

MIT. Fonts in `src/assets` and `src/components/playful/fonts` are under the SIL Open Font License; their licences sit beside them.
