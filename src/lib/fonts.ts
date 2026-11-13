import localFont from "next/font/local";

// Subsets live in src/assets/fonts (see scripts/fetch-fonts.mjs). Budget: 80 KB
// of woff2 on the page and two preloads. Sans (body) and serif (the name, which
// is the largest paint) are preloaded; mono and pixel swap in.

export const sans = localFont({
  src: "../assets/fonts/geist-sans.woff2",
  weight: "400 600",
  variable: "--font-geist-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const serif = localFont({
  src: "../assets/fonts/instrument-serif.woff2",
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

// Mono and pixel share a 0.6em advance with the system monospace fallbacks in
// globals.css, so their swap moves nothing sideways.
export const mono = localFont({
  src: "../assets/fonts/geist-mono.woff2",
  weight: "400 500",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const pixel = localFont({
  src: "../assets/fonts/geist-pixel.woff2",
  weight: "400",
  variable: "--font-geist-pixel",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const fontVariables = [sans, serif, mono, pixel].map((font) => font.variable).join(" ");
