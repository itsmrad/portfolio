/**
 * Contact: the email in large type with a copy button (only once `site.email`
 * is set), the booking and resume actions, and every social profile as a cell
 * in a ruled grid. Never a phone number.
 */
import { site, socials } from "@/content/site";
import { resumePdf } from "@/lib/resume";
import { ResumeDownload } from "@/components/layout/resume-download";
import { Section, SectionHeader } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button";

import { BookCall } from "./book-call";
import { CopyButton } from "./copy-button";
import { BrandIcon } from "./icons";
import styles from "./contact.module.css";

export function Contact() {
  return (
    <Section id="contact">
      <SectionHeader id="contact" index={8} label="contact" title="Say hi" />
      {(site.email || site.calUrl || resumePdf()) && (
        <div className="screen-line-bottom px-4 pt-5 pb-5">
          {site.email && (
            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <a className="link-underline font-serif text-2xl break-all sm:text-3xl" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              <CopyButton
                value={site.email}
                data-slot="button"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} font-mono`}
              >
                copy
              </CopyButton>
            </p>
          )}
          <div className="flex flex-wrap gap-2" data-print="hide">
            {/* The same pair, order and weight as the hero: the resume is the one filled button. */}
            <ResumeDownload />
            <BookCall href={site.calUrl} />
          </div>
        </div>
      )}
      <ul className={styles.socials}>
        {socials.map((social) => (
          <li key={social.label}>
            <a href={social.href} target="_blank" rel="noopener noreferrer me">
              <span className={styles.tile}>
                <BrandIcon name={social.label} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{social.label}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">{social.handle}</span>
              </span>
              <span aria-hidden className={styles.arrow}>
                ↗
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
