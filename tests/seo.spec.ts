import { expect, test, type APIRequestContext } from "@playwright/test";

import { SITE_URL } from "./helpers";

// No phone number may ever ship: tel links, the schema.org property, an
// international number, or any run of ten or more digits.
const PHONE = /tel:|telephone|\+\d[\d\s-]{7,}\d|\b\d{10,13}\b/i;

/** The address the owner confirmed on 2026-11-13. */
const EMAIL = "itsmrad@gmail.com";

type Node = Record<string, unknown>;

async function head(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const meta = (pattern: RegExp) => html.match(pattern)?.[1]?.replaceAll("&amp;", "&");
  return {
    html,
    title: meta(/<title>([^<]*)<\/title>/),
    description: meta(/<meta name="description" content="([^"]*)"/),
    canonical: meta(/<link rel="canonical" href="([^"]*)"/),
    ogUrl: meta(/<meta property="og:url" content="([^"]*)"/),
    ogType: meta(/<meta property="og:type" content="([^"]*)"/),
    ogImage: meta(/<meta property="og:image" content="([^"]*)"/),
    twitterCard: meta(/<meta name="twitter:card" content="([^"]*)"/),
    twitterCreator: meta(/<meta name="twitter:creator" content="([^"]*)"/),
    robots: meta(/<meta name="robots" content="([^"]*)"/),
  };
}

test("home metadata: title, description, canonical on the www host, social tags", async ({ request }) => {
  const home = await head(request, "/");
  expect(home.title?.length).toBeLessThanOrEqual(60);
  expect(home.title).toContain("Anupam Das");
  expect(home.description?.length).toBeGreaterThanOrEqual(140);
  expect(home.description?.length).toBeLessThanOrEqual(160);
  expect(home.canonical).toBe(SITE_URL);
  expect(home.ogUrl).toBe(home.canonical);
  expect(home.ogType).toBe("profile");
  expect(home.twitterCard).toBe("summary_large_image");
  expect(home.twitterCreator).toBe("@AnupamIO");
  expect(home.robots ?? "").not.toContain("noindex");
  expect(home.html).toContain('<html lang="en"');
  expect(home.html).toContain(`<link rel="alternate" type="text/markdown" href="${SITE_URL}/index.md"`);
  expect(home.html).not.toContain('name="keywords"');
  expect(home.html).not.toContain("google-site-verification");
});

test("404 has its own title, no canonical and is not indexable", async ({ request }) => {
  const missing = await head(request, "/no-such-page");
  expect(missing.title).toBe("Page not found · Anupam Das");
  expect(missing.canonical).toBeUndefined();
  expect(missing.robots).toContain("noindex");
});

test("share image is a 1200x630 PNG under 300 KB", async ({ request }) => {
  const { ogImage } = await head(request, "/");
  expect(ogImage).toMatch(new RegExp(`^${SITE_URL}/opengraph-image`));
  const response = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
  expect(response.headers()["content-type"]).toBe("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200); // IHDR width
  expect(png.readUInt32BE(20)).toBe(630); // IHDR height
  expect(png.length).toBeLessThan(300 * 1024);
});

test("JSON-LD is one linked graph with no dangling references", async ({ request }) => {
  const { html } = await head(request, "/");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]!));
  const nodes: Node[] = blocks.flatMap((block) => block["@graph"]);
  const ids = new Set(nodes.map((node) => node["@id"]));
  for (const id of [`${SITE_URL}/#website`, `${SITE_URL}/#person`, `${SITE_URL}/#profile`, `${SITE_URL}/#codenaya`, `${SITE_URL}/#xflow`]) {
    expect(ids, id).toContain(id);
  }

  // Every {"@id": …} pointer must name a node defined on the page.
  const references: string[] = [];
  JSON.stringify(nodes, (_, value) => {
    if (value && typeof value === "object" && "@id" in value && Object.keys(value).length === 1) references.push(value["@id"]);
    return value;
  });
  expect(references.length).toBeGreaterThan(0);
  for (const reference of references) expect(ids, reference).toContain(reference);

  const person = nodes.find((node) => node["@type"] === "Person")!;
  expect(person).not.toHaveProperty("telephone");
  // The address the owner confirmed, and his booking page.
  expect(person.email).toBe(EMAIL);
  expect(person.contactPoint).toMatchObject({ "@type": "ContactPoint", url: "https://cal.com/itsmrad" });
  expect(JSON.stringify(person.sameAs)).not.toContain("youtube");
  // Named, with no link to the company or its repositories.
  expect(person.worksFor).toEqual({ "@type": "Organization", name: "PlanCover" });
  expect((person.alumniOf as Node[]).map((entry) => entry.name)).toEqual([
    "Bhagwan Parshuram Institute of Technology",
    "Dasgupta Maiti & Associates",
    "Syuniqe",
  ]);
  // The raw markup escapes "<" so content can never close the script tag.
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) expect(raw).not.toContain("<");
});

test("sitemap lists exactly the canonical URLs, with content dates", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls).toEqual([(await head(request, "/")).canonical]);
  const modified = xml.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  // From the content file: a plain date, not the build clock's timestamp.
  expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(xml).not.toMatch(/<priority>|<changefreq>/);
});

test("robots allows everything and points at the sitemap", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/User-Agent: \*\s+Allow: \//i);
  expect(robots).not.toMatch(/Disallow/i);
  expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("manifest is valid and its icons exist", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Anupam Das");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512", "512x512"]);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"]) expect((await request.get(path)).status(), path).toBe(200);
});

test("content rules: no phone, only the owner's email, no YouTube, PlanCover unlinked", async ({ page, request }) => {
  await page.goto("/");
  const visible = await page.locator("body").innerText();
  const structured = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
  const texts = {
    page: visible,
    "JSON-LD": structured,
    links: hrefs.join("\n"),
    "/index.md": await (await request.get("/index.md")).text(),
    "/llms.txt": await (await request.get("/llms.txt")).text(),
    // The 404 markup, minus scripts and the "telephone=no" format-detection hint.
    "/no-such-page": (await (await request.get("/no-such-page")).text()).replace(/<script.*?<\/script>|<meta name="format-detection"[^>]*>/gs, ""),
  };
  for (const [where, text] of Object.entries(texts)) {
    expect(text.match(PHONE)?.[0], `phone number in ${where}`).toBeUndefined();
    // The one address the owner confirmed, and no other.
    for (const address of text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) ?? []) expect(address, `email in ${where}`).toBe(EMAIL);
    expect(text, `YouTube in ${where}`).not.toMatch(/youtu\.?be/i);
    expect(text, `tutorial in ${where}`).not.toMatch(/tutorial/i);
    expect(text, `omitted project in ${where}`).not.toMatch(/fuel[- ]?route/i);
    // No audience claims: a number followed by stars, downloads, installs or users.
    expect(text, `audience claim in ${where}`).not.toMatch(/\d[\d,.]*\s*[k+]*\s+(github )?(stars|downloads|installs|users)\b/i);
  }
  expect(hrefs.filter((href) => /plancover/i.test(href))).toEqual([]);
  expect(visible).toContain("PlanCover");
  // The address is on the page, in the structured data and in both agent files; the 404 needs none.
  for (const where of ["page", "JSON-LD", "/index.md", "/llms.txt"] as const) expect(texts[where], where).toContain(EMAIL);
  for (const where of ["links", "JSON-LD", "/index.md", "/llms.txt"] as const) expect(texts[where], where).toContain("https://cal.com/itsmrad");
  // The resume's certificate folders stay private.
  for (const [where, text] of Object.entries(texts)) expect(text, where).not.toMatch(/drive\.google/i);
});
