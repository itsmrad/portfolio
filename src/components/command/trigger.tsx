/**
 * SLOT (command + theme branch): the header's search pill.
 *
 * Renders nothing until filled. Contract:
 * - A pill button showing the shortcut in <Kbd>, at most 128px wide (the bar
 *   has no more room) and hidden below `sm`, where the
 *   palette is opened from the floating dock rendered by ./root instead.
 * - Opening imports the palette chunk on demand (budget 25 KB); nothing from
 *   cmdk or Radix may be in the first-load bundle.
 */
export function CommandTrigger() {
  return null;
}
