/**
 * SLOT (projects branch): featured work. Keep id="work" and one
 * <article id={project.slug}> per project: `/#codenaya` and `/#xflow` are
 * linked from the structured data, the Markdown copy and the palette.
 *
 * Server-rendered, no client JS. Each project reads as a short case study:
 * window card, numbers, the product (or its benchmarks), what was built, the
 * stack by layer, engineering decisions, links. Copy is in the content file.
 * Every element here ships twice (HTML and the RSC payload), so repeated rows
 * use the short CSS-module classes in article.module.css, not utility lists.
 */
import { projects, type Project } from "@/content/site";
import { formatMonth } from "@/lib/markdown";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";

import s from "./article.module.css";
import { Benchmarks } from "./benchmarks";
import styles from "./projects.module.css";
import { ProjectFigure, ProjectLogo, ProjectWindow } from "./window";

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  return (
    <Section id="work">
      <SectionHeader id="work" index={3} label="work" title="Selected work" count={featured.length} />
      {featured.map((project) => (
        <ProjectArticle key={project.slug} project={project} />
      ))}
    </Section>
  );
}

function ProjectArticle({ project }: { project: Project }) {
  const parts: [string, React.ReactNode][] = [];
  if (project.figure) parts.push(["The product", <ProjectFigure key="f" figure={project.figure} />]);
  if (project.benchmarks) parts.push(["Benchmarks", <Benchmarks key="b" data={project.benchmarks} />]);
  parts.push(["What I built", <Built key="w" items={project.built ?? project.highlights} />]);
  if (project.layers) parts.push(["Stack by layer", <Layers key="l" layers={project.layers} />]);
  if (project.decisions) parts.push(["Engineering decisions", <Decisions key="d" decisions={project.decisions} />]);

  return (
    <article id={project.slug} aria-labelledby={`${project.slug}-title`} className={`${s.article} screen-line-bottom`}>
      <ProjectWindow project={project} />

      <div className={s.meta}>
        {project.category && <p className="eyebrow">{project.category}</p>}
        <p className="eyebrow">
          <i aria-hidden className={s.status} />
          {project.statusLabel} · Since <time dateTime={project.started}>{formatMonth(project.started)}</time>
        </p>
      </div>

      <h3 id={`${project.slug}-title`} className={s.name}>
        <a href={project.url ?? project.repo} target="_blank" rel="noopener noreferrer">
          <ProjectLogo slug={project.slug} />
          {project.name}
          <span aria-hidden className={styles.arrow}>
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h3>
      <p className={s.tagline}>{project.tagline}</p>
      <p className={s.description}>{project.description}</p>

      <dl className={s.metrics}>
        {project.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      {project.metricsSource && !project.benchmarks && (
        <p className={s.source}>
          <ExternalLink href={project.metricsSource.href}>{project.metricsSource.label}</ExternalLink>
        </p>
      )}

      {parts.map(([title, body], i) => (
        <div key={title} className={s.part}>
          <h4>
            <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            {title}
          </h4>
          {body}
        </div>
      ))}

      <ul className={s.links}>
        {project.links.map((item) => (
          <li key={item.href}>
            <ExternalLink href={item.href}>{item.label}</ExternalLink>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Built({ items }: { items: string[] }) {
  return (
    <ul className={s.built}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Layer, dashed leader, tools: a table of contents for the stack. */
function Layers({ layers }: { layers: NonNullable<Project["layers"]> }) {
  return (
    <dl className={s.layers}>
      {layers.map((row) => (
        <div key={row.layer}>
          <dt>{row.layer}</dt>
          <dd>{row.tools}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Constraint, decision, result: one numbered entry per decision. */
function Decisions({ decisions }: { decisions: NonNullable<Project["decisions"]> }) {
  return (
    <ol className={s.decisions}>
      {decisions.map((entry) => (
        <li key={entry.title}>
          <h5>{entry.title}</h5>
          <dl>
            <dt>Constraint</dt>
            <dd>{entry.constraint}</dd>
            <dt>→ Decision</dt>
            <dd>{entry.decision}</dd>
            <dt>Result</dt>
            <dd>{entry.result}</dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}
