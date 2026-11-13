import type { Metadata } from "next";

import { projects, seo, site, socials, xHandle, type Project } from "@/content/site";

const abs = (path: string) => new URL(path, site.url).toString();
const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;

/** Site-wide defaults, set once in the root layout. Canonicals are per page. */
export const baseMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: seo.title, template: `%s · ${site.name}` },
  description: seo.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  formatDetection: { telephone: false, email: false, address: false },
  twitter: { card: "summary_large_image", creator: xHandle, site: xHandle },
  ...(site.googleVerification ? { verification: { google: site.googleVerification } } : {}),
};

/** Metadata for the one indexable page: absolute canonical on the www host, og:url equal to it. */
export function homeMetadata(): Metadata {
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: site.url, types: { "text/markdown": abs("/index.md") } },
    openGraph: {
      type: "profile",
      url: site.url,
      siteName: site.name,
      locale: "en_US",
      title: seo.title,
      description: seo.description,
      firstName: site.givenName,
      lastName: site.familyName,
      username: site.handle,
    },
  };
}

function softwareApplication(project: Project) {
  return {
    "@type": project.schema,
    "@id": `${site.url}/#${project.slug}`,
    name: project.name,
    description: project.description,
    url: project.url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: project.os ?? "Any (web browser)",
    author: { "@id": personId },
    ...(project.repo && { sameAs: project.repo }),
    ...(project.version && { softwareVersion: project.version }),
    ...(project.license && { license: `https://spdx.org/licenses/${project.license}.html` }),
    ...(project.screenshots[0] && { screenshot: abs(project.screenshots[0].src.src) }),
    ...(project.free && { offers: { "@type": "Offer", price: 0, priceCurrency: "USD" } }),
  };
}

/** WebSite + Person: rendered by the root layout on every page. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: site.name,
        url: site.url,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: site.name,
        givenName: site.givenName,
        familyName: site.familyName,
        alternateName: site.handle,
        url: site.url,
        image: abs(site.avatar.src.src),
        description: seo.description,
        jobTitle: site.role,
        worksFor: { "@type": "Organization", name: "Plancover" },
        knowsAbout: seo.knowsAbout,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.location.locality,
          addressCountry: site.location.country,
        },
        sameAs: socials.map((social) => social.href),
        ...(site.email && { email: site.email }),
        // Never add `telephone`.
      },
    ],
  };
}

/** ProfilePage + the featured projects: rendered by the home page. */
export function homeGraph() {
  const featured = projects.filter((project) => project.featured);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${site.url}/#profile`,
        url: site.url,
        name: seo.title,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
        about: featured.map((project) => ({ "@id": `${site.url}/#${project.slug}` })),
        dateCreated: site.created,
        dateModified: site.updated,
      },
      ...featured.map(softwareApplication),
    ],
  };
}

/** Serialise for an inline script; `<` is escaped so content can never close the tag. */
export function jsonLd(graph: object) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
