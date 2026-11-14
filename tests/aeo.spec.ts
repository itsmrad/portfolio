import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import type { NextConfig } from "next";

import { SITE_URL } from "./helpers";

type Node = Record<string, unknown>;

async function graph(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((block) => JSON.parse(block)["@graph"] as Node[]);
}

const byType = (nodes: Node[], type: string) => nodes.find((node) => node["@type"] === type)!;

/** The visible questions and answers, in order. */
async function visibleFaq(page: Page) {
  return page.locator("#faq h3").evaluateAll((headings) =>
    headings.map((h3) => ({ id: h3.id, question: h3.textContent!.trim(), answer: h3.nextElementSibling!.textContent!.trim() })),
  );
}

test.describe("answer content", () => {
  test("the FAQ is visible, quotable and mirrored exactly by FAQPage data", async ({ page }) => {
    await page.goto("/");
    const faq = await visibleFaq(page);
    expect(faq.length).toBeGreaterThanOrEqual(8);
    for (const item of faq) {
      await expect(page.locator(`#${item.id}`)).toBeVisible();
      expect(item.id).toMatch(/^faq-[a-z]+$/);
      expect(item.question).toMatch(/\?$/);
      // Quotable alone: names him, one or two sentences.
      expect(item.answer, item.question).toContain("Anupam");
      expect(item.answer.split(/(?<=[.!?])\s+(?=[A-Z])/).length, item.question).toBeLessThanOrEqual(2);
    }
    const topics = faq.map((item) => item.question).join(" ");
    for (const topic of ["Who is", "build", "Codenaya", "xflow", "stack", "based", "hire", "contact"]) expect(topics).toContain(topic);

    const data = byType(await graph(page), "FAQPage");
    expect(data.isPartOf).toEqual({ "@id": `${SITE_URL}/#website` });
    expect((data.mainEntity as Node[]).map((q) => ({ question: q.name, answer: (q.acceptedAnswer as Node).text }))).toEqual(
      faq.map(({ question, answer }) => ({ question, answer })),
    );
  });

  test("every number and address in the answers is stated elsewhere on the page", async ({ page }) => {
    await page.goto("/");
    const faq = await visibleFaq(page);
    // The rest of the page and its Markdown copy, without the FAQ itself.
    const rest =
      (await page.locator("main").evaluate((main) => {
        const copy = main.cloneNode(true) as HTMLElement;
        copy.querySelector("#faq")?.remove();
        return copy.innerText;
      })) + (await (await page.request.get("/index.md")).text()).replace(/## \[Questions, answered\][\s\S]*?(?=## \[Contact\])/, "");
    for (const { question, answer } of faq) {
      for (const number of answer.match(/\d[\d,.]*\d|\d/g) ?? []) expect(rest, `${number} in "${question}"`).toContain(number);
      for (const email of answer.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) ?? []) expect(rest).toContain(email);
      for (const url of answer.match(/https:\/\/[^\s;,]+[^\s;,.]/g) ?? []) expect(rest, url).toContain(url);
    }
  });

  test("the page opens with a definition: name, role and city in one sentence", async ({ page }) => {
    await page.goto("/");
    // Right after the greeting, the first paragraph of prose.
    const paragraphs = await page.locator("#about p:not(.eyebrow)").allInnerTexts();
    expect(paragraphs[1]).toMatch(/^I'm Anupam Das, a software and AI engineer in New Delhi, India/);
    expect((await visibleFaq(page))[0]!.answer).toMatch(/^Anupam Das is a software engineer and AI\/LLM engineer based in New Delhi, India\./);
  });

  test("headings read as plain text: no counters or glyphs inside them", async ({ page }) => {
    await page.goto("/");
    const headings = await page.locator("h1, h2, h3, h4").evaluateAll((nodes) => nodes.map((node) => node.textContent!.trim()));
    for (const heading of headings) expect(heading, heading).not.toMatch(/\d{2}$|^\d{2}|[↗↘]/);
    expect(headings).toContain("Experience");
    expect(headings).toContain("Selected work");
    expect(headings).toContain("Codenaya");
    // The counters are still drawn, from the attribute.
    await expect(page.locator("#experience-title")).toHaveAttribute("data-count", "03");
  });
});

test("R20: the full name only where it identifies him; elsewhere he is Anupam", async ({ page, request }) => {
  const FULL = /Anupam Das(?!-Resume)/g;
  await page.goto("/");
  // Visible text and labels: About's first sentence, the first question and the start of its answer,
  // the h1's label, the signature and the copyright line.
  const places = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      if (!text.parentElement!.closest("script, style") && text.textContent!.includes("Anupam Das")) out.push(text.textContent!.trim());
    }
    for (const element of document.body.querySelectorAll("*"))
      for (const attribute of element.attributes) if (attribute.value.includes("Anupam Das")) out.push(`[${attribute.name}] ${attribute.value}`);
    return out;
  });
  expect(places.map((place) => place.replace(/^(.{0,40}).*$/s, "$1"))).toEqual([
    "I'm Anupam Das, a software and AI engine",
    "Who is Anupam Das?",
    "Anupam Das is a software engineer and AI",
    "Anupam Das",
    "Anupam Das",
    "[aria-label] Anupam Das",
  ]);
  await expect(page.locator("#faq-who + p")).toHaveText(/^Anupam Das is /);
  await expect(page.locator("footer li").filter({ hasText: "©" })).toContainText("Anupam Das");

  // The text files: the title and one defining sentence (llms.txt); the Markdown copies mirror the page.
  expect((await (await request.get("/llms.txt")).text()).match(FULL)).toHaveLength(2);
  for (const path of ["/index.md", "/llms-full.txt"]) {
    const text = await (await request.get(path)).text();
    expect(text.match(FULL), path).toHaveLength(4);
    expect(text, path).toMatch(/^# Anupam Das\n/);
  }
  // Names, titles and meta keep the full name.
  const html = await (await request.get("/")).text();
  expect(html).toContain("<title>Anupam Das — ");
  expect(html).toMatch(/<meta property="og:title" content="Anupam Das/);
});

