"use client";

import { haptic, play } from "@/lib/sound";
import { toggleTheme } from "@/lib/theme";

import styles from "./theme.module.css";

/**
 * The client half of the theme toggle: the new theme grows as a circle from the
 * button's centre over the old one (View Transitions). Without the API, or
 * with reduced motion, it switches at once. `d` presses this button.
 */
export function ToggleButton(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        const root = document.documentElement;
        // A second press while the circle is still growing would snapshot a half-drawn page.
        if (root.classList.contains(styles.switching!)) return;
        play("toggle");
        haptic();
        if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
          toggleTheme();
          return;
        }
        const box = event.currentTarget.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.style.setProperty("--theme-x", `${x}px`);
        root.style.setProperty("--theme-y", `${y}px`);
        root.style.setProperty("--theme-r", `${Math.ceil(radius)}px`);
        root.classList.add(styles.switching!);
        const transition = document.startViewTransition(toggleTheme);
        // A skipped transition (tab hidden, window resized) still switches the theme; it only rejects `ready`.
        transition.ready.catch(() => {});
        transition.finished
          .finally(() => {
            root.classList.remove(styles.switching!);
            for (const name of ["--theme-x", "--theme-y", "--theme-r"]) root.style.removeProperty(name);
          })
          .catch(() => {});
      }}
    />
  );
}
