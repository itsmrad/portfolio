/**
 * The header's mute button: a 32px ghost icon button with `aria-pressed`
 * (pressed = sound on). This server half renders the classes, the icon and a
 * tiny inline script that paints a stored "off" before first paint; the client
 * half (toggle-button.tsx) holds only the handler and the pressed state.
 * The `m` key calls the same `toggleSound()` from lib/sound.
 */
import { SoundToggleButton } from "@/components/sound/toggle-button";
import { buttonVariants } from "@/components/ui/button";

import styles from "./toggle.module.css";

/** Runs right after a sound control is parsed: the stored "off" on <html> and on the control before first paint. */
export const paintMuted = (attribute: "aria-pressed" | "aria-checked") =>
  `try{if(localStorage.getItem("sound")==="off"){document.documentElement.dataset.sound="off";document.currentScript.previousElementSibling.setAttribute("${attribute}","false")}}catch{}`;

/** Without JavaScript a sound control would do nothing, so it is not shown. */
export const hideWithoutScript = <noscript><style>{"[data-sound-control]{display:none!important}"}</style></noscript>;

export function SoundToggle() {
  return (
    <>
      <SoundToggleButton
        data-slot="button"
        data-sound-control=""
        aria-label="Sound"
        aria-keyshortcuts="m"
        title="Sound (M)"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="overflow-visible"
        >
          <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
          <path className={styles.wave} d="M15.5 9a5 5 0 0 1 0 6" />
          <path className={`${styles.wave} ${styles.far}`} d="M18.4 6.3a9 9 0 0 1 0 11.4" />
          <path className={styles.mute} d="m16 9 6 6m0-6-6 6" />
        </svg>
      </SoundToggleButton>
      <script dangerouslySetInnerHTML={{ __html: paintMuted("aria-pressed") }} />
      {hideWithoutScript}
    </>
  );
}
