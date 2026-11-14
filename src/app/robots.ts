import type { MetadataRoute } from "next";

import { site } from "@/content/site";

/**
 * Every search and AI crawler is welcome: the goal is discovery and correct answers.
 * The named agents (from each vendor's crawler docs, 2026-11) get the same rules as
 * everyone else; naming them only makes the welcome explicit. The visit counter's
 * API is the one thing kept out.
 */
export const crawlers = [
  // Search engines
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "YandexBot",
  // Google Gemini and Apple Intelligence use of crawled pages (product tokens, not crawlers)
  "Google-Extended",
  "Applebot-Extended",
  // OpenAI: ChatGPT search, user-requested fetches, training
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  // Anthropic: Claude search, user-requested fetches, training
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  // Perplexity: search index, user-requested fetches
  "PerplexityBot",
  "Perplexity-User",
  // Others that feed assistants
  "Amazonbot",
  "meta-externalagent",
  "MistralAI-User",
  "CCBot",
];

const rules = { allow: "/", disallow: "/api/" };

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: crawlers, ...rules }, { userAgent: "*", ...rules }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
