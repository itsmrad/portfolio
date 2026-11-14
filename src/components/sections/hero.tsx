/**
 * The hero: the pressable isometric monogram, the framed portrait beside the
 * name (the page's only <h1>) with a rotating tagline, the claim, the actions
 * and a grid of facts with the live local time.
 *
 * Contract kept from the slot: id="top", the single <h1>, the <ResumeDownload />
 * call and the <HeroStickers /> box exactly as mounted at the end. The strip
 * to the left of the monogram and the margins are left free for stickers.
 */
import { taglineMarks } from "@/content/home";
import { experience, site } from "@/content/site";
import { Dimension, DimensionExtension, DimensionLine } from "@/components/layout/dimension";
import { ResumeDownload } from "@/components/layout/resume-download";
import { Section } from "@/components/layout/section";
import { HeroStickers } from "@/components/playful/hero-stickers";
import { SingButton, SingName } from "@/components/sound/sing-name";
import { buttonVariants } from "@/components/ui/button";
import { Img } from "@/components/ui/img";
import { Kbd } from "@/components/ui/kbd";

import { BookCall } from "./book-call";
import { CopyButton } from "./copy-button";
import { Effects } from "./effects-loader";
import { Monogram } from "./hero-monogram";
import { paintTime } from "./hero-time";
import { BriefcaseIcon, ClockIcon, MailIcon, PinIcon } from "./icons";
import styles from "./hero.module.css";

const PORTRAIT = 96;

/** "GMT+5:30": what the local-time fact says where no script runs. */
const zoneOffset = new Intl.DateTimeFormat("en-US", { timeZone: site.location.timeZone, timeZoneName: "shortOffset" })
  .formatToParts(new Date())
  .find((part) => part.type === "timeZoneName")!.value;

/**
 * The rotation, as one inline rule. Each line is shown for 3s; it blurs in
 * from above over 0.35s and out below over 0.2s. The keyframes depend on how
 * many lines there are, so they cannot live in the stylesheet, and the rule
 * that names them has to sit beside them: a CSS module would rename one and
 * not the other.
 */
function taglineRotation(count: number) {
  const percent = (seconds: number) => `${((seconds / (count * 3)) * 100).toFixed(2)}%`;
  const away = (y: string) => `{opacity:0;transform:translateY(${y});filter:blur(2px)}`;
  return (
    `@keyframes hero-tagline{0%${away("-.25em")}${percent(0.35)},${percent(3)}{opacity:1;transform:none;filter:none}${percent(3.2)},to${away(".25em")}}` +
    `@media (prefers-reduced-motion:no-preference){.${styles.taglines} li{animation:hero-tagline ${count * 3}s calc(var(--index)*3s) infinite backwards}}`
  );
}

