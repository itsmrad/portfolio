/**
 * Stack: numbered rows that read like a spec sheet. Each pill's logo is grey
 * until hovered, then takes the brand's own colour and the pill lifts.
 */
import { stack } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

import { MARKS } from "./stack-marks";
import styles from "./stack.module.css";

export function Stack() {
  return (
    <Section id="stack">
      <SectionHeader id="stack" index={6} label="stack" title="Stack" />
      <dl className={styles.rows}>
        {stack.map((row, index) => (
          <div key={row.label} className="screen-line-bottom last:after:content-none">
            <dt>
              <span aria-hidden className="mr-2 font-pixel text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              {row.label}
            </dt>
            <dd>
              <ul>
                {row.items.map((item) => {
                  const [slot, colour] = MARKS[item] ?? [];
                  return (
                    <li
                      key={item}
                      style={slot === undefined ? undefined : ({ "--slot": slot, "--brand": colour } as React.CSSProperties)}
                    >
                      {slot !== undefined && <i />}
                      {item}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
