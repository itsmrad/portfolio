import { footer } from "@/content/footer";
import { TitleBlockField } from "@/components/layout/title-block";

import { counterStore } from "./counter-store";
import { Counter } from "./visitor-client";

/**
 * Retro visitor counter in a title-block cell. Rendered only when the counter
 * store is configured (see counter-store.ts), and hidden until a real total
 * arrives, so without JavaScript or with the store down the cell shows the
 * title block's hatch. Two columns wide so that, with the signature beside or
 * below it, the block stays a clean grid at two and four columns.
 */
export function VisitorCounter() {
  if (!counterStore()) return null;
  return (
    <TitleBlockField label="Visitors" className="invisible col-span-2">
      <Counter unit={footer.visitorsUnit} />
    </TitleBlockField>
  );
}
