/**
 * Questions, answered: what people and assistants ask about the owner, each
 * answer quotable on its own. Plain headings and paragraphs, always visible,
 * two elements per question. The same list is the page's FAQPage data.
 */
import { Fragment } from "react";

import { faq } from "@/content/faq";
import { site } from "@/content/site";
import { Section, SectionHeader } from "@/components/layout/section";

export function Faq() {
  return (
    <Section id="faq">
      <SectionHeader id="faq" index={8} label="faq" title="Questions, answered">
        <p className="shrink-0 font-mono text-xs text-muted-foreground">
          Updated <time dateTime={site.updated}>{site.updated}</time>
        </p>
      </SectionHeader>
      <div className="px-4 pt-1 pb-6 text-pretty">
        {faq.map((item) => (
          <Fragment key={item.id}>
            <h3 id={`faq-${item.id}`} className="mt-5 text-[0.9375rem] font-medium">
              {item.question}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.answer}
            </p>
          </Fragment>
        ))}
      </div>
    </Section>
  );
}
