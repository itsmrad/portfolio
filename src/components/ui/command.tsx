/**
 * Command menu parts: a listbox of grouped options driven from a combobox
 * input by aria-activedescendant, so focus never leaves the input. Pure
 * markup, no state and no `cn` (which would add a class merger to the lazy
 * chunk): pass extra classes only where the parts below take them.
 */

/** The key cap, matching ui/kbd without its class merger. */
export const kbd =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-surface px-1 font-mono text-[0.6875rem]/none text-muted-foreground";

/** Smaller cap for the footer legend. */
const legendKbd =
  "inline-flex h-4 min-w-4 items-center justify-center rounded-sm border bg-surface px-1 font-mono text-[0.625rem]/none [&_svg]:size-2.5";

export function CommandGroup({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} className="px-2.5 pt-2 pb-1.5 text-xs font-medium text-muted-foreground">
        {heading}
      </div>
      {children}
    </div>
  );
}

export function CommandItem({ selected, ...props }: React.ComponentProps<"div"> & { selected: boolean }) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className="group/row flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors select-none aria-selected:bg-muted aria-selected:text-foreground [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-70 data-accent:font-medium data-accent:[&>svg]:text-accent data-accent:[&>svg]:opacity-100"
      {...props}
    />
  );
}

/** The keys that run an item: one cap per key, `g` chords as two, and `spoken` for screen readers in their place. */
export function CommandShortcut({ keys, spoken }: { keys: string[]; spoken: string }) {
  return (
    // Key caps mean nothing without a keyboard: hidden on touch screens, for sighted and screen-reader users alike.
    <span className="flex shrink-0 items-center gap-1 pointer-coarse:hidden">
      <span className="sr-only">{spoken}</span>
      {keys.map((key, index) => (
        <kbd key={index} aria-hidden className={kbd}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function CommandLegend({ items }: { items: { keys: React.ReactNode[]; label: string }[] }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center gap-4 px-3.5 py-2.5 text-xs text-muted-foreground pointer-coarse:hidden [&>:last-child]:ml-auto"
    >
      {items.map(({ keys, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          {keys.map((key, index) => (
            <kbd key={index} className={legendKbd}>
              {key}
            </kbd>
          ))}
          {label}
        </span>
      ))}
    </div>
  );
}
