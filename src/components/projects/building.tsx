/**
 * SLOT (projects branch): currently building. Keep id="building". One line per
 * entry, marked in progress; nothing more is claimed. Server-rendered, no JS.
 *
 * Index rows: number, name, a dotted leader that inks across in the signal
 * colour on hover or focus, the last activity date, and a small loader glyph.
 */
import { building } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

import styles from "./building.module.css";

export function Building() {
  return (
    <Section id="building">
      <SectionHeader id="building" index={4} label="building" title="Currently building" count={building.length}>
        <p className="eyebrow mb-0.5 whitespace-nowrap">In progress</p>
      </SectionHeader>
      <ol className={styles.list}>
        {building.map((item, i) => (
          <li key={item.name} className={styles.row}>
            <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>
                <a href={item.repo} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {item.name}
                </a>
              </h3>
              <span className="sr-only">In progress.</span>
              <span aria-hidden className={styles.leader} />
              <Loader />
              <time dateTime={item.updated}>
                <span className="sr-only">Last activity </span>
                {item.updated}
              </time>
              <span aria-hidden className={styles.arrow}>
                ↗
              </span>
            </div>
            <p>{item.line}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** A 2x2 block loader: the cells light in turn, like a build in progress. */
function Loader() {
  return (
    <span aria-hidden className={styles.loader}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
