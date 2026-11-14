import { cn } from "@/lib/utils";

/** The single ruled column: `--frame-width` wide with a hairline down each side. */
export function Frame({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame"
      className={cn("mx-auto w-full max-w-(--frame-width) border-x border-line", className)}
      {...props}
    />
  );
}

/**
 * The margin outside the column on wide screens. Decorative only: hidden
 * below 64rem and from assistive tech, clipped so nothing can cause sideways
 * scroll, and it takes no space in the layout, so filling it shifts nothing.
 */
export function Gutter({ side, children }: { side: "left" | "right"; children?: React.ReactNode }) {
  return (
    <div
      aria-hidden
      data-slot="gutter"
      data-side={side}
      data-print="hide"
      className={cn(
        "pointer-events-none absolute inset-y-0 hidden w-[calc(50%-var(--frame-width)/2)] overflow-clip gutter:block",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      {children}
    </div>
  );
}
