import type { MetadataRoute } from "next";

import { site } from "@/content/site";

/** Everything is open, AI crawlers included: the goal is discovery. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${site.url}/sitemap.xml` };
}