test.describe("entity", () => {
  test("Person and ProfilePage agree with the visible page", async ({ page, request }) => {
    await page.goto("/");
    const nodes = await graph(page);
    const person = byType(nodes, "Person");
    const profile = byType(nodes, "ProfilePage");
    const visible = await page.locator("body").innerText();
    const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));

    await expect(page.locator("h1")).toHaveAttribute("aria-label", person.name as string);
    expect(person.alternateName).toEqual(["itsmrad", "AnupamIO"]);
    for (const title of person.jobTitle as string[]) expect(visible.toLowerCase()).toContain(title.toLowerCase());
    expect(visible).toContain(person.email);
    for (const profileUrl of person.sameAs as string[]) expect(hrefs).toContain(profileUrl);
    for (const topic of person.knowsAbout as string[]) expect(visible.toLowerCase(), topic).toContain(topic.toLowerCase());
    expect(visible).toContain((person.address as Node).addressLocality);

    // A stable portrait URL that really serves the photo.
    expect(person.image).toBe(`${SITE_URL}/anupam-das.jpg`);
    const portrait = await request.get("/anupam-das.jpg");
    expect(portrait.headers()["content-type"]).toBe("image/jpeg");

    // ProfilePage: Google's required mainEntity and recommended dates; the visible
    // "updated" line, dateModified and the sitemap's lastmod are one date.
    expect(profile.mainEntity).toEqual({ "@id": `${SITE_URL}/#person` });
    const updated = await page.locator("#faq time").getAttribute("datetime");
    expect(profile.dateModified).toBe(updated);
    expect(await (await request.get("/sitemap.xml")).text()).toContain(`<lastmod>${updated}</lastmod>`);

    // The site name Google shows: one WebSite node on the home page with name and url.
    const website = nodes.filter((node) => node["@type"] === "WebSite");
    expect(website).toHaveLength(1);
    expect(website[0]).toMatchObject({ name: "Anupam Das", url: SITE_URL });

    // Projects: typed, authored by him, named and linked on the page.
    for (const slug of ["codenaya", "xflow"]) {
      const project = nodes.find((node) => node["@id"] === `${SITE_URL}/#${slug}`)!;
      expect(project.author).toEqual({ "@id": `${SITE_URL}/#person` });
      await expect(page.locator(`#${slug}-title`)).toContainText(project.name as string);
      expect(hrefs).toContain(new URL(project.url as string).href);
      expect(project).not.toHaveProperty("aggregateRating");
      expect(project).not.toHaveProperty("review");
    }
  });
});

