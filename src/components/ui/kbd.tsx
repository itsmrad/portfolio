import { cn } from "@/lib/utils";

/** A key cap. Shortcuts are always shown with this, never as bare text. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-surface px-1 font-mono text-[0.6875rem]/none text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
