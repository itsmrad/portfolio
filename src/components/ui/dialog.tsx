"use client";

import { useEffect, useRef } from "react";

/**
 * A modal on the native <dialog>: the browser makes the rest of the page inert
 * (the focus trap), closes on Escape and draws ::backdrop in the top layer.
 * This adds what it lacks everywhere: closing on a press outside the box and
 * returning focus to whatever opened it. Load it lazily; style it with
 * `open:` classes, since a closed dialog must keep `display: none`.
 */
export function Dialog({
  open,
  onClose,
  ref,
  ...props
}: Omit<React.ComponentProps<"dialog">, "open" | "onClose"> & { open: boolean; onClose: () => void }) {
  const own = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = own.current;
    if (!dialog || open === dialog.open) return;
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={(node) => {
        own.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      onClose={() => {
        const back = opener.current;
        opener.current = null;
        // Browsers differ on restoring focus; never leave it on <body> or in the closed box.
        if (back?.isConnected && (document.activeElement === document.body || own.current?.contains(document.activeElement))) {
          back.focus({ preventScroll: true });
        }
        onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself, outside its box, landed on the backdrop.
        // (On click, not pointerdown, so the release cannot land on the page below.)
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        const inside =
          event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
        if (!inside) event.currentTarget.close();
      }}
      {...props}
    />
  );
}
