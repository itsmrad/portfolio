/** Education: one row per entry, in the same shape as the experience rows. */
import { education } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

import styles from "./experience.module.css";

export function Education() {
  return (
    <Section id="education">
      <SectionHeader id="education" index={7} label="education" title="Education" />
      <ul>
        {education.map((entry) => (
          <li key={entry.school} className="screen-line-bottom flex items-center gap-3 px-4 py-3.5 last:after:content-none">
            <span className={styles.tile} aria-hidden>
              {entry.short[0]}
            </span>
            <div className="min-w-0">
              <h3 className="font-medium text-balance">
                {entry.school} <span className="font-normal text-muted-foreground">({entry.short})</span>
              </h3>
              <p className="text-sm text-muted-foreground">{entry.degree}</p>
            </div>
            <p className="ml-auto shrink-0 pl-2 font-mono text-xs text-muted-foreground">{entry.status}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
