/**
 * The name melody (owner-added extra voice). For the hero, which owns the <h1>:
 *
 *   <h1 aria-label={site.name}><SingName>{site.name}</SingName></h1> <SingButton />
 *
 * SingName splits the name into letters that hop as their note sounds. The
 * heading's `aria-label` gives screen readers the name whole, and its text is
 * still the name once, for crawlers and copy and paste. SingButton plays it:
 * one pentatonic note per letter, 150 ms apart. Reduced motion keeps the
 * colour change and drops the hop.
 */
import { SingButtonClient } from "@/components/sound/sing-button";
import { buttonVariants } from "@/components/ui/button";
import { soundCopy } from "@/content/sound";

import styles from "./sing.module.css";

export function SingName({ children }: { children: string }) {
  return (
    <span data-sing-name>
      {[...children].map((letter, i) =>
        letter === " " ? (
          " "
        ) : (
          <span key={i} data-letter className={styles.letter}>
            {letter}
          </span>
        ),
      )}
    </span>
  );
}

export function SingButton({ className }: { className?: string }) {
  return (
    <SingButtonClient
      data-slot="button"
      data-js=""
      aria-label={soundCopy.singName}
      title={soundCopy.singName}
      className={buttonVariants({ variant: "ghost", size: "icon-sm", className })}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
      </svg>
    </SingButtonClient>
  );
}
