import styles from "./command.module.css";

export function SearchIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

const cap =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-background px-1 font-mono text-[0.6875rem]/none";

/**
 * The header's search pill (command branch): about 90px wide, hidden below
 * `sm` where the dock's search takes over. Plain server markup: ./commands
 * opens the palette for anything marked `data-command-open` and starts
 * fetching it on hover or focus. Shows Ctrl, or the Command key on Apple
 * devices once the listener has marked <html>; both caps share one width, so
 * the swap never moves the bar.
 */
export function CommandTrigger() {
  return (
    <button
      type="button"
      data-command-open
      aria-haspopup="dialog"
      aria-keyshortcuts="/ Control+K Meta+K"
      className="mr-1 hidden h-8 items-center gap-1.5 rounded-md border bg-surface pr-1.5 pl-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
    >
      <SearchIcon className="size-3.5" />
      <span className="sr-only">Search</span>
      <span aria-hidden className="flex items-center gap-0.5">
        <kbd className={`${cap} ${styles.ctrl} w-8`}>Ctrl</kbd>
        <kbd className={`${cap} ${styles.cmd} w-8`}>
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
        </kbd>
        <kbd className={cap}>K</kbd>
      </span>
    </button>
  );
}
