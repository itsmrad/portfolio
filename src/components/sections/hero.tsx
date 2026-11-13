/**
 * SLOT (home branch). Stub: real content, minimal styling. Replace the inside
 * with the final hero (pressable isometric AD monogram, notched portrait,
 * rotating tagline, meta grid). Keep: id="top", the single <h1>, the
 * <ResumeDownload /> call and the <HeroStickers /> box exactly as mounted here.
 */
import { site } from "@/content/site";
import { ResumeDownload } from "@/components/layout/resume-download";
import { Section } from "@/components/layout/section";
import { HeroStickers } from "@/components/playful/hero-stickers";
import { Img } from "@/components/ui/img";

export function Hero() {
  return (
    <Section id="top" rule={false} aria-labelledby="top-title">
      <div className="flex items-center gap-4 px-4 pt-8 pb-6">
        <Img
          src={site.avatar.src}
          alt={site.avatar.alt}
          width={96}
          height={96}
          loading="eager"
          className="size-24 shrink-0 rounded-md border border-line object-cover"
        />
        <div className="min-w-0">
          <h1 id="top-title" className="font-serif text-[clamp(1.625rem,7.5vw,2.5rem)]/none tracking-[-0.015em]">
            {site.name}
          </h1>
          <p className="mt-2 font-mono text-[0.8125rem]/5 text-muted-foreground">
            {site.role} · {site.location.label}
          </p>
        </div>
      </div>
      <div className="screen-line-top px-4 py-4">
        <p className="text-lg text-balance">{site.tagline}</p>
        <p className="mt-1 text-sm text-muted-foreground">{site.availability}.</p>
        <ResumeDownload className="mt-4" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <HeroStickers />
      </div>
    </Section>
  );
}
