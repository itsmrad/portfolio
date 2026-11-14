import Link from "next/link";

import { nav, site } from "@/content/site";
import { resumePdf } from "@/lib/resume";
import { CommandTrigger } from "@/components/command/trigger";
import { Mark } from "@/components/layout/mark";
import { SoundToggle } from "@/components/sound/toggle";
import { ThemeToggle } from "@/components/theme/toggle";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";

/**
 * Sticky 56px frosted bar on the frame: mark, key-hinted links, control slots,
 * resume. Links stay on this page, so there is nothing to prefetch.
 *
 * Width is tight by design. Below `sm` the links are hidden (the page is one
 * scroll, and the command branch's dock carries navigation on phones). With
 * every slot filled the bar fits from 320px up as long as the search pill is
 * at most 128px wide and hidden below `sm`.
 */
export function Header() {
  const resume = resumePdf();
  return (
    <header
      data-print="hide"
      className="sticky top-0 z-50 h-(--header-height) overflow-x-clip bg-background/84 px-(--frame-gutter) backdrop-blur-md backdrop-saturate-[1.4]"
    >
      <div className="screen-line-bottom mx-auto flex h-full max-w-(--frame-width) items-center gap-1 border-x border-line pr-2 pl-4">
        <Link href="/" prefetch={false} aria-label={`${site.givenName}, home`} className="touch-target -ml-1 rounded-sm p-1">
          <Mark className="size-6" />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center sm:flex">
          {nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              aria-keyshortcuts={item.key}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span aria-hidden className="font-mono text-xs">
                [{item.key}]{" "}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <CommandTrigger />
        <SoundToggle />
        <ThemeToggle />
        {resume && (
          <Button asChild variant="accent" size="sm" className="ml-1">
            <a href={resume} download={site.resume.fileName}>
              <DownloadIcon className="size-3.5" />
              Resume
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
