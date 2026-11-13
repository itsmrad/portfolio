/** SLOT (home branch). Stub: real data, minimal styling. Keep id="stack". */
import { stack } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

export function Stack() {
  return (
    <Section id="stack">
      <SectionHeader id="stack" index={6} label="stack" title="Stack" />
      <dl>
        {stack.map((row, i) => (
          <div key={row.label} className="screen-line-bottom flex gap-4 px-4 py-3 last:after:content-none">
            <dt className="w-32 shrink-0 text-sm">
              <span aria-hidden className="mr-2 font-pixel text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              {row.label}
            </dt>
            <dd className="font-mono text-xs/6 text-muted-foreground">{row.items.join(" · ")}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
