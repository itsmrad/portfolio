/**
 * The name melody (owner-added extra voice). For the hero, which owns the <h1>:
 *
 *   <h1><SingName>{site.name}</SingName></h1> <SingButton />
 *
 * SingName splits the name into letters that hop as their note sounds; screen
 * readers get the name whole. SingButton plays it: one pentatonic note per
 * letter, 150 ms apart. Reduced motion keeps the colour change and drops the hop.
 */
import { SingButtonClient } from "@/components/sound/sing-button";
import { buttonVariants } from "@/components/ui/button";
import { soundCopy } from "@/content/site";

import styles from "./sing.module.css";

export function SingName({ children }: { children: string }) {
  return (
    <span data-sing-name>
      <span className="sr-only">{children}</span>
      <span aria-hidden>
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
    </span>
  );
}

export function SingButton({ className }: { className?: string }) {
  return (
    <SingButtonClient
      aria-label={soundCopy.singName}
      title={soundCopy.singName}
      className={buttonVariants({ variant: "ghost", size: "icon-sm", className })}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </SingButtonClient>
  );
}
