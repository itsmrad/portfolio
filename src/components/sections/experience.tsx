/**
 * Experience: one row per role (letter tile, organisation, title, dates with
 * the infinity sign while ongoing). A row is a native <details>, so it opens
 * without JavaScript; the current role starts open.
 */
import { experience, type Experience as Job } from "@/content/site";
import { formatMonth } from "@/lib/markdown";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";
import { Img } from "@/components/ui/img";

import { ChevronIcon } from "./icons";
import styles from "./experience.module.css";

const KIND: Record<Job["kind"], string> = { internship: "Internship", community: "Community" };

/** A pair of eyes that blinks: the role being held right now. */
function Current() {
  return (
    <span className={styles.badge}>
      <svg viewBox="0 0 11 6" aria-hidden>
        <circle cx="2.5" cy="3" r="1.6" />
        <circle cx="8.5" cy="3" r="1.6" />
      </svg>
      Current
    </span>
  );
}

export function Experience() {
  const current = experience.find((job) => job.kind === "internship" && !job.end);
  return (
    <Section id="experience">
      <SectionHeader id="experience" index={2} label="experience" title="Experience" count={experience.length} />
      <ol>
        {experience.map((job) => (
          <li key={job.org} className="screen-line-bottom last:after:content-none">
            <details className={styles.role} open={job === current}>
              <summary>
                <span className={styles.tile} aria-hidden>
                  {job.logo ? <Img src={job.logo} alt="" width={34} height={34} /> : job.org[0]}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-medium">{job.org}</h3>
                    {job === current && <Current />}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {job.role}
                    <span aria-hidden> · </span>
                    <span className="sr-only">, </span>
                    {KIND[job.kind]}
                  </div>
                </div>
                <div className={`${styles.dates} font-mono text-xs text-muted-foreground`}>
                  <time dateTime={job.start}>{formatMonth(job.start)}</time>
                  {" – "}
                  {job.end ? (
                    <time dateTime={job.end}>{formatMonth(job.end)}</time>
                  ) : (
                    <>
                      <span aria-hidden className="text-sm/none text-foreground">
                        ∞
                      </span>
                      <span className="sr-only">present</span>
                    </>
                  )}
                </div>
                <ChevronIcon className={styles.chevron} />
              </summary>
              <div className={styles.more}>
                <p className="text-sm text-pretty text-muted-foreground">{job.summary}</p>
                {job.highlights.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-pretty marker:text-muted-foreground">
                    {job.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
                {(job.url || job.links) && (
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                    {job.url && (
                      <li>
                        <ExternalLink href={job.url}>{new URL(job.url).hostname}</ExternalLink>
                      </li>
                    )}
                    {job.links?.map((item) => (
                      <li key={item.href}>
                        <ExternalLink href={item.href}>{item.label}</ExternalLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </Section>
  );
}
