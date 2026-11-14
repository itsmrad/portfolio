import { cn } from "@/lib/utils";

/**
 * Section primitives. Every block on the page is a <Section> whose `id` is
 * also its anchor (`/#id`) and the prefix of its heading id.
 *
 *   <Section id="work">
 *     <SectionHeader id="work" index={3} label="work" title="Selected work" count={2} />
 *     <SectionBody>…</SectionBody>
 *   </Section>
 *   <Separator />
 */
export function Section({
  id,
  rule = true,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { id: string; rule?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("relative", className)} {...props}>
      {rule && <div className="rule" aria-hidden />}
      {children}
    </section>
  );
}

/** Eyebrow written like a path (`01 / experience`) over a serif title with an optional count. */
export function SectionHeader({
  id,
  index,
  label,
  title,
  count,
  className,
  children,
}: {
  id: string;
  index: number;
  label: string;
  title: string;
  count?: number;
  className?: string;
  /** Right-aligned extras, such as a "view all" link. */
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("screen-line-bottom flex items-end justify-between gap-4 px-4 pt-8 pb-3", className)}>
      <div>
        <p className="eyebrow" aria-hidden>
          {String(index).padStart(2, "0")} / {label}
        </p>
        {/* The count is drawn by CSS from data-count, so it stays out of the heading's text
            and accessible name (crawlers would read "Experience03"). */}
        <h2
          id={`${id}-title`}
          data-count={count != null ? String(count).padStart(2, "0") : undefined}
          className="mt-1 font-serif text-3xl/[1.1] tracking-[-0.01em] data-count:after:relative data-count:after:-top-[0.75em] data-count:after:ml-1 data-count:after:font-pixel data-count:after:text-xs data-count:after:leading-none data-count:after:tracking-normal data-count:after:text-muted-foreground data-count:after:content-[attr(data-count)]"
        >
          {title}
        </h2>
      </div>
      {children}
    </header>
  );
}

export function SectionBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

/** The 32px hatch band between major sections, under a dashed rule. Two bare elements, no wrapper: the page's element count is tight. */
export function Separator({ className }: { className?: string }) {
  return (
    <>
      <div aria-hidden data-print="hide" className="rule" />
      <div aria-hidden data-print="hide" className={cn("hatch-band", className)} />
    </>
  );
}
