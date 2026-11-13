import { footer } from "@/content/footer";
import { TitleBlockField } from "@/components/layout/title-block";

import { counterStore } from "./counter-store";
import { Counter } from "./visitor-client";

/**
 * Retro visitor counter in a title-block cell. Rendered only when the counter
 * store is configured (see counter-store.ts); otherwise, and without
 * JavaScript, the cell is left to the title block's hatch.
 */
export function VisitorCounter() {
  if (!counterStore()) return null;
  return (
    <TitleBlockField label="Visitors" className="[@media(scripting:none)]:invisible">
      <Counter unit={footer.visitorsUnit} />
    </TitleBlockField>
  );
}
