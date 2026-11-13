/**
 * Paints the owner's local time and how far it is from the visitor's. Used
 * twice: stringified into an inline script, so the first paint is already
 * right, and called by the clock every 15 seconds. It must therefore stay
 * self-contained: no imports, nothing from module scope.
 */
export function paintTime(element: Element, timeZone: string) {
  const now = new Date();
  // "GMT+05:30", or plain "GMT": the zone's offset, read from the formatter rather than by re-parsing a date string.
  const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")!.value;
  const [, sign, hours = 0, mins = 0] = /([+-])(\d+):(\d+)/.exec(offset) ?? [];
  const minutes = (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(mins)) + now.getTimezoneOffset();
  const [h, m] = [Math.floor(Math.abs(minutes) / 60), Math.abs(minutes) % 60];
  const [time, difference] = element.children;
  time!.textContent = now.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  difference!.textContent = minutes
    ? ` // ${[h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ")} ${minutes > 0 ? "ahead" : "behind"}`
    : " // same time as you";
}
