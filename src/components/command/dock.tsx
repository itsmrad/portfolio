import { pageIndex } from "@/content/site";
import { sectionHref } from "@/components/command/shortcuts";
import { SearchIcon } from "@/components/command/trigger";

import styles from "./command.module.css";

const fadeHeight = "h-[calc(6rem+env(safe-area-inset-bottom,0px))]";

/**
 * Phone navigation below `sm`, where the header hides its links: a floating
 * pill in thumb reach with search and a section menu, over a fade. The menu is
 * a native popover (no script); ./commands closes it when a link is followed.
 * A spacer as tall as the fade ends the page, so the last line of the footer
 * can always scroll clear of both.
 */
export function Dock() {
  return (
    <>
      <div
        aria-hidden
        data-print="hide"
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 ${fadeHeight} bg-linear-to-b from-transparent to-background sm:hidden`}
      />
      <div
        data-print="hide"
        className={`${styles.dock} fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex w-fit -translate-x-1/2 items-center rounded-xl bg-popover py-1 pr-1 pl-2.5 shadow-md ring-1 ring-foreground/10 sm:hidden dark:ring-foreground/20`}
      >
        <button
          type="button"
          data-command-open
          aria-haspopup="dialog"
          className="touch-target flex h-8 min-w-20 items-center gap-2 rounded-md text-sm/4 font-medium text-muted-foreground transition-colors active:text-foreground"
        >
          <SearchIcon className="size-4" />
          Search…
        </button>
        <span aria-hidden className="mr-1 ml-2.5 h-6 w-px bg-border" />
        <button
          type="button"
          popoverTarget="dock-menu"
          aria-label="Sections"
          className="touch-target flex size-8 flex-col items-center justify-center gap-1 rounded-md transition-colors hover:bg-accent"
        >
          <span aria-hidden className={`${styles.bar} h-0.5 w-4 rounded-[1px] bg-foreground`} />
          <span aria-hidden className={`${styles.bar} h-0.5 w-4 rounded-[1px] bg-foreground`} />
        </button>
        <nav
          id="dock-menu"
          popover="auto"
          aria-label="Sections"
          className={`${styles.menu} inset-auto bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-1/2 m-0 w-48 -translate-x-1/2 flex-col rounded-xl bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 open:flex dark:ring-foreground/20`}
        >
          {pageIndex.map((section) => (
            <a
              key={section.id}
              href={sectionHref(section.id)}
              className="rounded-lg px-3 py-2 text-base transition-colors hover:bg-accent focus-visible:bg-accent"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>
      <div aria-hidden className={`${fadeHeight} sm:hidden`} />
    </>
  );
}
