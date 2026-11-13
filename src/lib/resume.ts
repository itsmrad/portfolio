import { existsSync } from "node:fs";
import path from "node:path";

import { site } from "@/content/site";

/** The resume PDF path, or null while the file has not been added to /public. Server only. */
export function resumePdf(): string | null {
  return existsSync(path.join(process.cwd(), "public", site.resume.pdf)) ? site.resume.pdf : null;
}
