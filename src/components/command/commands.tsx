"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import type { View } from "@/components/command/palette";

type PaletteProps = { view: View; onView: (view: View) => void; resume: boolean; seed: string };

const load = () => import("@/components/command/palette");

/**
 * The always-on part (budget 1 KB): single keys, `g` chords, `/` and Ctrl/Cmd+K,
 * and the clicks on anything marked `data-command-open`. The palette chunk
 * loads on first use. Key maps come from ./root, built from the registry:
 * a value is an in-page href, "click" (press the control that declares the
 * key in `aria-keyshortcuts`) or an action id the palette chunk runs.
 */
export function Commands({ keys, chords, resume }: { keys: Record<string, string>; chords: Record<string, string>; resume: boolean }) {
  const [Palette, setPalette] = useState<ComponentType<PaletteProps> | null>(null);
  const [view, setView] = useState<View>(null);
  const [seed, setSeed] = useState("");
  const isOpen = useRef(false);

  useEffect(() => {
    isOpen.current = view !== null;
  });

  useEffect(() => {
    // While the chunk loads, typed characters go to the search, not to the shortcuts.
    let typed: string | null = null;
    const open = (next: View) => {
      typed ??= "";
      load().then((module) => {
        setSeed(typed ?? "");
        typed = null;
        setPalette(() => module.Palette);
        setView(next);
      });
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

  return Palette ? <Palette view={view} onView={setView} resume={resume} seed={seed} /> : null;
}
