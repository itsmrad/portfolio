/**
 * Experience: one row per role (letter tile, organisation, title and place,
 * dates with the infinity sign while ongoing). A row is a native <details>, so
 * it opens without JavaScript; the current role starts open. Community work
 * follows as a smaller group of plain rows.
 */
import { experienceAccents } from "@/content/accent";
import { experience, type Experience as Job } from "@/content/site";
import { formatMonth } from "@/lib/markdown";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";
import { Highlight } from "@/components/ui/highlight";
import { Img } from "@/components/ui/img";

import { ChevronIcon } from "./icons";
import styles from "./experience.module.css";

function Tile({ job }: { job: Job }) {
  return (
    <span className={styles.tile} aria-hidden>
      {job.logo ? <Img src={job.logo} alt="" width={34} height={34} /> : job.org[0]}
    </span>
  );
}

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

function Role({ job, current }: { job: Job; current: boolean }) {
  return (
    <details className={styles.role} open={current}>
      <summary>
        {/* Only phrasing content and a heading may sit in a summary, so the grid places these directly. */}
        <Tile job={job} />
        <h3 className={styles.org}>
          {job.org} {current && <Current />}
        </h3>
        <span className={`${styles.sub} text-sm text-pretty text-muted-foreground`}>
          {job.role}
          {job.location && (
            <>
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {job.location}
            </>
          )}
        </span>
        {job.start && (
          <span className={`${styles.dates} font-mono text-xs text-muted-foreground`}>
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
          </span>
        )}
        <ChevronIcon className={styles.chevron} />
      </summary>
      <div className={styles.more}>
        <p className="text-sm text-pretty text-muted-foreground">{job.summary}</p>
        {job.highlights.length > 0 && (
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-pretty marker:text-muted-foreground">
            {job.highlights.map((highlight) => (
              <li key={highlight}>
                <Highlight text={highlight} marks={experienceAccents} />
              </li>
            ))}
          </ul>
        )}
        {(job.url || job.links) && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
            {job.url && (
              <li>
                <ExternalLink href={job.url}>{new URL(job.url).hostname.replace("www.", "")}</ExternalLink>
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
  );
}

export function Experience() {
  const work = experience.filter((job) => job.kind === "work");
  const community = experience.filter((job) => job.kind === "community");
  const current = work.find((job) => !job.end);
  return (
    <Section id="experience">
      <SectionHeader id="experience" index={2} label="experience" title="Experience" count={work.length} />
      <ol>
        {work.map((job) => (
          <li key={job.org} className="screen-line-bottom last:after:content-none">
            <Role job={job} current={job === current} />
          </li>
        ))}
      </ol>
      {community.length > 0 && (
        <div className="screen-line-top px-4 pt-4 pb-5">
          <h3 className="eyebrow">Community</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {community.map((job) => (
              <li key={job.org} className="text-sm text-pretty">
                <h4 className="inline font-medium">{job.org}</h4>
                <span className="text-muted-foreground">
                  <span aria-hidden> · </span>
                  <span className="sr-only">, </span>
                  {job.role}
                </span>
                <p className="mt-0.5 text-muted-foreground">
                  <Highlight text={job.summary} marks={experienceAccents} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
