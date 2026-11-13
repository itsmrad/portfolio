import type { MetadataRoute } from "next";

import { site } from "@/content/site";

/** One indexable page. lastModified comes from the content file, never from the build clock. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url, lastModified: site.updated }];
}
