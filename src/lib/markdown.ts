import { about, building, education, experience, projects, seo, site, socials, stack } from "@/content/site";
import { resumePdf } from "@/lib/resume";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" -> "Sep 2026". Shared with the page so both read the same. */
export function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${months[Number(month) - 1]} ${year}`;
}

export function formatRange(start: string, end: string | null) {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "present"}`;
}

const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

/** The whole page as Markdown: served at /index.md for agents. */
export function pageMarkdown() {
  const resume = resumePdf();
  const blocks = [
    `# ${site.name}`,
    `${site.role} · ${site.location.label} · ${site.availability}`,
    `> ${site.tagline}`,
    `## About`,
    about.join("\n\n").replaceAll("**", ""),
    `## Experience`,
    ...experience.map((job) =>
      [
        `### ${job.role}, ${job.org} (${formatRange(job.start, job.end)})`,
        job.summary,
        list(job.highlights),
        list((job.links ?? []).map((link) => `[${link.label}](${link.href})`)),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
    `## Work`,
    ...projects.map((project) =>
      [
        `### ${project.name}: ${project.tagline}`,
        `Status: ${project.statusLabel}. Started ${formatMonth(project.started)}.`,
        project.description,
        list(project.highlights),
        list(project.metrics.map((m) => `${m.label}: ${m.value}${m.note ? ` (${m.note})` : ""}`)),
        project.metricsSource && `Source: [${project.metricsSource.label}](${project.metricsSource.href})`,
        `Stack: ${project.stack.join(", ")}`,
        list(project.links.map((link) => `[${link.label}](${link.href})`)),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
    `## Currently building`,
    list(building.map((item) => `[${item.name}](${item.repo}): ${item.line}`)),
    `## Stack`,
    list(stack.map((row) => `${row.label}: ${row.items.join(", ")}`)),
    `## Education`,
    list(education.map((entry) => `${entry.degree}, ${entry.school} (${entry.short}). ${entry.status}.`)),
    `## Contact`,
    list([
      ...(site.email ? [`Email: ${site.email}`] : []),
      ...socials.map((social) => `${social.label}: [${social.handle}](${social.href})`),
      ...(resume ? [`Resume: [PDF](${site.url}${resume})`] : []),
    ]),
  ];
  return `${blocks.join("\n\n")}\n`;
}

/** /llms.txt: a short index pointing agents at the Markdown copy and the profiles. */
export function llmsTxt() {
  const resume = resumePdf();
  return `# ${site.name}

> ${seo.description}

## Pages

- [Portfolio (Markdown)](${site.url}/index.md): about, experience, projects, stack, education and contact in one file
- [Portfolio (HTML)](${site.url})
${resume ? `- [Resume (PDF)](${site.url}${resume})\n` : ""}
## Projects

${list(projects.map((project) => `[${project.name}](${project.url ?? project.repo}): ${project.tagline}`))}

## Profiles

${list(socials.map((social) => `[${social.label}](${social.href}): ${social.handle}`))}
`;
}
