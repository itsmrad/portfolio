import { site } from "@/content/site";
import { pageMarkdown } from "@/lib/markdown";

export const dynamic = "force-static";

/** The whole page in one plain-text Markdown file, for agents that look for llms-full.txt. */
export function GET() {
  return new Response(pageMarkdown(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", Link: `<${site.url}>; rel="canonical"` },
  });
}
