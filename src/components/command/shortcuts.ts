/**
 * The action registry, as plain data (command branch).
 *
 * One list drives the palette rows, the single-key shortcuts, the `g` then key
 * jumps and the shortcut list, so a shortcut can never be shown without
 * working. Derived from the content file. `./root` turns it into the small key
 * map the always-on listener gets, so the listener never imports this file.
 *
 * Reserved keys: a/e/w (header nav, from content), d theme, m mute (calls
 * toggleSound from lib/sound), r resume,
 * c copy email, g chord prefix, ? shortcut list, / and Ctrl/Cmd+K palette.
 * Shift+R is left free for the hot-reload easter egg.
 */
import { commandCopy as copy, pageIndex } from "@/content/command";
import { nav, projects, site, socials } from "@/content/site";

// `calUrl` is added to `site` by the home branch; read it optionally so this file builds before and after.
const { calUrl } = site as typeof site & { calUrl?: string | null };

export type Action = {
  id: string;
  label: string;
  group: "Navigate" | "Projects" | "Links" | "General" | "Preferences";
  /** Icon name, resolved by the palette. */
  icon: string;
  /** Single key, works anywhere outside a text field. */
  key?: string;
  /** Second key of a `g` then key jump. */
  chord?: string;
  /** Muted text at the end of the row. */
  hint?: string;
  keywords?: string;
  href?: string;
  external?: boolean;
  /** File name for a download. */
  download?: string;
  /** Performed by clicking the page control that declares `aria-keyshortcuts={key}`. */
  control?: boolean;
};

const navKey = new Map<string, string>(nav.map((item) => [item.href, item.key]));

/** In-page link for a section; Home goes to the very top, above the hero's own margin. */
export const sectionHref = (id: string) => (id === "top" ? "/#" : `/#${id}`);

export const actions: Action[] = [
  ...pageIndex.map((section) => ({
    id: `section-${section.id}`,
    label: section.label,
    group: "Navigate" as const,
    icon: section.id,
    key: navKey.get(`/#${section.id}`),
    chord: section.chord,
    href: sectionHref(section.id),
  })),
  ...projects.flatMap((project) => [
    {
      id: `project-${project.slug}`,
      label: project.name,
      group: "Projects" as const,
      icon: "project",
      hint: project.statusLabel,
      keywords: project.tagline,
      href: `/#${project.slug}`,
    },
    ...(project.url
      ? [
          {
            id: `project-${project.slug}-site`,
            label: new URL(project.url).hostname,
            group: "Projects" as const,
            icon: "globe",
            keywords: `${project.name} website live`,
            href: project.url,
            external: true,
          },
        ]
      : []),
  ]),
  ...socials.map((social) => ({
    id: `social-${social.label.toLowerCase()}`,
    label: social.label,
    group: "Links" as const,
    icon: social.label.toLowerCase(),
    hint: social.handle,
    keywords: "social profile",
    href: social.href,
    external: true,
  })),
  { id: "llms", label: copy.llms, group: "Links", icon: "file", keywords: "agents ai plain text markdown", href: "/llms.txt", external: true },
  {
    id: "resume",
    label: copy.resume,
    group: "General",
    icon: "download",
    key: "r",
    keywords: "cv pdf",
    href: site.resume.pdf,
    download: site.resume.fileName,
  },
  ...(calUrl
    ? [{ id: "call", label: copy.call, group: "General" as const, icon: "calendar", keywords: "meeting schedule chat interview hire", href: calUrl, external: true }]
    : []),
  ...(site.email
    ? [{ id: "copy-email", label: copy.copyEmail, group: "General" as const, icon: "mail", key: "c", hint: site.email, keywords: "contact address" }]
    : []),
  { id: "copy-link", label: copy.copyLink, group: "General", icon: "link", keywords: "url share address" },
  { id: "shortcuts", label: copy.shortcuts, group: "General", icon: "keyboard", key: "?", keywords: "keys hotkeys help" },
  { id: "theme", label: copy.theme, group: "Preferences", icon: "theme", key: "d", keywords: "dark light mode appearance", control: true },
  { id: "sound", label: copy.sound, group: "Preferences", icon: "sound", key: "m", keywords: "mute audio volume" },
];
