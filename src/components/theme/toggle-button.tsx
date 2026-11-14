"use client";

import { play } from "@/lib/sound";
import { toggleTheme } from "@/lib/theme";

import styles from "./theme.module.css";

const VARS = ["--theme-x", "--theme-y", "--theme-r"];
/** The reveal in flight, if any. */
let current: ViewTransition | null = null;

/**
 * The client half of the theme toggle: the new theme grows as a circle from the
 * button's centre over the old one (View Transitions). Without the API, or
 * with reduced motion, it switches at once. `d` presses this button.
 *
 * A reveal never holds the toggle: a second press finishes the first at once
 * and switches back without a reveal (a new snapshot of a half-drawn circle
 * would freeze it), and a resize or a reveal that has not ended within a
 * second is skipped, since a browser can otherwise stall the transition for
 * seconds with the page frozen on its snapshot.
 */
export function ToggleButton(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        const root = document.documentElement;
        play("toggle");
        if (current) {
          current.skipTransition();
          // The first press's switch has to land before this one undoes it.
          current.updateCallbackDone.then(toggleTheme, toggleTheme);
          return;
        }
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
        const transition = (current = document.startViewTransition(toggleTheme));
        const done = () => {
          clearTimeout(timer);
          removeEventListener("resize", skip);
          if (current === transition) current = null;
          root.classList.remove(styles.switching!);
          VARS.forEach((name) => root.style.removeProperty(name));
        };
        const skip = () => transition.skipTransition();
        // The reveal takes 0.52 s; past a second, skip it and release the toggle whatever the browser does.
        const timer = setTimeout(() => (skip(), done()), 1000);
        addEventListener("resize", skip);
        // A skipped transition still switches the theme; it only rejects `ready`.
        transition.ready.catch(() => {});
        transition.finished.finally(done).catch(() => {});
      }}
    />
  );
}
