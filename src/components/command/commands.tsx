"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import { toggleSound } from "@/lib/sound";
import type { View } from "@/components/command/palette";

type PaletteProps = { view: View; onView: (view: View) => void; resume: boolean; take: () => string };

const load = () => import("@/components/command/palette");

// From an open request until the palette's input has focus, typed characters
// are kept here for its search instead of reaching the shortcuts.
let typed: string | null = null;
const take = () => {
  const text = typed ?? "";
  typed = null;
  return text;
};

/**
 * The always-on part (budget 1 KB): single keys, `g` chords, `/` and Ctrl/Cmd+K,
 * and the clicks on anything marked `data-command-open`. The palette chunk
 * loads on first use. Key maps come from ./root, built from the registry:
 * a value is an in-page href, "sound" (toggleSound), "click" (press the
 * control that declares the key in `aria-keyshortcuts`: the theme toggle, so
 * `d` gets the reveal from the button) or an action id the palette chunk runs.
 */
export function Commands({ keys, chords, resume }: { keys: Record<string, string>; chords: Record<string, string>; resume: boolean }) {
  const [Palette, setPalette] = useState<ComponentType<PaletteProps> | null>(null);
  const [view, setView] = useState<View>(null);
  const isOpen = useRef(false);

  useEffect(() => {
    isOpen.current = view !== null;
  });

  useEffect(() => {
    const open = (next: View) => {
      typed ??= "";
      load().then(
        (module) => {
          setPalette(() => module.Palette);
          setView(next);
        },
        // Offline or a failed deploy: give the keys back rather than swallow them.
        () => (typed = null),
      );
    };
    if (/Mac|iP/.test(navigator.platform)) document.documentElement.dataset.platform = "mac";

    let chordUntil = 0;
    const onKey = (event: KeyboardEvent) => {
      const { key, target } = event;
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen.current) setView(null);
        else open("");
        return;
      }
      if (typed !== null && key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        typed += key;
        return;
      }
      const element = target as HTMLElement;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        element.isContentEditable ||
        element.closest?.("input,textarea,select,dialog")
      ) {
        return;
      }
      const value = Date.now() < chordUntil ? chords[key] : key === "/" ? "" : keys[key];
      chordUntil = key === "g" && !keys.g ? Date.now() + 1000 : 0;
      if (chordUntil) return event.preventDefault();
      if (value === undefined) return;
      event.preventDefault();
      if (value === "" || value === "shortcuts") open(value);
      else if (value[0] === "/") location.assign(value);
      else if (value === "sound") toggleSound();
      else if (value === "click") document.querySelector<HTMLElement>(`[aria-keyshortcuts="${key}"]`)?.click();
      else load().then((module) => module.run(value));
    };

    const onClick = (event: MouseEvent) => {
      const element = event.target as Element;
      if (element.closest?.("[data-command-open]")) open("");
      // The phone dock's menu is a native popover: close it once a link in it is followed.
      if (element.closest?.("#dock-menu a")) document.getElementById("dock-menu")?.hidePopover();
    };
    // Fetch the chunk as soon as the pointer or focus reaches an opener.
    const warm = (event: Event) => (event.target as Element).closest?.("[data-command-open]") && load();

    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    document.addEventListener("pointerover", warm);
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
    };
  }, [keys, chords]);

  return Palette ? <Palette view={view} onView={setView} resume={resume} take={take} /> : null;
}