/** The claim, with the marked phrases wrapped for the hand-drawn underline. */
function Claim() {
  const parts = site.tagline.split(new RegExp(`(${taglineMarks.join("|")})`));
  return parts.map((part, index) =>
    index % 2 ? (
      <span key={part} className={styles.underlined} style={{ "--index": (index - 1) / 2 } as React.CSSProperties}>
        {part}
        <svg viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden>
          <path d="M0 3C20 1 180 5 200 3" pathLength={1} />
        </svg>
      </span>
    ) : (
      part
    ),
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex min-h-6 items-center gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-muted-foreground/15 bg-muted text-muted-foreground [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

export function Hero() {
  const current = experience.find((job) => job.kind === "work" && !job.end);
  // The first tagline is the role, which the first fact row states just below: the rotation leaves it out.
  const taglines = site.taglines.slice(1);
  return (
    <Section id="top" rule={false} aria-labelledby="top-title">
      <div className={styles.cover}>
        <div className={styles.mark}>
          <Monogram label={`${site.initials} monogram. Press it.`} />
        </div>

        <div className={styles.identity}>
          <div className={styles.portrait}>
            <div className={styles.frame}>
              <div className={styles.paper}>
                <Img
                  src={site.avatar.src}
                  alt={site.avatar.alt}
                  width={PORTRAIT}
                  height={PORTRAIT}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
            <Dimension className="absolute inset-y-0 right-full hidden w-12 gutter:block">
              <DimensionExtension orientation="horizontal" className="inset-x-1 top-0" />
              <DimensionExtension orientation="horizontal" className="inset-x-1 bottom-0" />
              <DimensionLine orientation="vertical" className="absolute inset-y-0 left-1/2 -translate-x-1/2">
                {PORTRAIT}
              </DimensionLine>
            </Dimension>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)]">
            {/* The letters are separate elements for the name melody; the label keeps the name whole. */}
            <h1
              id="top-title"
              aria-label={site.name}
              className="screen-line-top px-4 pt-2 pb-1.5 font-serif text-[clamp(1.625rem,7.5vw,2.5rem)]/none tracking-[-0.015em]"
            >
              <SingName>{site.name}</SingName>
            </h1>
            <ul
              className={`${styles.taglines} screen-line-top col-span-2 h-9 items-center px-4 font-mono text-[0.8125rem] text-muted-foreground sm:text-sm`}
            >
              {taglines.map((line, index) => (
                <li key={line} style={{ "--index": index } as React.CSSProperties}>
                  {line}
                </li>
              ))}
            </ul>
            <style>{taglineRotation(taglines.length)}</style>
            {/* After the taglines in the source, right after the name on the page. */}
            <SingButton className="col-start-2 row-start-1 -ml-2 self-center justify-self-start" />
          </div>
        </div>
      </div>

      <div className="screen-line-top px-4 pt-4 pb-5">
        {/* Below 640px both lines are narrow enough to wrap the same way in the web font and in its
            fallback, so a late font never changes their height. */}
        <p className="max-w-80 text-lg text-balance sm:max-w-none">
          <Claim />
        </p>
        <p className="mt-2 flex max-w-72 gap-2 text-sm text-balance text-muted-foreground sm:max-w-none">
          <span aria-hidden className={`${styles.live} mt-1.5`} />
          {site.availability}.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 *:mt-4" data-print="hide">
          <ResumeDownload />
          <BookCall href={site.calUrl} />
          {/* Opened by the command palette's own listener, which also knows the platform. No keyboard, no button. */}
          <button
            type="button"
            data-slot="button"
            data-js=""
            data-command-open
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            className={`${buttonVariants({ variant: "ghost" })} gap-1 first:-ml-3 not-pointer-fine:hidden`}
          >
            Press
            <Kbd className={styles.modifier}>
              <span>Ctrl</span>
              <span>⌘</span>
            </Kbd>
            <Kbd>K</Kbd>
            to start
            <span aria-hidden className="font-mono">
              →
            </span>
          </button>
        </div>
      </div>

      <ul className={`${styles.facts} screen-line-top relative grid gap-x-8 gap-y-2.5 p-4 font-mono text-sm sm:grid-cols-2`}>
        {current && (
          <Fact icon={<BriefcaseIcon />} label="Role">
            {current.role} at {current.org}
          </Fact>
        )}
        <Fact icon={<ClockIcon />} label="Local time">
          {/* From the server, the zone's offset; the script puts the time there before first paint and ./effects keeps it. */}
          <span data-clock={site.location.timeZone}>
            <span suppressHydrationWarning>{zoneOffset}</span>
            <span suppressHydrationWarning className="text-muted-foreground">
              {" "}
            </span>
          </span>
          <script
            dangerouslySetInnerHTML={{
              __html: `(${paintTime})(document.currentScript.previousElementSibling,${JSON.stringify(site.location.timeZone)})`,
            }}
          />
        </Fact>
        <Fact icon={<PinIcon />} label="Location">
          {site.location.label}
        </Fact>
        {site.email && (
          <Fact icon={<MailIcon />} label="Email">
            <CopyButton value={site.email} title="Copy the address" className="link-underline cursor-copy">
              {site.email}
            </CopyButton>
          </Fact>
        )}
      </ul>

      <Effects />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <HeroStickers />
      </div>
    </Section>
  );
}
