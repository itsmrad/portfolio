"use client";

import { play, type SoundName } from "@/lib/sound";

/** The client half of the sticker sheet: a press plays the voice of the sticker under it. */
export function Press(props: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      onClick={(event) => {
        const voice = (event.target as Element).closest<HTMLElement>("[data-voice]")?.dataset.voice;
        if (voice) play(voice as SoundName);
      }}
    />
  );
}
