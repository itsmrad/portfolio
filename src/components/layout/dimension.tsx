import { cn } from "@/lib/utils";

/**
 * Drawing-style measurement annotations. Decorative, so always aria-hidden,
 * and every number shown must be the real size of the thing it measures.
 *
 *   <Dimension className="absolute inset-x-0 top-0 h-8">
 *     <DimensionLine className="absolute inset-x-0 top-1/2">640</DimensionLine>
 *   </Dimension>
 */
type Orientation = "horizontal" | "vertical";

export function Dimension({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="dimension"
      data-print="hide"
      className={cn("pointer-events-none text-dimension select-none", className)}
      {...props}
    />
  );
}

/** A line with an arrowhead at each end; children become the label in a gap at the middle. */
export function DimensionLine({
  orientation = "horizontal",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { orientation?: Orientation }) {
  const vertical = orientation === "vertical";
  const stroke = cn("flex-1 bg-current", vertical ? "w-px" : "h-px");
  return (
    <div className={cn("flex items-center", vertical ? "flex-col py-px" : "px-px", className)} {...props}>
      <Arrow vertical={vertical} />
      <div className={stroke} />
      {children != null && <DimensionValue className={vertical ? "py-1" : "px-1"}>{children}</DimensionValue>}
      <div className={stroke} />
      <Arrow vertical={vertical} className={vertical ? "-scale-y-100" : "-scale-x-100"} />
    </div>
  );
}

/** A short line running from the measured edge out to the dimension line. */
export function DimensionExtension({
  orientation = "vertical",
  className,
  ...props
}: React.ComponentProps<"div"> & { orientation?: Orientation }) {
  return (
    <div className={cn("absolute bg-current", orientation === "vertical" ? "w-px" : "h-px", className)} {...props} />
  );
}

export function DimensionValue({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-mono text-xs/none text-dimension-foreground tabular-nums", className)} {...props} />;
}

function Arrow({ vertical, className }: { vertical: boolean; className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={vertical ? 7 : 9}
      height={vertical ? 9 : 7}
      viewBox={vertical ? "0 0 7 9" : "0 0 9 7"}
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
    >
      {/* Half-pixel points keep the 1px outline crisp. */}
      <path d={vertical ? "M3.5.5 6.5 8.5h-6Z" : "M.5 3.5 8.5.5v6Z"} />
    </svg>
  );
}

/** Must equal --frame-width in globals.css (40rem). */
const FRAME_WIDTH = 640;

/** The strip above the hero that states the column's width. Shown only once the column is that wide. */
export function FrameDimension({ className }: { className?: string }) {
  return (
    <div className={cn("relative hidden h-8 min-[41rem]:block", className)} aria-hidden data-print="hide">
      <Dimension className="absolute -inset-x-px inset-y-0">
        <DimensionExtension className="inset-y-1 left-0" />
        <DimensionExtension className="inset-y-1 right-0" />
        <DimensionLine className="absolute inset-x-0 top-1/2 -translate-y-1/2">{FRAME_WIDTH}</DimensionLine>
      </Dimension>
    </div>
  );
}
