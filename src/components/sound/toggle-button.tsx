"use client";

import { useSyncExternalStore } from "react";

import { soundOn, subscribeSound, toggleSound } from "@/lib/sound";

/** The client half of the mute button: pressed state and handler only. */
export function SoundToggleButton(props: React.ComponentProps<"button">) {
  // The server cannot know the stored choice; the inline script has already painted it.
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return <button type="button" {...props} aria-pressed={on} suppressHydrationWarning onClick={toggleSound} />;
}
