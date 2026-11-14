/** The AD monogram, drawn on a 32px grid with square joins. */
export function Mark(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      {...props}
    >
      <path d="M3 26 9.5 6 16 26M5.6 19h7.8" />
      <path d="M20 6h5l4 4v12l-4 4h-5Z" />
    </svg>
  );
}
