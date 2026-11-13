/** Education: one row per entry, in the same shape as the experience rows, then the achievements. */
import { achievements } from "@/content/home";
import { education } from "@/content/site";
import { formatMonth } from "@/lib/markdown";
import { Section, SectionHeader } from "@/components/layout/section";

import styles from "./experience.module.css";

export function Education() {
  return (
    <Section id="education">
      <SectionHeader id="education" index={7} label="education" title="Education" />
      <ul>
        {education.map((entry) => (
          <li key={entry.school} className={`${styles.school} screen-line-bottom last:after:content-none`}>
            <span className={styles.tile} aria-hidden>
              {entry.short[0]}
            </span>
            <h3 className={`${styles.org} text-balance`}>
              {entry.school} <span className="font-normal text-muted-foreground">({entry.short})</span>
            </h3>
            <p className={`${styles.sub} text-sm text-pretty text-muted-foreground`}>
              {entry.degree}
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {entry.location}
            </p>
            <p className={`${styles.dates} font-mono text-xs text-muted-foreground`}>
              <time dateTime={entry.start}>{formatMonth(entry.start)}</time>
              {" – "}
              <time dateTime={entry.end}>{formatMonth(entry.end)}</time>
              <span className="sr-only">, </span>
              <span className={styles.status}>{entry.status}</span>
            </p>
          </li>
        ))}
      </ul>
      {achievements.length > 0 && (
        <div className="screen-line-top px-4 pt-4 pb-5">
          <h3 className="eyebrow">Achievements</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-pretty marker:text-muted-foreground">
            {achievements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
