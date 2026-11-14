import type { Metadata } from "next";

import { faq } from "@/content/faq";
import { education, experience, projects, seo, site, socials, xHandle, type Project } from "@/content/site";

const abs = (path: string) => new URL(path, site.url).toString();
const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;

/** A copy of the portrait in /public, so the entity's image URL never changes with a rebuild. */
export const portraitUrl = abs("/anupam-das.jpg");

const google = site.googleVerification || process.env.GOOGLE_SITE_VERIFICATION;
const bing = site.bingVerification || process.env.BING_SITE_VERIFICATION;

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
  // Rendered only once the owner supplies a token (content file or env).
  ...(google || bing
    ? { verification: { ...(google ? { google } : {}), ...(bing ? { other: { "msvalidate.01": bing } } : {}) } }
    : {}),
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
    ...(project.category && { applicationSubCategory: project.category }),
    description: project.description,
    url: project.url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: project.os ?? "Any (web browser)",
    author: { "@id": personId },
    dateCreated: project.started,
    ...(project.repo && { sameAs: project.repo }),
    ...(project.version && { softwareVersion: project.version }),
    ...(project.license && { license: `https://spdx.org/licenses/${project.license}.html` }),
    ...(project.screenshots[0] && { screenshot: abs(project.screenshots[0].src.src) }),
    ...(project.free && { offers: { "@type": "Offer", price: 0, priceCurrency: "USD" } }),
  };
}

const organization = (job: (typeof experience)[number]) => ({
  "@type": "Organization",
  name: job.org,
  ...(job.url && { url: job.url }),
});

/** schema.org's Role pattern: the organisation plus the title and dates held there. */
const role = (property: "worksFor" | "alumniOf", job: (typeof experience)[number]) => ({
  "@type": "EmployeeRole",
  roleName: job.role,
  ...(job.start && { startDate: job.start }),
  ...(job.end && { endDate: job.end }),
  [property]: organization(job),
});

/** WebSite + Person: rendered by the root layout on every page. */
export function siteGraph() {
  const work = experience.filter((job) => job.kind === "work");
  const current = work.filter((job) => !job.end).map((job) => role("worksFor", job));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: site.name,
        alternateName: [site.domain, `${site.name} portfolio`],
        url: site.url,
        description: seo.description,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: site.name,
        givenName: site.givenName,
        familyName: site.familyName,
        // Every handle he uses, so engines merge the profiles into one person.
        alternateName: [...new Set(socials.map((social) => social.handle.replace(/^@/, "")))],
        url: site.url,
        image: portraitUrl,
        description: faq[0]!.answer,
        jobTitle: seo.jobTitle,
        ...(current.length > 0 && { worksFor: current.length === 1 ? current[0] : current }),
        alumniOf: [
          ...education.map((entry) => ({ "@type": "CollegeOrUniversity", name: entry.school, alternateName: entry.short })),
          ...work.filter((job) => job.end).map((job) => role("alumniOf", job)),
        ],
        knowsAbout: seo.knowsAbout,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.location.locality,
          addressCountry: site.location.country,
        },
        sameAs: socials.map((social) => social.href),
        ...(site.email && { email: site.email }),
        ...(site.calUrl && {
          contactPoint: { "@type": "ContactPoint", contactType: "Book a call", url: site.calUrl },
        }),
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
        primaryImageOfPage: portraitUrl,
        dateCreated: site.created,
        dateModified: site.updated,
      },
      ...featured.map(softwareApplication),
      // Google no longer shows FAQ rich results (2026-05-07); kept as plain, valid
      // schema.org that other engines and assistants parse. Mirrors the visible section.
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        url: `${site.url}/#faq`,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        about: { "@id": personId },
        dateModified: site.updated,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

/** Serialise for an inline script; `<` is escaped so content can never close the tag. */
export function jsonLd(graph: object) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
