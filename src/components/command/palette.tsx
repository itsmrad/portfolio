"use client";

/**
 * The command palette: the lazy chunk (budget 25 KB brotli). Loaded by
 * ./commands on first use, never during page load. Also runs the actions that
 * need more than a link (copy, download) for the single-key listener.
 */
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  AtSign,
  Box,
  BriefcaseBusiness,
  Code,
  CornerDownLeft,
  Download,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Hammer,
  House,
  Keyboard,
  Layers,
  Link,
  Mail,
  Search,
  SunMoon,
  User,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { site } from "@/content/site";
import { haptic, play } from "@/lib/sound";
import { CommandGroup, CommandItem, CommandLegend, CommandShortcut, kbd } from "@/components/ui/command";
import { Dialog } from "@/components/ui/dialog";
import { actions, type Action } from "@/components/command/shortcuts";

import styles from "./command.module.css";

/** null: closed. "": all commands. "shortcuts": the keyboard shortcut list. */
export type View = "" | "shortcuts" | null;

function Brand({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const icons: Record<string, React.ReactNode> = {
  top: <House />,
  about: <User />,
  experience: <BriefcaseBusiness />,
  work: <FolderOpen />,
  building: <Hammer />,
  activity: <Activity />,
  stack: <Layers />,
  education: <GraduationCap />,
  contact: <AtSign />,
  project: <Box />,
  globe: <Globe />,
  code: <Code />,
  file: <FileText />,
  download: <Download />,
  mail: <Mail />,
  link: <Link />,
  keyboard: <Keyboard />,
  theme: <SunMoon />,
  sound: <Volume2 />,
  github: (
    <Brand d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
  ),
  x: (
    <Brand d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z" />
  ),
  linkedin: (
    <Brand d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13M7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0" />
  ),
};

// --- Actions -----------------------------------------------------------------

let toastBox: HTMLElement | undefined;
let toastTimer = 0;

/** A polite status line, created once so screen readers already watch it when the text lands. */
function toast(text: string) {
  if (!toastBox) {
    toastBox = document.createElement("div");
    toastBox.setAttribute("role", "status");
    toastBox.className = styles.toast!;
    toastBox.dataset.print = "hide";
    document.body.append(toastBox);
  }
  const box = toastBox;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    box.textContent = text;
    box.dataset.show = "";
  });
  toastTimer = window.setTimeout(() => delete box.dataset.show, 2000);
}

function copy(text: string, done: string) {
  // Clipboard access can be refused (permissions, an old browser): say so and show the text instead.
  (navigator.clipboard?.writeText(text) ?? Promise.reject()).then(
    () => {
      play("copy");
      haptic();
      toast(done);
    },
    () => toast(`Could not copy: ${text}`),
  );
}

function perform(action: Action) {
  if (action.control) {
    // The page control owns the effect (the theme reveal, the stored mute), so press it.
    document.querySelector<HTMLElement>(`[aria-keyshortcuts="${action.key}"]`)?.click();
  } else if (action.id === "copy-link") {
    copy(site.url + location.pathname + location.hash, "Link copied");
  } else if (action.id === "copy-email" && site.email) {
    copy(site.email, "Email copied");
  } else if (action.download && action.href) {
    Object.assign(document.createElement("a"), { href: action.href, download: action.download }).click();
  } else if (action.external) {
    window.open(action.href, "_blank", "noopener,noreferrer");
  } else if (action.href) {
    location.assign(action.href);
  }
}

/** Runs an action by id for the single-key listener. */
export function run(id: string) {
  const action = actions.find((item) => item.id === id);
  if (action) perform(action);
}

// --- Palette -----------------------------------------------------------------

type Row = { action: Action; keys: string[] };

function shortcutOf(action: Action) {
  return action.key ? [action.key] : action.chord ? ["g", action.chord] : [];
}

function sectionsFor(view: View, list: Action[]) {
  if (view === "shortcuts") {
    return [
      { heading: "Keys", rows: list.filter((a) => a.key).map((a) => ({ action: a, keys: [a.key!] })) },
      { heading: "Go to, after g", rows: list.filter((a) => a.chord).map((a) => ({ action: a, keys: ["g", a.chord!] })) },
    ].filter((section) => section.rows.length > 0);
  }
  const groups = new Map<string, Row[]>();
  for (const action of list) {
    groups.set(action.group, [...(groups.get(action.group) ?? []), { action, keys: shortcutOf(action) }]);
  }
  return [...groups].map(([heading, rows]) => ({ heading, rows }));
}

function PlatformKeys() {
  return (
    <>
      <kbd className={`${kbd} ${styles.ctrl}`}>Ctrl</kbd>
      <kbd className={`${kbd} ${styles.cmd}`} aria-label="Command">
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
      </kbd>
      <kbd className={kbd}>K</kbd>
    </>
  );
}

