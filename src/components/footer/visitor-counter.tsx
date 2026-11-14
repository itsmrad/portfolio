import { footer } from "@/content/footer";
import { TitleBlockField } from "@/components/layout/title-block";

import { counterStore } from "./counter-store";
import { Counter } from "./visitor-client";

/**
 * Retro visitor counter in a title-block cell, with who is here right now
 * under the total. Rendered only when the counter
 * store is configured (see counter-store.ts), and hidden until a real total
 * arrives, so without JavaScript or with the store down the cell shows the
 * title block's hatch. One column, beside the Sound cell, which is two wide
 * while this one is absent; the signature has the row below to itself.
 */
export function VisitorCounter() {
  if (!counterStore()) return null;
  return (
    <TitleBlockField label="Visitors" className="invisible">
      <Counter unit={footer.visitorsUnit} alone={footer.liveAlone} many={footer.liveMany} />
    </TitleBlockField>
  );
}
