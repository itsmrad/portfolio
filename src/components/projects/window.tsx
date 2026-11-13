import type { Project } from "@/content/site";
import { Img } from "@/components/ui/img";
import { cn } from "@/lib/utils";

import styles from "./projects.module.css";

/**
 * Requested width. The window renders at most 632px (104% of the 608px frame);
 * 600 makes the 2x candidate 1200w, an exact optimiser size, instead of 1920w.
 */
const WIDTH = 600;

/**
 * The card's screenshot in a mini browser window, offset inside a dotted frame
 * that links to the product. A light/dark pair shows the one matching the page
 * theme; the hidden one is lazy and display:none, so it is never fetched.
 */
export function ProjectWindow({ project }: { project: Project }) {
  const [first] = project.screenshots;
  if (!first) return null;
  const pair = project.screenshots.filter((shot) => shot.theme);
  const shots = pair.length === 2 ? pair : [first];
  return (
    <div className={styles.frame}>
      {project.url && (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          <span aria-hidden className={styles.label}>
            {new URL(project.url).host} ↗
          </span>
          <span className="sr-only">{project.name} website (opens in a new tab)</span>
          <div className={cn(styles.window, styles.offset, shots.length === 2 && styles.adaptive)}>
            <span aria-hidden className={styles.bar}>
              <i />
              <i />
              <i />
            </span>
            {shots.map((shot) => (
              <Img
                key={shot.theme ?? "only"}
                src={shot.src}
                alt={shot.alt}
                width={WIDTH}
                className={shot.theme === "dark" ? "hidden dark:block" : shot.theme === "light" ? "block dark:hidden" : "block"}
              />
            ))}
          </div>
        </a>
      )}
      {project.repo && (
        <div className={styles.icons}>
          <a href={project.repo} target="_blank" rel="noopener noreferrer" className="touch-target" title="Source on GitHub">
            <GitHubIcon />
            <span className="sr-only">{project.name} source on GitHub (opens in a new tab)</span>
          </a>
        </div>
      )}
    </div>
  );
}

/** A second product image in the same window chrome, not offset. */
export function ProjectFigure({ figure }: { figure: NonNullable<Project["figure"]> }) {
  return (
    <figure>
      <div className={cn(styles.window, "rounded-[5px]")}>
        <span aria-hidden className={styles.bar}>
          <i />
          <i />
          <i />
        </span>
        <Img src={figure.src} alt={figure.alt} width={WIDTH} className="block" />
      </div>
      <figcaption className={styles.caption}>{figure.caption}</figcaption>
    </figure>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** Each product's own mark, redrawn from its published SVG. */
export function ProjectLogo({ slug }: { slug: string }) {
  if (slug === "codenaya")
    return (
      <svg aria-hidden width="29" height="29" viewBox="0 0 120 120" className="shrink-0">
        <rect width="120" height="120" rx="28" fill="#09090B" />
        <path
          fill="#FAFAF9"
          transform="translate(10 10) scale(0.8333)"
          d="M99.4 29.2A50 50 0 1 0 99.4 90.8L82.1 77.2A28 28 0 1 1 82.1 42.8Z"
        />
        <rect x="88.3" y="48.3" width="11.7" height="23.3" rx="1.7" fill="#e8824f" />
      </svg>
    );
  if (slug === "xflow")
    return (
      <svg aria-hidden width="29" height="29" viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="7" fill="#141414" />
        <text x="5" y="21.5" fontSize="14" fontWeight="600" fill="#EDEDEC" className="font-mono">
          xf
        </text>
        <rect x="23" y="10" width="4" height="13" fill="#C6F135" />
      </svg>
    );
  return null;
}
