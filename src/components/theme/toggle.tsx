/**
 * SLOT (command + theme branch): the header's theme toggle.
 *
 * This working stub flips the theme through lib/theme. Replace it with the
 * final control (circular reveal from the button via
 * document.startViewTransition when supported and motion is not reduced, icon
 * spin, `d` shortcut). Contract:
 * - Call only `toggleTheme()` / `setTheme()` / `currentTheme()` from
 *   lib/theme; they own the class on <html>, storage and <meta theme-color>.
 * - One 32px ghost icon button with an accessible name. Never read the theme
 *   during render (the server cannot know it); style by `dark:` instead.
 * - Keep the split used here: this server component renders the classes and
 *   the icon, the client file holds only the handler. A client file that
 *   imports `cn`, <Button> or an icon library drags them into first-load JS
 *   (inline icons: components/ui/icons.tsx).
 */
import { ToggleButton } from "@/components/theme/toggle-button";
import { buttonVariants } from "@/components/ui/button";
import { ContrastIcon } from "@/components/ui/icons";

export function ThemeToggle() {
  return (
    <ToggleButton
      aria-label="Toggle light and dark theme"
      className={buttonVariants({ variant: "ghost", size: "icon" })}
    >
      <ContrastIcon className="transition-transform duration-500 dark:rotate-180" />
    </ToggleButton>
  );
}
