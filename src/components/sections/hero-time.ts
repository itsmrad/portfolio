/**
 * Paints the owner's local time and how far it is from the visitor's. Used
 * twice: stringified into an inline script, so the first paint is already
 * right, and called by the clock every 15 seconds. It must therefore stay
 * self-contained: no imports, nothing from module scope.
 */
export function paintTime(element: Element, timeZone: string) {
  const now = new Date();
  const wall = (zone?: string) => new Date(now.toLocaleString("en-US", { timeZone: zone })).getTime();
  const minutes = Math.round((wall(timeZone) - wall()) / 60000);
  const [h, m] = [Math.floor(Math.abs(minutes) / 60), Math.abs(minutes) % 60];
  const [time, difference] = element.children;
  time!.textContent = now.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  difference!.textContent = minutes
    ? ` // ${[h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ")} ${minutes > 0 ? "ahead" : "behind"}`
    : " // same time as you";
}
