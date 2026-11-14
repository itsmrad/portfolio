import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";
import { baseMetadata, jsonLd, siteGraph } from "@/lib/seo";
import { THEME_COLOR, themeScript } from "@/lib/theme";
import { CommandRoot } from "@/components/command/root";
import { Footer } from "@/components/layout/footer";
import { ArcadeSlot } from "@/components/arcade/slot";
import { Frame, Gutter } from "@/components/layout/frame";
import { Header } from "@/components/layout/header";
import { GutterLeft, GutterRight } from "@/components/playful/gutters";
import { PlayfulLayer } from "@/components/playful/layer";

import "./globals.css";

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  colorScheme: "light dark",
  // Lets env(safe-area-inset-*) report the home indicator, so the phone dock sits above it.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script may add .light/.dark before hydration.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteGraph()) }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Header />
        <div className="relative overflow-x-clip px-(--frame-gutter)">
          <Gutter side="left">
            <GutterLeft />
          </Gutter>
          <main id="main">
            <Frame>{children}</Frame>
          </main>
          <ArcadeSlot />
          <Gutter side="right">
            <GutterRight />
          </Gutter>
        </div>
        <Footer />
        <CommandRoot />
        <PlayfulLayer />
      </body>
    </html>
  );
}
