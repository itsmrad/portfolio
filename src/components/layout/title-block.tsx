import { cn } from "@/lib/utils";

/**
 * The footer's title block: a grid of labelled cells, like the corner of an
 * engineering drawing. Cells draw their own right and bottom hairlines, and
 * the grid shows hatching wherever a cell is missing.
 */
export function TitleBlock({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <div className="overflow-hidden hatch">
      <dl className={cn("-mr-px -mb-px grid grid-cols-2 font-mono sm:grid-cols-4", className)} {...props} />
    </div>
  );
}

export function TitleBlockField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-r border-b border-line bg-background px-4 py-3", className)}>
      <dt className="text-[0.625rem]/4 font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="flex-1 text-sm">{children}</dd>
    </div>
  );
}