export function Palette({
  view,
  onView,
  resume,
  seed,
}: {
  view: View;
  onView: (view: View) => void;
  resume: boolean;
  /** What was typed while this chunk loaded. */
  seed: string;
}) {
  const [query, setQuery] = useState(seed);
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const chosen = useRef(false);
  const uid = useId();
  const open = view !== null;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const found = actions.filter(
    (action) =>
      (resume || action.id !== "resume") &&
      words.every((word) =>
        `${action.label} ${action.group} ${action.hint ?? ""} ${action.keywords ?? ""}`.toLowerCase().includes(word),
      ),
  );
  const sections = sectionsFor(view, found);
  const rows = sections.flatMap((section) => section.rows);
  const starts = sections.map((_, i) => sections.slice(0, i).reduce((total, section) => total + section.rows.length, 0));
  const optionId = (index: number) => `${uid}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    play("open");
    haptic();
  }, [open]);

  useEffect(() => {
    if (active === 0) list.current?.scrollTo({ top: 0 });
    else document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId is derived from a stable id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, view]);

  const search = (value: string) => {
    setQuery(value);
    setActive(0);
  };

  const show = (next: View) => {
    search("");
    onView(next);
    input.current?.focus();
  };

  const choose = (action: Action) => {
    if (action.id === "shortcuts") return show("shortcuts");
    chosen.current = true;
    // Close first: the page is inert while the modal is open, and focus goes back before any jump.
    dialog.current?.close();
    if (!action.control && !action.id.startsWith("copy")) {
      play("tap");
      haptic();
    }
    perform(action);
  };

  return (
    <Dialog
      ref={dialog}
      open={open}
      onClose={() => {
        if (!chosen.current) play("close");
        chosen.current = false;
        search("");
        onView(null);
      }}
      aria-label="Command palette"
      className={`${styles.dialog} fixed inset-x-0 bottom-auto mx-auto my-0 max-h-[min(56dvh,27rem)] w-[calc(100%-1rem)] max-w-[27.5rem] flex-col overflow-hidden rounded-xl bg-muted p-0 text-foreground shadow-xl ring-1 ring-border ring-inset open:flex`}
    >
      <div className="flex shrink-0 items-center gap-2 px-3.5">
        {view === "shortcuts" ? (
          <button
            type="button"
            onClick={() => show("")}
            aria-label="Back to all commands"
            className="-ml-1.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
        ) : (
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground/60" />
        )}
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls={`${uid}-list`}
          aria-autocomplete="list"
          aria-activedescendant={rows[active] ? optionId(active) : undefined}
          aria-label={view === "shortcuts" ? "Filter keyboard shortcuts" : "Search commands"}
          placeholder={view === "shortcuts" ? "Filter shortcuts…" : "Type a command or search…"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            const count = rows.length;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (count) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + count) % count);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const row = rows[active];
              if (row) choose(row.action);
            } else if (event.key === "Escape" && (query || view === "shortcuts")) {
              // Clear the search first, then step back, and only then close.
              event.preventDefault();
              if (query) search("");
              else show("");
            } else if (event.key === "Backspace" && !query && view === "shortcuts") {
              event.preventDefault();
              show("");
            }
          }}
          className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground/60 focus-visible:outline-none sm:text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              search("");
              input.current?.focus();
            }}
            aria-label="Clear search"
            className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : (
          <kbd aria-hidden className={`${kbd} shrink-0 text-[0.625rem] pointer-coarse:hidden`}>
            Esc
          </kbd>
        )}
      </div>

      {view === "shortcuts" && (
        <p className="px-3.5 pb-1.5 text-xs/6 text-pretty text-muted-foreground [&_kbd]:mx-0.5">
          Open with <kbd className={kbd}>/</kbd> or <PlatformKeys />, anywhere outside a text field.
        </p>
      )}

      <div
        ref={list}
        className="mx-1.5 mt-1 mb-1.5 min-h-0 overflow-y-auto overscroll-contain rounded-lg bg-card p-1.5 ring-1 ring-border ring-inset [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div id={`${uid}-list`} role="listbox" aria-label={view === "shortcuts" ? "Keyboard shortcuts" : "Commands"}>
          {sections.map((section, sectionIndex) => (
            <CommandGroup key={section.heading} id={`${uid}-group-${sectionIndex}`} heading={section.heading}>
              {section.rows.map(({ action, keys }, rowIndex) => {
                const i = starts[sectionIndex]! + rowIndex;
                return (
                  <CommandItem
                    key={`${section.heading}-${action.id}`}
                    id={optionId(i)}
                    selected={i === active}
                    onPointerMove={() => i !== active && setActive(i)}
                    onClick={() => choose(action)}
                  >
                    {icons[action.icon] ?? icons.link}
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.hint && (
                      <span className="max-w-[40%] truncate font-mono text-xs text-muted-foreground">{action.hint}</span>
                    )}
                    {keys.length > 0 && <CommandShortcut keys={keys} />}
                    {action.external && (
                      <span className="-mr-0.5 text-muted-foreground">
                        <ArrowUpRight className="size-3.5" aria-label="opens in a new tab" />
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No results for <span className="font-medium text-foreground">“{query.trim()}”</span>
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {query ? `${rows.length} ${rows.length === 1 ? "result" : "results"}` : ""}
      </p>

      <CommandLegend
        items={[
          { keys: [<ArrowUp key="up" />, <ArrowDown key="down" />], label: "Navigate" },
          { keys: [<CornerDownLeft key="enter" />], label: "Select" },
          { keys: ["Esc"], label: view === "shortcuts" ? "Back" : "Close" },
        ]}
      />
    </Dialog>
  );
}
