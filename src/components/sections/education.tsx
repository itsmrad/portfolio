/** SLOT (home branch). Stub: real data, minimal styling. Keep id="education". */
import { education } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

export function Education() {
  return (
    <Section id="education">
      <SectionHeader id="education" index={7} label="education" title="Education" />
      <ul>
        {education.map((entry) => (
          <li key={entry.school} className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-4">
            <h3 className="font-medium">
              {entry.degree}
              <span className="text-muted-foreground"> · </span>
              {entry.school} <span className="text-muted-foreground">({entry.short})</span>
            </h3>
            <p className="font-mono text-xs text-muted-foreground">{entry.status}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
