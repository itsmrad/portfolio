/**
 * First-load icons, inline so they are plain server-rendered SVG. An icon
 * library's components run on the client and add their runtime to first-load
 * JS, so import one only inside a lazy chunk (the palette, the game).
 * Feature branches keep their own icons beside their components.
 */
function Icon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function ContrastIcon(props: React.ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 18a6 6 0 0 0 0-12v12z" />
    </Icon>
  );
}

export function DownloadIcon(props: React.ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5" />
    </Icon>
  );
}
