/**
 * SLOT (command + theme branch): the action registry, as plain data.
 *
 * One list drives the palette rows, the single-key shortcuts and the `g` then
 * key chords, so a shortcut can never be shown without working. Derived from
 * the content file; extend the `Action` type and the list here.
 * Reserved keys: a/e/w (header nav, from content), d theme, m mute, r resume,
 * c copy email, g chord prefix, / and Ctrl/Cmd+K palette.
 */
import { nav, projects, socials } from "@/content/site";

export type Action = {
  id: string;
  label: string;
  group: "Navigate" | "Projects" | "Links" | "Preferences";
  /** Single key, shown in a <Kbd>. */
  key?: string;
  /** Where it goes. Absent for commands, which the listener handles by `id`. */
  href?: string;
  external?: boolean;
};

export const actions: Action[] = [
  ...nav.map((item) => ({
    id: `nav-${item.label}`,
    label: item.label,
    group: "Navigate" as const,
    key: item.key,
    href: item.href,
  })),
  ...projects.map((project) => ({
    id: `project-${project.slug}`,
    label: project.name,
    group: "Projects" as const,
    href: `/#${project.slug}`,
  })),
  ...socials.map((social) => ({
    id: `social-${social.label.toLowerCase()}`,
    label: `${social.label} ${social.handle}`,
    group: "Links" as const,
    href: social.href,
    external: true,
  })),
  { id: "theme", label: "Toggle theme", group: "Preferences", key: "d" },
  { id: "sound", label: "Toggle sound", group: "Preferences", key: "m" },
];
