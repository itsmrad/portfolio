import { site, socials, xHandle } from "@/content/site";
import { buildInfo } from "@/lib/build";
import { counterStore } from "@/components/footer/counter-store";
import { FinaleToy, Signature, StatusStrip, VisitorCounter, Wordmark } from "@/components/footer/extras";
import { ExternalLink } from "@/components/layout/external-link";
import { Frame } from "@/components/layout/frame";
import { TitleBlock, TitleBlockField } from "@/components/layout/title-block";
import { SoundSwitch } from "@/components/sound/switch";

/**
 * Footer laid out as the title block of a drawing, with real provenance.
 * The revision is plain text: the site's repository is deliberately not
 * linked from the page. Hidden in print, where the page is a paper resume.
 */
export function Footer() {
  const build = buildInfo();
  const x = socials.find((social) => social.label === "X");

  return (
    <footer data-print="hide" className="overflow-x-clip px-(--frame-gutter) pb-[env(safe-area-inset-bottom,0)]">
      <Frame>
        <div className="rule" aria-hidden />
        <div className="hatch-band h-12" aria-hidden />
        <StatusStrip />

        <div className="screen-line-top screen-line-bottom flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="font-mono font-medium">{site.domain}</span>
          <span className="text-muted-foreground">
            {site.givenName}, {site.role.toLowerCase()}
          </span>
        </div>

        <TitleBlock>
          <TitleBlockField label="Drawn by">
            {x ? <ExternalLink href={x.href}>{xHandle}</ExternalLink> : site.name}
          </TitleBlockField>
          <TitleBlockField label="Rev">
            {build.shortSha || <span className="text-muted-foreground">unavailable</span>}
          </TitleBlockField>
          <TitleBlockField label="Date">
            <time dateTime={build.date}>{build.date}</time>
          </TitleBlockField>
          <TitleBlockField label="Sheet">1 / 1</TitleBlockField>

          <TitleBlockField label="License">{site.license}</TitleBlockField>
          <TitleBlockField label="Typeface">Geist, Instrument Serif</TitleBlockField>
          <TitleBlockField label="Deployed on">
            <span className="font-sans" aria-hidden>
              ▲
            </span>
            <span className="sr-only">Vercel</span>
          </TitleBlockField>
          <TitleBlockField label="For agents">
            {/* Stacked links: 24px tall each, so they meet the touch-target size. */}
            <ul className="-my-0.5 flex flex-col">
              {["llms.txt", "index.md"].map((file) => (
                <li key={file}>
                  <a className="link-underline inline-block py-0.5" href={`/${file}`}>
                    {file}
                  </a>
                </li>
              ))}
            </ul>
          </TitleBlockField>

          <TitleBlockField label="Stack" className="col-span-2">
            <ul className="flex flex-col gap-1">
              {build.stack.map(({ name, version }) => (
                <li key={name}>
                  {name}@{version}
                </li>
              ))}
            </ul>
          </TitleBlockField>
          {/* The header button's twin. Without JavaScript the whole cell goes (the switch's own
              noscript rule hides `data-sound-control`), leaving the block's hatch. It gives one
              column to the visitor counter once the store is connected. */}
          <TitleBlockField label="Sound" data-sound-control="" className={counterStore() ? undefined : "col-span-2"}>
            <SoundSwitch />
          </TitleBlockField>
          <VisitorCounter />
          <Signature />
        </TitleBlock>

        <div className="screen-line-top h-4" aria-hidden />

        <ul className="screen-line-top screen-line-bottom flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 font-mono text-sm text-muted-foreground">
          {socials.map((social) => (
            <li key={social.label}>
              <ExternalLink className="inline-block py-0.5" href={social.href} rel="noopener noreferrer me">
                {social.label}
              </ExternalLink>
            </li>
          ))}
          <li className="ml-auto">
            © <time dateTime={build.date.slice(0, 4)}>{build.date.slice(0, 4)}</time> {site.name}
          </li>
        </ul>
      </Frame>

      <Wordmark />
      <FinaleToy />
      <div className="h-16" aria-hidden />
    </footer>
  );
}
