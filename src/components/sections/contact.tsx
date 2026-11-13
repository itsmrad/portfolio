/**
 * SLOT (home branch). Stub: real links, minimal styling. Keep id="contact".
 * The email line appears only once `site.email` is set; never add a phone.
 */
import { site, socials } from "@/content/site";
import { ExternalLink } from "@/components/layout/external-link";
import { ResumeDownload } from "@/components/layout/resume-download";
import { Section, SectionBody, SectionHeader } from "@/components/layout/section";

export function Contact() {
  return (
    <Section id="contact">
      <SectionHeader id="contact" index={8} label="contact" title="Say hi" />
      <SectionBody>
        {site.email && (
          <p className="mb-4 font-serif text-2xl">
            <a className="link-underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
        )}
        <ul className="flex flex-col gap-2 text-sm">
          {socials.map((social) => (
            <li key={social.label} className="flex items-baseline gap-3">
              <span className="w-20 shrink-0 text-muted-foreground">{social.label}</span>
              <span aria-hidden className="leader flex-1" />
              <ExternalLink className="font-mono" href={social.href} rel="noopener noreferrer me">
                {social.handle}
              </ExternalLink>
            </li>
          ))}
        </ul>
        <ResumeDownload className="mt-4" />
      </SectionBody>
    </Section>
  );
}
