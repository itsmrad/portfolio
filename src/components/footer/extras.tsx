/**
 * SLOTS (footer extras branch). Each renders nothing until filled; the footer
 * shell (components/layout/footer.tsx) already mounts them in place.
 *
 * - <StatusStrip />: above the title block. Two columns of mono, uppercase
 *   facts with scramble-in text. Server-rendered; no client request.
 * - <VisitorCounter />: a cell of the title block. Return a
 *   <TitleBlockField label="Visitors">…</TitleBlockField>. Its backend is the
 *   one dynamic route this branch also owns, `src/app/api/visit/**` (a
 *   key-value store read through `KV_REST_API_*` environment variables). The
 *   cell stays empty while those are absent, and the page itself stays static:
 *   the count is fetched by the client, never rendered on the server.
 * - <Signature />: the "Approved by" cell. Return a
 *   <TitleBlockField label="Approved by" className="col-span-2">…</TitleBlockField>.
 * - <Wordmark />: the full-width hatched wordmark under the title block.
 * - <FinaleToy />: the last thing on the page.
 *
 * Contract: split this file into one file per extra if that helps; keep these
 * five export names. Cells that stay empty show the title block's hatch, so a
 * missing extra never leaves a hole. Reserve each extra's size in CSS so it
 * cannot shift the layout when it hydrates; lazy-load anything interactive
 * when it scrolls into view.
 */
export function StatusStrip() {
  return null;
}

export function VisitorCounter() {
  return null;
}

export function Signature() {
  return null;
}

export function Wordmark() {
  return null;
}

export function FinaleToy() {
  return null;
}
