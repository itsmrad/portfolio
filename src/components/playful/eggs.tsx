import { useCallback, useEffect, useState, type ComponentType } from "react";

import { play } from "@/lib/sound";

import styles from "./eggs.module.css";
import type { MenuProps } from "./menu";

/**
 * Easter eggs for people who poke around. Loaded on the first input on devices
 * with a mouse (see lazy.tsx); each payoff is a further chunk fetched when summoned.
 *
 *   Konami code        exploded view of the page (again, or Esc, reassembles)
 *   typing "kitty"     the cursor cat (so does clicking its bed in the margin)
 *   Shift+R            "hot reload": the stickers and margin notes replay
 *   leaving the tab    the tab title changes until the visitor is back
 *   right-click mark   a menu to copy the header mark as SVG
 *
 * Keys are read in the capture phase and only sequences are handled, so the
 * command branch's single-key shortcuts are untouched; the two letters that
 * end the Konami code and Shift+R are swallowed so they cannot also fire a
 * shortcut. Nothing here takes focus except the menu, which gives it back.
 */
const KONAMI = "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a".split(" ");
const WORD = "kitty";
const MARK = 'header a[href="/"]';

type Data = {
  away: string;
  hotReload: string;
  explodedOn: string;
  explodedOff: string;
  menu: MenuProps["labels"];
};

/** The toast: one polite live region, so every egg is announced once and nothing steals focus. */
function toast(text: string) {
  const region = document.getElementById("playful-toast")!;
  region.textContent = text;
  region.setAttribute("data-show", "");
  clearTimeout(Number(region.dataset.timer));
  region.dataset.timer = String(setTimeout(() => region.removeAttribute("data-show"), 2200));
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function Eggs({ data }: { data: Data }) {
  const [Cat, setCat] = useState<ComponentType | null>(null);
  const [menu, setMenu] = useState<{ Menu: ComponentType<MenuProps>; mark: HTMLElement; x: number; y: number } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    const root = document.documentElement;
    const title = document.title;
    let progress = 0;
    let typed = "";

    const exploded = () => root.getAttribute("data-exploded") === "on";
    const explode = (on: boolean) => {
      if (on === exploded()) return;
      // The stylesheet is the whole effect; it arrives with the first use.
      import("./exploded.module.css").then(() => root.setAttribute("data-exploded", on ? "on" : "off"));
      play(on ? "open" : "close");
      toast(on ? data.explodedOn : data.explodedOff);
    };
    const cat = (on: boolean) => {
      if (on && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (on) import("./cat").then((module) => setCat(() => module.Cat));
      else setCat(null);
    };
    const summon = (egg: unknown) => {
      if (egg === "explode") explode(!exploded());
      if (egg === "cat") cat(!document.querySelector("[data-cat]"));
      if (egg === "reload") {
        play("success");
        toast(data.hotReload);
        dispatchEvent(new Event("playful:reload"));
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
      if (event.key === "Escape") {
        // An open dialog or menu owns Escape.
        if (document.querySelector('[role="dialog"], [role="menu"]')) return;
        explode(false);
        cat(false);
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "r" && event.shiftKey) {
        event.stopPropagation();
        summon("reload");
        return;
      }
      // A third "up" keeps the first two.
      progress = key === KONAMI[progress] ? progress + 1 : key === "ArrowUp" ? (progress === 2 ? 2 : 1) : 0;
      // Past the arrows, the letters belong to the code, not to a shortcut.
      if (progress > 8) event.stopPropagation();
      if (progress === KONAMI.length) {
        progress = 0;
        summon("explode");
      }
      typed = (typed + key).slice(-WORD.length);
      if (typed === WORD) summon("cat");
    };
    const onSummon = (event: Event) => summon((event as CustomEvent).detail);
    const onVisibility = () => (document.title = document.hidden ? data.away : title);
    const onMenu = (event: MouseEvent) => {
      const mark = (event.target as Element).closest<HTMLElement>(MARK);
      if (!mark) return;
      event.preventDefault();
      // From the keyboard there is no pointer position: open under the mark.
      const rect = mark.getBoundingClientRect();
      const [x, y] = event.clientX || event.clientY ? [event.clientX, event.clientY] : [rect.left, rect.bottom + 4];
      import("./menu").then(({ Menu }) => setMenu({ Menu, mark, x, y }));
    };

    addEventListener("keydown", onKey, true);
    addEventListener("playful:summon", onSummon);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onMenu);
    return () => {
      removeEventListener("keydown", onKey, true);
      removeEventListener("playful:summon", onSummon);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onMenu);
      root.removeAttribute("data-exploded");
    };
  }, [data]);

  return (
    <>
      <p id="playful-toast" role="status" data-print="hide" className={styles.toast} />
      {Cat && <Cat />}
      {menu && (
        <menu.Menu
          key={`${menu.x},${menu.y}`}
          mark={menu.mark}
          x={menu.x}
          y={menu.y}
          labels={data.menu}
          toast={toast}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
