/** SLOT (home branch). Stub: real data, minimal styling. Keep id="experience". */
import { experience } from "@/content/site";
import { formatMonth } from "@/lib/markdown";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";

export function Experience() {
  return (
    <Section id="experience">
      <SectionHeader id="experience" index={2} label="experience" title="Experience" count={experience.length} />
      <ol>
        {experience.map((job) => (
          <li key={job.org} className="screen-line-bottom px-4 py-4 last:after:content-none">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 className="font-medium">
                {job.role}
                <span className="text-muted-foreground"> · </span>
                {job.url ? <ExternalLink href={job.url}>{job.org}</ExternalLink> : job.org}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                <time dateTime={job.start}>{formatMonth(job.start)}</time>
                {" – "}
                {job.end ? (
                  <time dateTime={job.end}>{formatMonth(job.end)}</time>
                ) : (
                  <>
                    <span aria-hidden>∞</span>
                    <span className="sr-only">present</span>
                  </>
                )}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{job.summary}</p>
            {job.highlights.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm marker:text-muted-foreground">
                {job.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
            {job.links && (
              <ul className="mt-2 flex flex-wrap gap-x-4 font-mono text-xs">
                {job.links.map((item) => (
                  <li key={item.href}>
                    <ExternalLink href={item.href}>{item.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}
