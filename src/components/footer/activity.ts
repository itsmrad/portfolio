import { building, projects, site } from "@/content/site";

export type LatestWork = { name: string; date: string };

const EVENTS = `https://api.github.com/users/${site.handle}/events/public?per_page=100`;

/**
 * Only repos the content file already names may appear, so the strip can never
 * surface something the owner chose to leave off the site.
 */
const known = [
  ...projects.map((project) => ({ name: project.name, href: project.repo })),
  ...building.map((entry) => ({ name: entry.name, href: entry.repo })),
  // This site's own repo, named by its domain; it is matched here, never linked.
  { name: site.domain, href: `https://github.com/${site.handle}/portfolio` },
].filter((repo): repo is { name: string; href: string } => Boolean(repo.href));

/** Newest dated entry in the content file: true, if older than live data. */
function fromContent(): LatestWork {
  const dated = [
    ...projects.map((project) => ({ name: project.name, date: project.updated })),
    ...building.map((entry) => ({ name: entry.name, date: entry.updated })),
  ];
  return dated.reduce((latest, entry) => (entry.date > latest.date ? entry : latest));
}

/**
 * The owner's latest public GitHub activity on a repo the site features.
 * Fetched at build and revalidated daily; any failure falls back silently.
 */
export async function latestWork(): Promise<LatestWork> {
  try {
    const response = await fetch(EVENTS, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": site.domain },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return fromContent();
    const events = (await response.json()) as { repo?: { name?: string }; created_at?: string }[];
    let latest: LatestWork | undefined;
    for (const event of events) {
      const repo = known.find((entry) => entry.href === `https://github.com/${event.repo?.name}`);
      const date = event.created_at?.slice(0, 10);
      if (repo && date && (!latest || date > latest.date)) latest = { name: repo.name, date };
    }
    return latest ?? fromContent();
  } catch {
    return fromContent();
  }
}
