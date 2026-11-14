"use client";

import { useEffect, useState, type ComponentType } from "react";

import { play, toggleSound } from "@/lib/sound";
import type { PaletteProps, View } from "@/components/command/palette";

import keyStyles from "./keys.module.css";

const load = () => import("@/components/command/palette");
const noop = () => {};

// Characters typed between an open request and the palette's input taking
// focus: kept for its search instead of reaching the shortcuts. A trailing
// newline is an Enter pressed before the palette appeared. Armed only
// while a request is in flight; every outcome (opened, failed, cancelled) clears it.
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
 *
 * Whether the palette is open is read from the <dialog> itself, never from
 * React state, which lags a close by a frame or more. `request` counts open
 * requests, so each one re-runs the palette's opening even if React state
 * looks unchanged. Single keys can be switched off (WCAG 2.1.4); Ctrl/Cmd+K
 * always works.
 */
export function Commands({ keys, chords, resume }: { keys: Record<string, string>; chords: Record<string, string>; resume: boolean }) {
  const [Palette, setPalette] = useState<ComponentType<PaletteProps> | null>(null);
  const [state, setState] = useState<{ open: boolean; view: View; request: number }>({ open: false, view: "", request: 0 });

  useEffect(() => {
    const root = document.documentElement;
    const off = keyStyles.off!;
    try {
      root.classList.toggle(off, localStorage.getItem("shortcuts") === "off");
    } catch {}
    if (/Mac|iP/.test(navigator.platform)) root.dataset.platform = "mac";

    let pending = 0;
    const open = (view: View) => {
      typed ??= "";
      const id = ++pending;
      const release = () => id === pending && (typed = null);
      // A load that fails, or hangs after an earlier failure, must not hold the keys.
      setTimeout(release, 3000);
      load().then((module) => {
        // A later request or a cancel (Escape while loading) wins.
        if (id !== pending) return;
        setPalette(() => module.Palette);
        setState(({ request }) => ({ open: true, view, request: request + 1 }));
      }, release);
    };

    let chordUntil = 0;
    const onKey = (event: KeyboardEvent) => {
      const { key, target } = event;
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === "k") {
        event.preventDefault();
        if (event.repeat) return;
        const dialog = document.querySelector<HTMLDialogElement>("dialog[data-palette][open]");
        if (dialog) dialog.close();
        else open("");
        return;
      }
      if (typed !== null && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Keep typing for the search while the chunk loads; Backspace and Escape act on it.
        if (key === "Escape") {
          // Cancel, including an opening already handed to React but not yet shown.
          typed = null;
          pending++;
          setState((current) => ({ ...current, open: false }));
        } else if (key === "Backspace") typed = typed.slice(0, -1);
        else if (key === "Enter") typed += "\n";
        else if (key.length !== 1) return;
        else typed += key;
        return event.preventDefault();
      }
      const element = target as HTMLElement;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        root.classList.contains(off) ||
        element.isContentEditable ||
        // A field in the open palette handles its own keys; focus left behind in a closed one does not count.
        (element.closest?.("input,textarea,select,dialog") && !element.closest("dialog:not([open])"))
      ) {
        return;
      }
      const value = Date.now() < chordUntil ? chords[key] : key === "/" ? "" : keys[key];
      chordUntil = key === "g" && !keys.g ? Date.now() + 1000 : 0;
      if (chordUntil) return event.preventDefault();
      if (value === undefined) return;
      event.preventDefault();
      if (value === "" || value === "shortcuts") open(value);
      else if (value[0] === "/") {
        play("key");
        location.assign(value);
      }
      else if (value === "sound") toggleSound();
      else if (value === "click") document.querySelector<HTMLElement>(`[aria-keyshortcuts="${key}"]`)?.click();
      else load().then((module) => module.run(value), noop);
    };

    const onClick = (event: MouseEvent) => {
      const element = event.target as Element;
      if (element.closest?.("[data-command-open]")) open("");
      // The phone dock's menu is a native popover: close it once a link in it is followed.
      if (element.closest?.("#dock-menu a")) document.getElementById("dock-menu")?.hidePopover();
    };
    // Fetch the chunk as soon as the pointer or focus reaches an opener.
    const warm = (event: Event) => (event.target as Element).closest?.("[data-command-open]") && load().catch(noop);

    const listening = new AbortController();
    const options = { signal: listening.signal };
    document.addEventListener("keydown", onKey, options);
    document.addEventListener("click", onClick, options);
    document.addEventListener("pointerover", warm, options);
    document.addEventListener("focusin", warm, options);
    return () => listening.abort();
  }, [keys, chords]);

  return Palette ? (
    <Palette
      {...state}
      resume={resume}
      take={take}
      onView={(view) => setState((current) => ({ ...current, view }))}
      // A close belongs to the request that opened it; a newer request queued in the same moment wins.
      onClose={(closed) => setState((current) => (current.request === closed ? { ...current, open: false } : current))}
    />
  ) : null;
}
