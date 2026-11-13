import { site } from "@/content/site";
import { pageMarkdown } from "@/lib/markdown";

export const dynamic = "force-static";

/** The Markdown twin of the page, served at /index.md by a rewrite. The Link header keeps search engines on the HTML original. */
export function GET() {
  return new Response(pageMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Link: `<${site.url}>; rel="canonical"`,
    },
  });
}
