import { pageIndex } from "@/content/command";
import { sectionHref } from "@/components/command/shortcuts";
import { SearchIcon } from "@/components/command/trigger";

import styles from "./command.module.css";

/**
 * Phone navigation below `sm`, where the header hides its links: a floating
 * pill in thumb reach with search and a section menu, over a fade. The menu is
 * a native popover (no script); ./commands closes it when a link is followed.
 * A spacer as tall as the fade ends the page, so the last line of the footer
 * can always scroll clear of both. Styled in the CSS module: this markup is
 * on every page twice (HTML and the server payload), so it stays short.
 */
export function Dock() {
  return (
    <>
      <div aria-hidden data-print="hide" className={styles.fade} />
      <div data-print="hide" className={styles.dock}>
        <button type="button" data-slot="button" data-js="" data-command-open aria-haspopup="dialog" className={`${styles.search} touch-target`}>
          <SearchIcon className="size-4" />
          Search…
        </button>
        <span aria-hidden className={styles.rule} />
        <button type="button" data-slot="button" popoverTarget="dock-menu" aria-label="Sections" className={`${styles.toggle} touch-target`}>
          <span aria-hidden />
          <span aria-hidden />
        </button>
        <nav id="dock-menu" popover="auto" aria-label="Sections" className={styles.menu}>
          {pageIndex.map((section) => (
            <a key={section.id} href={sectionHref(section.id)}>
              {section.label}
            </a>
          ))}
        </nav>
      </div>
      <div aria-hidden data-print="hide" className={styles.spacer} />
    </>
  );
}
