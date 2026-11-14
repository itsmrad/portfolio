import { faq } from "@/content/faq";
import { achievements } from "@/content/home";
import { about, building, education, experience, projects, seo, site, socials, stack } from "@/content/site";
import { resumePdf } from "@/lib/resume";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" -> "Sep 2026". Shared with the page so both read the same. */
export function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${months[Number(month) - 1]} ${year}`;
}

export function formatRange(start: string, end?: string | null) {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "present"}`;
}

/** Email and booking page: the same two lines in the Markdown copy and in llms.txt. */
const reach = () => [
  ...(site.email ? [`Email: ${site.email}`] : []),
  ...(site.calUrl ? [`Book a call: ${site.calUrl}`] : []),
];

const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

/** A heading that links to its section on the page, so answers can cite the exact fragment. */
const section = (title: string, id: string) => `## [${title}](${site.url}/#${id})`;

/** The whole page as Markdown: served at /index.md and /llms-full.txt for agents. */
export function pageMarkdown() {
  const resume = resumePdf();
  const blocks = [
    // R20: the title names him in full, then About's first sentence and the first
    // question do, exactly as on the page; everywhere else he is Anupam.
    `# ${site.name}`,
    `${site.role} · ${site.location.label} · ${site.availability}`,
    `> ${site.tagline}`,
    `Source: ${site.url} · Last updated: ${site.updated}`,
    section("About", "about"),
    about.join("\n\n").replaceAll("**", ""),
    section("Experience", "experience"),
    ...experience.map((job) =>
      [
        `### ${job.role}, ${job.org}${job.start ? ` (${formatRange(job.start, job.end)})` : ""}`,
        [job.location, job.url].filter(Boolean).join(" · "),
        job.summary,
        list(job.highlights),
        list((job.links ?? []).map((link) => `[${link.label}](${link.href})`)),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
    section("Selected work", "work"),
    ...projects.map((project) =>
      [
        `### [${project.name}](${site.url}/#${project.slug}): ${project.tagline}`,
        `Status: ${project.statusLabel}. Started ${formatMonth(project.started)}.${project.authorship ? ` ${project.authorship}` : ""}`,
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
    section("Currently building", "building"),
    list(building.map((item) => `[${item.name}](${item.repo}): ${item.line}`)),
    section("Stack", "stack"),
    list(stack.map((row) => `${row.label}: ${row.items.join(", ")}`)),
    section("Education", "education"),
    list(
      education.map(
        (entry) =>
          `${entry.degree}, ${entry.school} (${entry.short}), ${entry.location}, ${formatRange(entry.start, entry.end)}. ${entry.status}.`,
      ),
    ),
    `### Achievements`,
    list(achievements),
    section("Questions, answered", "faq"),
    ...faq.map((item) => `### ${item.question}\n\n${item.answer}`),
    section("Contact", "contact"),
    list([
      ...reach(),
      ...socials.map((social) => `${social.label}: [${social.handle}](${social.href})`),
      ...(resume ? [`Resume: [PDF](${site.url}${resume})`] : []),
    ]),
  ];
  return `${blocks.join("\n\n")}\n`;
}

/**
 * /llms.txt, following the llmstxt.org layout: a title, a one-paragraph summary,
 * key facts, then link lists. Everything links to a stable fragment of the page.
 */
export function llmsTxt() {
  const resume = resumePdf();
  const current = experience.find((job) => job.kind === "work" && !job.end);
  const school = education[0];
  const facts = [
    `Handles: ${[...new Set(socials.map((social) => social.handle))].join(", ")}`,
    `Role: ${seo.jobTitle.join(" and ")}`,
    ...(current?.start ? [`Current: ${current.role} at ${current.org}, ${current.location} (${formatRange(current.start)})`] : []),
    ...(school
      ? [`Education: ${school.degree}, ${school.school} (${school.short}), ${formatRange(school.start, school.end)}, ${school.status.toLowerCase()}`]
      : []),
    `Based in: ${site.location.label} (${site.location.timeZone})`,
    `Availability: ${site.availability}`,
    ...reach(),
    `Last updated: ${site.updated}`,
  ];
  // R20: the full name in the title and the one defining sentence below it; after that he is Anupam.
  const [who, ...questions] = faq;
  return `# ${site.name}

> ${who!.answer} More: ${site.url}/#faq-${who!.id}

## Key facts

${list(facts)}

## Profile

- [Full profile (Markdown)](${site.url}/index.md): about, experience, projects, stack, education, questions and contact in one file
- [Full profile (plain text)](${site.url}/llms-full.txt): the same document as llms-full.txt
- [Portfolio (HTML)](${site.url}): the canonical page
${resume ? `- [Resume (PDF)](${site.url}${resume})\n` : ""}
## Projects

${list(
  projects.map(
    (project) =>
      `[${project.name}](${site.url}/#${project.slug}): ${project.tagline}${project.url ? ` Live: ${project.url}.` : ""}${project.repo ? ` Source: ${project.repo}.` : ""}`,
  ),
)}

## Sections

${list(
  [
    ["About", "about"],
    ["Experience", "experience"],
    ["Selected work", "work"],
    ["Stack", "stack"],
    ["Education and achievements", "education"],
    ["Questions, answered", "faq"],
    ["Contact", "contact"],
  ].map(([title, id]) => `[${title}](${site.url}/#${id})`),
)}

## Questions

${list(questions.map((item) => `[${item.question}](${site.url}/#faq-${item.id}): ${item.answer}`))}

## Profiles

${list(socials.map((social) => `[${social.label}](${social.href}): ${social.handle}`))}

## Optional

${list(building.map((item) => `[${item.name}](${item.repo}): currently building. ${item.line}`))}
`;
}
