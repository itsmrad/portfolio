"use client";

import { play, setSound, soundOn } from "@/lib/sound";

// Steps into the engine's pentatonic scale, one per letter, wrapping for longer names.
const TUNE = [2, 3, 4, 5, 4, 3, 2, 4, 6, 5, 4, 3, 2, 1];
const STEP = 150;
let singing = false;

export function SingButtonClient(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        if (singing) return;
        singing = true;
        // Asking to hear the name is consent to sound.
        if (!soundOn()) setSound(true);
        const letters = document.querySelectorAll<HTMLElement>("[data-sing-name] [data-letter]");
        letters.forEach((letter, i) => {
          const box = letter.getBoundingClientRect();
          play("note", { index: TUNE[i % TUNE.length], delay: (i * STEP) / 1000, x: box.left + box.width / 2 });
          setTimeout(() => {
            letter.dataset.sing = "";
            setTimeout(() => delete letter.dataset.sing, 240);
          }, i * STEP);
        });
        setTimeout(() => (singing = false), letters.length * STEP);
      }}
    />
  );
}
