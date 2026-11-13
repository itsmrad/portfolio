/**
 * SLOT (projects branch): featured work. Stub: real data, minimal styling.
 * Replace the inside with the final cards (screenshot in window chrome,
 * status pill, stack by layer, decisions, evidence, media). Keep id="work"
 * and one <article id={project.slug}> per project: `/#codenaya` and `/#xflow`
 * are linked from the structured data, the Markdown copy and the palette.
 */
import { projects } from "@/content/site";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  return (
    <Section id="work">
      <SectionHeader id="work" index={3} label="work" title="Selected work" count={featured.length} />
      {featured.map((project) => (
        <article
          key={project.slug}
          id={project.slug}
          aria-labelledby={`${project.slug}-title`}
          className="screen-line-bottom px-4 py-6 last:after:content-none"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h3 id={`${project.slug}-title`} className="font-serif text-2xl tracking-[-0.01em]">
              {project.name}
            </h3>
            <p className="eyebrow">{project.statusLabel}</p>
          </div>
          <p className="mt-1 text-muted-foreground">{project.tagline}</p>
          <p className="mt-3 text-pretty">{project.description}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm marker:text-muted-foreground">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {project.metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="font-mono text-sm" title={metric.note}>
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
          {project.metricsSource && (
            <p className="mt-2 text-xs text-muted-foreground">
              <ExternalLink href={project.metricsSource.href}>{project.metricsSource.label}</ExternalLink>
            </p>
          )}
          <p className="mt-4 font-mono text-xs/5 text-muted-foreground">{project.stack.join(" · ")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 font-mono text-xs">
            {project.links.map((item) => (
              <li key={item.href}>
                <ExternalLink href={item.href}>{item.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </Section>
  );
}
