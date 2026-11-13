"use client";

import { useSyncExternalStore } from "react";

import { soundOn, subscribeSound, toggleSound } from "@/lib/sound";

/**
 * The client half of the sound controls: state and handler only. A button with
 * `role="switch"` reports its state as `aria-checked`, any other as `aria-pressed`.
 */
export function SoundToggleButton(props: React.ComponentProps<"button">) {
  // The server cannot know the stored choice; the inline script has already painted it.
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  const state = props.role === "switch" ? { "aria-checked": on } : { "aria-pressed": on };
  return <button type="button" {...props} {...state} suppressHydrationWarning onClick={toggleSound} />;
}
