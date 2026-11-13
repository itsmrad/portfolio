import { useEffect, useRef, type KeyboardEvent } from "react";

import { play } from "@/lib/sound";

/**
 * The right-click menu on the header mark: copy the mark as SVG. A real menu, so it is keyboard-complete (it also opens from the
 * context-menu key on the focused mark): arrows move, Escape and Tab close it
 * and return focus to the mark. It closes on any outside press, scroll or resize.
 */
export type MenuProps = {
  mark: HTMLElement;
  x: number;
  y: number;
  labels: { label: string; copy: string; copied: string; failed: string };
  toast: (text: string) => void;
  onClose: () => void;
};

const item =
  "flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left outline-none select-none hover:bg-accent focus-visible:bg-accent";

export function Menu({ mark, x, y, labels, toast, onClose }: MenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  const items = () => [...menu.current!.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  useEffect(() => {
    const element = menu.current!;
    element.querySelector<HTMLElement>('[role="menuitem"]')!.focus();
    // A press elsewhere takes focus with it; a scroll or resize hands it back to the mark.
    const outside = (event: Event) => element.contains(event.target as Node) || onClose();
    const away = () => {
      onClose();
      mark.focus({ preventScroll: true });
    };
    addEventListener("pointerdown", outside);
    addEventListener("scroll", away, { passive: true });
    addEventListener("resize", away);
    addEventListener("blur", onClose);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("scroll", away);
      removeEventListener("resize", away);
      removeEventListener("blur", onClose);
    };
  }, [mark, onClose]);

  const leave = () => {
    onClose();
    mark.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 }[event.key];
    if (to !== undefined) all[(to + all.length) % all.length]?.focus();
    else if (event.key === "Escape" || event.key === "Tab") leave();
    else return;
    event.preventDefault();
  };
  const copy = () => {
    const svg = mark.querySelector("svg")!.cloneNode(true) as SVGElement;
    svg.removeAttribute("class");
    svg.removeAttribute("aria-hidden");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Rejects without clipboard permission or outside a secure context.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(svg.outerHTML))
      .then(
        () => {
          play("copy");
          toast(labels.copied);
        },
        () => {
          play("error");
          toast(labels.failed);
        },
      );
    leave();
  };

  return (
    <div
      ref={menu}
      role="menu"
      aria-label={labels.label}
      data-print="hide"
      onKeyDown={onKeyDown}
      className="fixed z-60 min-w-44 origin-top-left animate-in rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md duration-150 fade-in-0 zoom-in-95"
      style={{ left: Math.min(x, innerWidth - 192), top: Math.min(y, innerHeight - 56) }}
    >
      <button type="button" role="menuitem" className={item} onClick={copy}>
        {labels.copy}
      </button>
    </div>
  );
}
