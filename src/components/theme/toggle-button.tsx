"use client";

import { play } from "@/lib/sound";
import { toggleTheme } from "@/lib/theme";

/** The client half of the theme toggle: a bare button, styled and filled by the server. */
export function ToggleButton(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        toggleTheme();
        play("toggle");
      }}
    />
  );
}
