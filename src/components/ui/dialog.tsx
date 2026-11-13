"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A modal on the native <dialog>: the browser makes the rest of the page inert
 * (the focus trap), closes on Escape and draws ::backdrop in the top layer.
 * This adds what it lacks everywhere: closing on a press outside the box and
 * returning focus to whatever opened it. Load it lazily; style it with
 * `open:` classes, since a closed dialog must keep `display: none`.
 *
 * The browser closes the dialog before React hears of it, so `request` (any
 * value that changes per open request) reopens a dialog that is still open
 * in React's eyes, and a late `close` event for a dialog already reopened is
 * ignored.
 */
export function Dialog({
  open,
  request,
  onClose,
  ref,
  ...props
}: Omit<React.ComponentProps<"dialog">, "open" | "onClose"> & { open: boolean; request?: number; onClose: () => void }) {
  const own = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pressedOutside = useRef(false);

  // A layout effect, so the dialog is open before a parent's layout effect moves focus into it.
  useLayoutEffect(() => {
    const dialog = own.current;
    if (!dialog || open === dialog.open) return;
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open, request]);

  const outside = (event: React.MouseEvent<HTMLDialogElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return (
      event.target === event.currentTarget &&
      (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
    );
  };

  return (
    <dialog
      ref={(node) => {
        own.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      onClose={() => {
        if (own.current?.open) return;
        const back = opener.current;
        opener.current = null;
        // Browsers differ on restoring focus; never leave it on <body> or in the closed box.
        if (back?.isConnected && (document.activeElement === document.body || own.current?.contains(document.activeElement))) {
          back.focus({ preventScroll: true });
        }
        onClose();
      }}
      // Close only for a press that starts and ends on the backdrop: a text
      // selection dragged out of the box ends there too, and must not close it.
      onPointerDown={(event) => (pressedOutside.current = outside(event))}
      onClick={(event) => {
        if (pressedOutside.current && outside(event)) event.currentTarget.close();
        pressedOutside.current = false;
      }}
      {...props}
    />
  );
}
