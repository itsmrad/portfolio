import styles from "./command.module.css";

export function SearchIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

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
    <button type="button" data-slot="button" data-command-open aria-haspopup="dialog" aria-keyshortcuts="/ Control+K Meta+K" className={styles.pill}>
      <SearchIcon className="size-3.5" />
      <span className="sr-only">Search</span>
      <kbd aria-hidden className={styles.ctrl}>
        Ctrl
      </kbd>
      <kbd aria-hidden className={styles.cmd}>
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
      </kbd>
      <kbd aria-hidden>K</kbd>
    </button>
  );
}
