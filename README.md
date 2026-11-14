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

**Connect the visitor counter.** In Vercel: Storage, Create Database, Upstash for Redis (free plan). Connect it to **Production only** and leave the variable prefix empty, so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set; nothing else is needed. Redeploy production; with that build the footer shows the total ("Visitors"), who is here right now ("just you right now", or "3 people here right now"), and, on the globe, where visitors have come from, where this visitor is ("you're here") and how far they are from you. Only production traffic counts (`VERCEL_ENV === "production"`): a visit once per address per day, a tab's presence by a heartbeat every minute while it is visible (for at most 30 minutes). To leave your own browser out of the total, run `localStorage.setItem("visit-counted", "1")` in its console on the live site. With no variables the cell is not rendered, the globe shows only your pin, and the write routes answer 404.

*What the map keeps.* Location comes only from Vercel's request headers (`x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-country`), is rounded to a whole degree (about 110 km) and is stored only as a count per cell. No IP address, no per-visitor record, no cookie and no third-party request: the "visitor once a day" mark is a hash of the address with the store's secret that expires after a day, the tab id is random and lives in the tab, and the visitor's own dot and distance are computed for that one request and never stored. The line under the globe says so to visitors.

*Cost.* Built for the free plan (500K commands a month): about 12 store commands per visitor, shared numbers served from the CDN cache (at most one store read per five minutes per cache region, however busy), and a daily ceiling of 1,000 writes after which nothing more is written until the next UTC day. Details in `src/components/footer/visits.ts`.

*Local runs.* Copy `.env.example` to `.env.local`. With the two KV variables set, a local run reads the real store (the footer shows production's numbers and map) but never writes to it: every write is production-only. Without them the footer looks as it does with the store absent. `node tests/stand-in-server.ts 3399 many` serves a seeded stand-in store for screenshots; point `KV_REST_API_URL` at `http://127.0.0.1:3399`.

**Search and assistants.** To verify the site with a meta tag instead of DNS, paste the token into `site.googleVerification` or `site.bingVerification` in `src/content/site.ts` (or set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` in Vercel); nothing renders while they are empty. When the page's facts change, edit them in `src/content/site.ts` and `src/content/faq.ts` and bump `site.updated`: it is the sitemap's `lastmod`, the structured data's `dateModified` and the visible "Updated" line. IndexNow pings Bing and the other IndexNow engines after every production deploy (`.github/workflows/indexnow.yml`, key in `public/<key>.txt`); to ping by hand run `node scripts/indexnow.mjs`.

No other environment variables are needed; `.env.example` lists every one the site reads.

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
