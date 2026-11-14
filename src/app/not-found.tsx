/**
 * The 404: a server-rendered page that reads fine on its own (staggered serif
 * numerals, a two-tone line, the way home), plus on desktop a figure holding
 * the brick-breaker game, which loads only when it scrolls into view.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { Game } from "@/components/game/game";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { notFound } from "@/content/sound";

/**
 * The numerals settle in one after another, each at its own slight tilt. Inline
 * rather than a CSS module: the App Router hoists a not-found module into the
 * root layout as a preload on every page, where it is never used.
 */
const DIGITS =
  ".nf-digit{display:inline-block;animation:nf-rise .52s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i)*65ms)}" +
  ".nf-digit>span{display:inline-block}.nf-digit:nth-child(1)>span{rotate:-9deg}.nf-digit:nth-child(2)>span{rotate:3deg}.nf-digit:nth-child(3)>span{rotate:8deg}" +
  "@keyframes nf-rise{from{opacity:0;translate:0 20px}}@media (prefers-reduced-motion:reduce){.nf-digit{animation:none}}";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  const { game, search } = notFound;
  return (
    <section aria-labelledby="not-found-title">
      <style>{DIGITS}</style>
      <div className="px-4 pt-10 pb-10">
        <p className="eyebrow" aria-hidden>
          {notFound.eyebrow}
        </p>
        <h1 id="not-found-title" className="mt-4">
          <span className="block font-serif text-[clamp(8rem,28vw,12.75rem)] leading-none tracking-tight">
            {[...notFound.code].map((digit, i) => (
              <span key={i} className="nf-digit" style={{ "--i": i } as React.CSSProperties}>
                <span>{digit}</span>
              </span>
            ))}
          </span>{" "}
          <span className="mt-3 block font-serif text-3xl/[1.1] tracking-[-0.01em] text-muted-foreground">{notFound.title}</span>
        </h1>
        <p className="mt-4 text-muted-foreground">{notFound.body}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button asChild>
            <Link href="/" prefetch={false}>
              {notFound.home}
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground pointer-coarse:hidden">
            {search.before} <Kbd>{search.key}</Kbd> {search.after}
          </span>
        </div>
      </div>

      <figure data-game className="hidden gutter:block">
        <div className="rule" aria-hidden />
        <div className="dot-grid aspect-[4/3]">
          <Game copy={game} />
        </div>
        <figcaption id="game-caption" className="screen-line-top flex items-baseline gap-3 px-4 py-3 text-sm text-muted-foreground">
          <span className="eyebrow shrink-0">{game.figure}</span>
          {game.caption}
        </figcaption>
      </figure>
      <noscript>
        <style>{"[data-game]{display:none!important}"}</style>
      </noscript>
    </section>
  );
}
