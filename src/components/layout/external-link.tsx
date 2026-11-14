import { cn } from "@/lib/utils";

/** Every external link opens in a new tab and carries the north-east arrow. */
export function ExternalLink({ className, children, ...props }: React.ComponentProps<"a">) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={cn("link-underline", className)} {...props}>
      {children}
      <span aria-hidden className="ml-0.5 font-mono text-[0.85em] text-muted-foreground">
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
