/**
 * The footer's sound switch (catalog item sound-toggle-map), the twin of the
 * header button: both call `toggleSound()` (which plays the paired on/off
 * voices) and follow `subscribeSound()`, so either one updates the other.
 *
 * Props: `className` (optional, added to the button). Nothing else. Meant for
 * the title-block cell labelled "Sound":
 *
 *   <TitleBlockField label="Sound"><SoundSwitch /></TitleBlockField>
 *
 * Renders a text switch ("On" / "Off", mono, underlined like the other
 * title-block values) with `role="switch"`, `aria-checked` and the accessible
 * name "Sound effects", distinct from the header button's "Sound". The stored
 * state is painted before first paint; without JavaScript it is not shown.
 */
import { SoundToggleButton } from "@/components/sound/toggle-button";
import { hideWithoutScript, paintMuted } from "@/components/sound/toggle";
import { soundCopy } from "@/content/sound";
import { cn } from "@/lib/utils";

import styles from "./toggle.module.css";

export function SoundSwitch({ className }: { className?: string }) {
  return (
    <>
      <SoundToggleButton
        role="switch"
        data-sound-control=""
        aria-label={soundCopy.switchLabel}
        className={cn("link-underline touch-target cursor-pointer font-mono", className)}
      >
        <span className={styles.whenOn}>{soundCopy.on}</span>
        <span className={styles.whenOff}>{soundCopy.off}</span>
      </SoundToggleButton>
      <script dangerouslySetInnerHTML={{ __html: paintMuted("aria-checked") }} />
      {hideWithoutScript}
    </>
  );
}
