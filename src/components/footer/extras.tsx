/**
 * The footer extras, mounted by the footer shell (components/layout/footer.tsx).
 * Each lives in its own file; the export names are the slot contract.
 *
 * - <StatusStrip />: live status strip above the title block.
 * - <VisitorCounter />: the "Visitors" title-block cell (needs the counter store, see counter-store.ts).
 * - <Signature />: the "Approved by" title-block cell.
 * - <Wordmark />: the full-width hatched wordmark under the title block.
 * - <FinaleToy />: the globe, the last thing on the page.
 *
 * Every extra reserves its size in CSS and lazy-loads what is interactive, so
 * none can shift the layout when it hydrates.
 */
export { FinaleToy } from "./finale-toy";
export { Signature } from "./signature";
export { StatusStrip } from "./status-strip";
export { VisitorCounter } from "./visitor-counter";
export { Wordmark } from "./wordmark";