test.describe("agent files", () => {
  test("llms.txt follows the convention and every fragment it links exists", async ({ page, request }) => {
    const llms = await (await request.get("/llms.txt")).text();
    expect(llms).toMatch(/^# Anupam Das\n\n> Anupam Das is a software engineer/);
    for (const section of ["## Key facts", "## Profile", "## Projects", "## Questions", "## Profiles", "## Optional"]) expect(llms).toContain(section);
    for (const file of ["index.md", "llms-full.txt"]) expect(llms).toContain(`${SITE_URL}/${file}`);

    await page.goto("/");
    const fragments = [...llms.matchAll(new RegExp(`${SITE_URL.replaceAll(".", "\\.")}/#([\\w-]+)`, "g"))].map((match) => match[1]!);
    for (const id of ["codenaya", "xflow", "faq", "faq-who", "contact"]) expect(fragments).toContain(id);
    for (const id of new Set(fragments)) expect(await page.locator(`[id="${id}"]`).count(), `#${id}`).toBe(1);
  });

  test("llms-full.txt and index.md are the whole page, canonical to it", async ({ request }) => {
    const full = await request.get("/llms-full.txt");
    const markdown = await request.get("/index.md");
    expect(full.headers()["content-type"]).toBe("text/plain; charset=utf-8");
    for (const response of [full, markdown]) expect(response.headers().link).toBe(`<${SITE_URL}>; rel="canonical"`);
    const text = await full.text();
    expect(text).toBe(await markdown.text());
    for (const heading of ["About", "Experience", "Selected work", "Stack", "Education", "Questions, answered", "Contact"])
      expect(text, heading).toMatch(new RegExp(`^## \\[${heading}\\]\\(${SITE_URL.replaceAll(".", "\\.")}/#`, "m"));
    expect(text).toContain("Last updated: ");
    expect(text).toContain("### What is xflow?");
  });
});

test.describe("indexing", () => {
  test("only production is indexable: previews, the 404 and the resume PDF are not", async ({ request }) => {
    // This build is not a preview: no blanket noindex.
    expect((await request.get("/")).headers()["x-robots-tag"]).toBeUndefined();
    expect((await request.get("/Anupam-Das-Resume.pdf")).headers()["x-robots-tag"]).toBe("noindex");
    expect(await (await request.get("/no-such-page")).text()).toMatch(/<meta name="robots" content="noindex/);

    // A Vercel preview build sends noindex on every path.
    const before = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    try {
      // The test runner may wrap the config's default export once more.
      const loaded = (await import("../next.config")).default as NextConfig | { default: NextConfig };
      const config = "default" in loaded ? loaded.default : loaded;
      const all = (await config.headers!()).find((rule) => rule.source === "/:path*")!;
      expect(all.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    } finally {
      if (before === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = before;
    }
  });

  test("/resume redirects to the PDF", async ({ request }) => {
    const response = await request.get("/resume", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/Anupam-Das-Resume.pdf");
  });

  test("IndexNow: the key file is served and the ping lists the sitemap's URLs", async ({ request, baseURL }) => {
    const keyFile = readdirSync("public").find((file) => /^[0-9a-f]{32}\.txt$/.test(file))!;
    expect(keyFile).toBeDefined();
    const key = keyFile.slice(0, -4);
    expect((await (await request.get(`/${keyFile}`)).text()).trim()).toBe(key);

    const body = JSON.parse(execFileSync(process.execPath, ["scripts/indexnow.mjs", "--dry-run", baseURL!]).toString());
    expect(body).toEqual({ host: "www.anupamdas.me", key, keyLocation: `${SITE_URL}/${keyFile}`, urlList: [SITE_URL] });
  });

  test("verification tags render nothing until the owner supplies a token", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toContain("google-site-verification");
    expect(html).not.toContain("msvalidate.01");
  });
});
