/**
 * SLOT (sound + 404 branch). Stub: a server shell that already reads fine.
 * Replace with the final 404 (staggered numerals, the pun, the game). Keep the
 * single <h1>, the way home and the <Game /> mount.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { Game } from "@/components/game/game";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="px-4 py-16">
      <p className="eyebrow" aria-hidden>
        ERR / 404
      </p>
      <h1 id="not-found-title" className="mt-1 font-serif text-4xl/[1.1] tracking-[-0.015em]">
        This page is not in the drawing set.
      </h1>
      <p className="mt-3 text-muted-foreground">The address may be mistyped, or the page may have moved.</p>
      <Button asChild className="mt-6">
        <Link href="/" prefetch={false}>Back to the home page</Link>
      </Button>
      <Game />
    </section>
  );
}
