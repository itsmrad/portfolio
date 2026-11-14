/**
 * A button that copies `value` and says so for two seconds. Server-rendered;
 * ./effects handles the click, sets `data-copied` and fills the status line.
 */
export function CopyButton({ value, children, ...props }: React.ComponentProps<"button"> & { value: string }) {
  return (
    <button type="button" data-copy={value} data-copied-label="Copied" data-failed-label="Copy failed; the address is selected" {...props} className={`group ${props.className ?? ""}`}>
      <span className="group-data-copied:hidden">{children}</span>
      <span aria-hidden className="hidden text-signal group-data-copied:inline">
        copied.
      </span>
      <span role="status" className="sr-only" />
    </button>
  );
}
