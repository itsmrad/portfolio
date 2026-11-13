/**
 * The header's theme toggle (command branch): light and dark only, following
 * the system until pressed. One 32px ghost icon button; `d` presses it from
 * anywhere through its `aria-keyshortcuts`. The half-filled disc turns 180° in
 * dark (500ms); the circular reveal lives in the client half.
 * Contract kept: calls only lib/theme, never reads the theme while rendering
 * (style by `dark:`), and this server file renders the classes and the icon.
 */
import { ToggleButton } from "@/components/theme/toggle-button";
import { buttonVariants } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <ToggleButton
      aria-label="Toggle light and dark theme"
      aria-keyshortcuts="d"
      data-slot="button"
      className={buttonVariants({ variant: "ghost", size: "icon" })}
    >
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
        <path
          d="M16 .5C7.4.5.5 7.4.5 16S7.4 31.5 16 31.5 31.5 24.6 31.5 16 24.6.5 16 .5zm0 28.1V3.4C23 3.4 28.6 9 28.6 16S23 28.6 16 28.6z"
          className="origin-center transition-transform duration-500 ease-[ease] dark:rotate-180"
        />
      </svg>
    </ToggleButton>
  );
}
