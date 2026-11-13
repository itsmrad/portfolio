import { Button } from "@/components/ui/button";

import { CalendarIcon } from "./icons";

/**
 * The booking action: a plain link out to the scheduling page, with no embed
 * and no third-party script. Renders nothing until the address is set.
 */
export function BookCall({ href, ...props }: { href: string } & Omit<React.ComponentProps<typeof Button>, "asChild">) {
  if (!href) return null;
  return (
    <Button asChild variant="outline" {...props}>
      <a href={href} target="_blank" rel="noopener">
        <CalendarIcon className="size-3.5" />
        Book a call
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}
