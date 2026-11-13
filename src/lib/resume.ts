import { site } from "@/content/site";

/**
 * The resume PDF path, or null while the file has not been added to /public.
 * The list of public files is inlined by next.config.ts at build time, so the
 * answer cannot change when a page is re-rendered on the server later.
 */
export function resumePdf(): string | null {
  const files = (process.env.PUBLIC_FILES ?? "").split("\n");
  return files.includes(site.resume.pdf.slice(1)) ? site.resume.pdf : null;
}
