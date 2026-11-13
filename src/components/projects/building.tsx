/**
 * SLOT (projects branch): currently building. Stub: real data, minimal
 * styling. Keep id="building". One line per entry, nothing more is claimed.
 */
import { building } from "@/content/site";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionHeader } from "@/components/layout/section";

export function Building() {
  return (
    <Section id="building">
      <SectionHeader id="building" index={4} label="building" title="Currently building" count={building.length} />
      <ul>
        {building.map((item, i) => (
          <li key={item.name} className="screen-line-bottom px-4 py-3 last:after:content-none">
            <div className="flex items-baseline gap-3">
              <span aria-hidden className="font-pixel text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-mono text-sm">
                <ExternalLink href={item.repo}>{item.name}</ExternalLink>
              </h3>
              <span aria-hidden className="leader flex-1" />
              <time dateTime={item.updated} className="font-mono text-xs text-muted-foreground">
                {item.updated}
              </time>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.line}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
