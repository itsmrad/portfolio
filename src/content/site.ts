/**
 * Owner copy and data: identity, SEO strings, navigation, about, experience,
 * education, projects and stack. This file belongs to the foundation and to
 * the projects branch (the `projects` and `building` regions only).
 *
 * Every other feature keeps its copy in its own file beside this one
 * (home.ts, command.ts, sound.ts, playful.ts, footer.ts), so branches never
 * edit the same lines. No copy is written inside a component.
 *
 * Content rules (binding):
 * - Only owner-verified facts. No invented achievements or metrics.
 * - No phone number anywhere. `email` stays null until the owner confirms it.
 * - Plancover is named but never linked. xflow: no user, download or star claims.
 * - larpcc and vidura are one-line "currently building" entries only.
 */
import type { StaticImageData } from "next/image";

import avatar from "@/assets/avatar.jpg";
import codenayaIde from "@/assets/projects/codenaya-ide.webp";
import xflowCliDark from "@/assets/projects/xflow-cli-dark.webp";
import xflowCliLight from "@/assets/projects/xflow-cli-light.webp";
import xflowPillError from "@/assets/projects/xflow-pill-error.webp";
import xflowPillHandsFree from "@/assets/projects/xflow-pill-hands-free.webp";
import xflowPillListening from "@/assets/projects/xflow-pill-listening.webp";
import xflowPillProcessing from "@/assets/projects/xflow-pill-processing.webp";

export const site = {
  name: "Anupam Das",
  givenName: "Anupam",
  familyName: "Das",
  initials: "AD",
  handle: "itsmrad",
  url: "https://www.anupamdas.me",
  domain: "anupamdas.me",
  role: "Software Engineer",
  tagline: "I build AI products and fast native tools, end to end.",
  /** Rotating mono line under the name. */
  taglines: [
    "AI Intern at Plancover",
    "Building Codenaya",
    "Building xflow in Rust",
    "Final-year B.Tech at BPIT",
  ],
  location: { label: "New Delhi, India", locality: "New Delhi", country: "IN", timeZone: "Asia/Kolkata" },
  availability: "Open to full-time roles, internships and freelance work",
  /** Pending owner confirmation. While null, no address is rendered or emitted anywhere. */
  email: null as string | null,
  avatar: {
    src: avatar,
    alt: "Anupam Das in profile, wearing glasses and a white shirt, lit by warm orange light",
  },
  /** The PDF is served from /public at this path. While the file is absent, nothing is rendered. */
  resume: { pdf: "/resume.pdf", fileName: "Anupam-Das-Resume.pdf", updated: "2026-11" },
  // The site's own repository is deliberately not linked anywhere on the page.
  license: "MIT",
  /** Search Console meta tag; empty means not emitted (DNS verification is preferred). */
  googleVerification: "" as string,
  created: "2026-11-13",
  updated: "2026-11-13",
} as const;

export const seo = {
  /** At most 60 characters. */
  title: "Anupam Das — Software Engineer (Rust, TypeScript, AI)",
  /** 140 to 160 characters. */
  description:
    "Anupam Das is a software engineer in New Delhi building AI products and native developer tools: Codenaya, a browser IDE with a coding agent, and xflow.",
  ogTagline: "AI products and fast native tools, built end to end.",
  knowsAbout: [
    "Rust",
    "TypeScript",
    "Python",
    "React",
    "Next.js",
    "AI coding agents",
    "Large language model applications",
    "Developer tools",
  ],
} as const;

export type Social = { label: string; handle: string; href: string };
export const socials: Social[] = [
  { label: "GitHub", handle: "itsmrad", href: "https://github.com/itsmrad" },
  { label: "X", handle: "@AnupamIO", href: "https://x.com/AnupamIO" },
  { label: "LinkedIn", handle: "itsmrad", href: "https://www.linkedin.com/in/itsmrad" },
];
export const xHandle = "@AnupamIO";

/** Header links. `key` is the single-key shortcut shown as `[a] about`. */
export type NavItem = { key: string; label: string; href: `/#${string}` };
export const nav: NavItem[] = [
  { key: "a", label: "about", href: "/#about" },
  { key: "e", label: "experience", href: "/#experience" },
  { key: "w", label: "work", href: "/#work" },
];

/** Three short paragraphs. `**bold**` marks the key phrase of each. */
export const about: string[] = [
  "I'm a final-year B.Tech student at BPIT in New Delhi and an **AI Intern at Plancover**. I like owning a product end to end: the interface, the backend, the release pipeline and the numbers that show it works.",
  "**Codenaya** is my own product: a browser IDE where a coding agent writes your app file by file, runs it in a cloud sandbox with a live preview and exports it to GitHub. It is live at codenaya.tech.",
  "**xflow** is the systems side: a native Rust dictation daemon for macOS and Linux that idles at 3 MiB of memory and returns text a median 255 ms after you stop speaking. The benchmarks are published in the repo.",
];

export type Experience = {
  org: string;
  role: string;
  kind: "internship" | "community";
  /** YYYY-MM */
  start: string;
  /** YYYY-MM, or null while ongoing. */
  end: string | null;
  /** Organisation site. Omitted where the owner wants no link. */
  url?: string;
  logo?: StaticImageData;
  summary: string;
  highlights: string[];
  links?: { label: string; href: string }[];
};

export const experience: Experience[] = [
  {
    org: "Plancover",
    role: "AI Intern",
    kind: "internship",
    start: "2026-09",
    end: null,
    summary: "Six-month AI internship.",
    highlights: [],
  },
  {
    org: "Syuniqe",
    role: "Full Stack Software Engineer",
    kind: "internship",
    start: "2025-06",
    end: "2025-07",
    url: "https://syuniqe.com",
    summary:
      "Built the company website frontend and a Raspberry Pi kiosk image for a startup making a portable solar power station.",
    highlights: [
      "Company website in Next.js: product landing page, an animated roadmap, a contact form with email delivery and a waitlist API.",
      "A one-command build for a flashable Raspberry Pi image that boots into a full-screen web app, with a small Rust service for on-screen Wi-Fi setup.",
      "Interface design in Figma.",
    ],
    links: [
      { label: "Website archive", href: "https://github.com/itsmrad/syuniqe-web-archive" },
      { label: "Kiosk image", href: "https://github.com/itsmrad/rpi-web-kiosk" },
    ],
  },
  {
    org: "Namespace",
    role: "Tech Team Member",
    kind: "community",
    start: "2023-11",
    end: null,
    summary: "College coding society. Contributed to society projects and organized a hackathon.",
    highlights: [],
  },
  {
    org: "SheBuilds",
    role: "Organizing Team",
    kind: "community",
    start: "2025-02",
    end: "2025-04",
    summary: "Helped organize the SheBuilds hackathon.",
    highlights: [],
  },
];

export const education = [
  {
    school: "Bhagwan Parshuram Institute of Technology",
    short: "BPIT",
    degree: "B.Tech",
    status: "Final year",
  },
] as const;

export type Metric = { label: string; value: string; note?: string };

export type Project = {
  slug: string;
  name: string;
  /** What it does, in one sentence a non-engineer understands. */
  tagline: string;
  description: string;
  status: "stable" | "wip";
  /** Shown in the status pill. */
  statusLabel: string;
  featured: boolean;
  url?: string;
  repo?: string;
  stack: string[];
  /** YYYY-MM */
  started: string;
  /** YYYY-MM-DD, the last verified activity. */
  updated: string;
  /** The first one sits in the card's window. A `theme` pair shows the one matching the page theme. */
  screenshots: { src: StaticImageData; alt: string; theme?: "light" | "dark" }[];
  highlights: string[];
  metrics: Metric[];
  /** Where the metrics come from, shown under them. */
  metricsSource?: { label: string; href: string };
  links: { label: string; href: string }[];
  schema: "WebApplication" | "SoftwareApplication";
  os?: string;
  license?: string;
  version?: string;
  /** True only where the product can really be used at no cost. */
  free: boolean;
  /** Meta line above the name. */
  category?: string;
  /** Whose work it is, from the repository's own numbers. */
  authorship?: string;
  /**
   * OWNER CLIP SLOT. A screen recording made by the owner: WebM in /public,
   * a poster still in src/assets/projects, and a one-line caption. While it is
   * absent nothing renders; when present it plays only on request.
   */
  clip?: Clip;
  /** Real product images shown under "The product". */
  figure?: { caption: string; items: { src: StaticImageData; alt: string; label: string }[] };
  /** The stack grouped by what each part does. */
  layers?: { layer: string; tools: string }[];
  decisions?: Decision[];
  /** Published measurements, drawn as a figure. */
  benchmarks?: Benchmarks;
  /** The page's "What I built" list: the highlights not already shown by the decisions or benchmarks. */
  built?: string[];
};

export type Clip = { src: string; poster: StaticImageData; caption: string };

export type Decision = { title: string; constraint: string; decision: string; result: string };

/** Values are strings as published (precision kept); bar lengths are read from them. */
export type Benchmarks = {
  memory: { title: string; unit: string; max: number; step: number; rows: { label: string; value: string; note?: string }[] };
  latency: {
    title: string;
    unit: string;
    max: number;
    step: number;
    rows: { label: string; p50: string; p95: string; part?: { label: string; value: string } }[];
  };
  idle: string;
  conditions: string;
  source: { label: string; href: string };
};

/**
 * Project entries: add fields or entries, never reorder. Every number here was
 * checked against the repositories and GitHub on 2026-11-13.
 */
export const projects: Project[] = [
  {
    slug: "codenaya",
    name: "Codenaya",
    tagline: "Describe the app you want in plain English; Codenaya writes it, runs it in your browser and hands you the code.",
    description:
      "A browser IDE with a coding agent built in. The agent writes the project file by file, runs it with a live preview and a terminal, and exports it to a new GitHub repo or a ZIP. Use 15 hosted models, or any model through your own API key.",
    status: "stable",
    statusLabel: "Live",
    featured: true,
    url: "https://codenaya.tech",
    repo: "https://github.com/itsmrad/codenaya",
    stack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "CodeMirror 6",
      "Convex",
      "Clerk",
      "Inngest AgentKit",
      "E2B",
      "Sentry",
      "Playwright",
      "Vitest",
    ],
    started: "2026-02",
    updated: "2026-11-07",
    screenshots: [
      {
        src: codenayaIde,
        alt: "The Codenaya IDE: chat panel, file tree and App.jsx in the editor, with Preview, Publish and Export in the toolbar",
      },
    ],
    highlights: [
      "Durable agent runs: they survive deploys, can be cancelled, and are sent back to type-check and build in the sandbox before finishing with unchecked changes.",
      "Live preview in a cloud sandbox with boot steps, a terminal and a device toggle.",
      "Bring your own key: API keys are sealed with AES-256-GCM envelope encryption and never enter run history.",
      "CodeMirror 6 editor with ghost-text suggestions, quick edit, checkpoints and restore, and GitHub import and export.",
      "Engineering process: 10 architecture decision records, CI, 170 unit test files and 69 Playwright end-to-end specs.",
    ],
    metrics: [
      { label: "Merged pull requests", value: "218", note: "206 of them his" },
      { label: "Unit test files", value: "170" },
      { label: "End-to-end specs", value: "69" },
      { label: "Decision records", value: "10" },
      { label: "Models", value: "Unlimited", note: "15 hosted, any with your own key" },
      { label: "Projects built", value: "100+" },
    ],
    metricsSource: { label: "Counts from the public repository, 2026-11-13", href: "https://github.com/itsmrad/codenaya" },
    links: [
      { label: "codenaya.tech", href: "https://codenaya.tech" },
      { label: "Source", href: "https://github.com/itsmrad/codenaya" },
      { label: "Docs", href: "https://www.codenaya.tech/docs" },
    ],
    schema: "WebApplication",
    free: true,
    category: "AI browser IDE",
    authorship: "His product: 777 of its 801 commits are his.",
    // OWNER CLIP SLOT: clip: { src: "/clips/codenaya-session.webm", poster: <import>, caption: "…" },
    layers: [
      { layer: "Interface", tools: "Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, CodeMirror 6" },
      { layer: "Data and auth", tools: "Convex, Clerk" },
      { layer: "Agent", tools: "Inngest AgentKit on OpenRouter, OpenAI, Anthropic and Groq" },
      { layer: "Preview", tools: "E2B cloud sandboxes, WebContainer" },
      { layer: "Quality", tools: "Vitest, Playwright, Sentry" },
    ],
    decisions: [
      {
        title: "Agent runs that outlive a deploy",
        constraint:
          "A run takes minutes and makes many model and tool calls. A web request cannot hold it, and it has to survive deploys and be cancellable.",
        decision:
          "Each run is a durable Inngest AgentKit function. Database writes and side effects run as steps, so a crash or a deploy resumes the run instead of losing it.",
        result: "Runs can be cancelled from another request and are observable in the Inngest dashboard and in Sentry.",
      },
      {
        title: "Keys that never touch run history",
        constraint:
          "The runtime stores every step’s return value. A step that returned a decrypted key would write the user’s secret into history.",
        decision:
          "Keys are resolved in the function body, outside every step, on each replay. Stored keys are sealed with AES-256-GCM envelope encryption.",
        result:
          "Keys stay in process memory. A rejected key ends the run with a pointer to settings and never falls back to the platform key.",
      },
      {
        title: "A build check before it says done",
        constraint: "A model can report success on an app that does not compile.",
        decision:
          "A finish gate counts writes after the last passing check. If the agent tries to stop with unchecked changes, the run sends it back once to run tsc and vite build in the sandbox, within three checks per run.",
        result:
          "A run that changed files after its last passing check is sent back to build again before it can finish, and an end-to-end spec holds the gate in place.",
      },
    ],
    built: [
      "An agent with 15 tools for files, builds and the web, on OpenRouter, OpenAI, Anthropic or Groq models.",
      "Three AI features in the CodeMirror 6 editor: ghost-text completions, Cmd+K quick edit and a selection tooltip.",
      "Two runtimes for the generated app: WebContainer in the browser and E2B cloud sandboxes, with a live preview and a terminal.",
      "Two-tier access control: Clerk sign-in with a per-project ownership check for people, and a shared internal key on all 37 mutations that background jobs call.",
      "Bring your own key for OpenRouter, OpenAI, Anthropic, Groq or any OpenAI-compatible endpoint.",
      "Engineering process: 10 architecture decision records, CI, unit and end-to-end tests.",
    ],
  },
  {
    slug: "xflow",
    name: "xflow",
    tagline: "Hold a key and talk; xflow types what you said into whatever app you are using, on Mac and Linux.",
    description:
      "Local-first dictation for developers: a small Rust daemon with a CLI and a terminal UI. Speech goes to the provider you choose, comes back cleaned up and is pasted at your cursor in an editor, terminal, browser or chat. No Electron, no WebView, no telemetry.",
    status: "stable",
    statusLabel: "Beta",
    featured: true,
    url: "https://xflowcli.vercel.app",
    repo: "https://github.com/itsmrad/xflow",
    stack: ["Rust", "clap", "ratatui", "CPAL", "SQLite", "Swift", "Nix", "GitHub Actions"],
    started: "2026-09",
    updated: "2026-11-09",
    screenshots: [
      {
        src: xflowCliDark,
        alt: "The command-line section of the xflow website: example commands and the xflow --help command list",
        theme: "dark",
      },
      {
        src: xflowCliLight,
        alt: "The command-line section of the xflow website: example commands and the xflow --help command list",
        theme: "light",
      },
    ],
    highlights: [
      "Idles at 3.0 MiB of memory and peaks at 20.8 MiB while dictating (Apple M2, 8 GB, 2026-10-29).",
      "Text arrives a median 255 ms after you stop speaking (378 ms at p95) across 30 live Groq dictations of one 7 s clip.",
      "Ten cloud speech providers plus local whisper.cpp servers behind one interface.",
      "Pastes at the cursor on macOS, restores the clipboard it replaced and refuses to type into secure fields.",
      "Release engineering: CI-gated tagged releases, a checksum-verifying installer, .deb and .rpm packages for amd64 and arm64, an Arch PKGBUILD, a Nix flake, a signed macOS package and a Homebrew tap.",
      "A Rust workspace of four crates with about 1,000 tests.",
    ],
    metrics: [
      { label: "Merged pull requests", value: "138", note: "all his" },
      { label: "Latest release", value: "0.2.1-beta", note: "2026-11-02" },
      { label: "Lines of Rust", value: "~98,000", note: "tests included" },
      { label: "Tests", value: "~1,000" },
      { label: "Idle memory", value: "3.0 MiB", note: "median over 300 s, Apple M2 8 GB" },
      { label: "Stop to text, p50", value: "255 ms", note: "30 live Groq dictations, 7 s clip, paste excluded" },
    ],
    metricsSource: {
      label: "Repository counts 2026-11-13; benchmarks 2026-10-29, macOS 26.7.1",
      href: "https://github.com/itsmrad/xflow/blob/main/docs/benchmarks/scoreboard-macos.json",
    },
    links: [
      { label: "Website", href: "https://xflowcli.vercel.app" },
      { label: "Source", href: "https://github.com/itsmrad/xflow" },
      { label: "Releases", href: "https://github.com/itsmrad/xflow/releases" },
    ],
    schema: "SoftwareApplication",
    os: "macOS, Linux",
    license: "MIT",
    version: "0.2.1-beta",
    free: true,
    category: "Native dictation daemon",
    authorship: "Sole author: all 494 commits are his.",
    // OWNER CLIP SLOT: clip: { src: "/clips/xflow-dictation.webm", poster: <import>, caption: "…" },
    figure: {
      caption:
        "The macOS recording pill in its four states: listening, hands-free with cancel and stop, processing, and a failure. Images from the project’s documentation.",
      items: [
        { src: xflowPillListening, alt: "Dark pill with a live waveform", label: "Listening" },
        { src: xflowPillHandsFree, alt: "Wider pill with a waveform, a cancel button and a red stop button", label: "Hands-free" },
        { src: xflowPillProcessing, alt: "Dark pill with a row of progress dots", label: "Processing" },
        { src: xflowPillError, alt: "Red pill with a row of dots", label: "Failure" },
      ],
    },
    layers: [
      { layer: "Daemon and CLI", tools: "Rust, clap, ratatui" },
      { layer: "Audio and history", tools: "CPAL, SQLite" },
      { layer: "Desktop", tools: "macOS Accessibility, Swift, a GNOME Shell extension" },
      { layer: "Release", tools: "GitHub Actions, Nix, Homebrew, .deb and .rpm" },
      { layer: "Benchmarks", tools: "Python" },
    ],
    decisions: [
      {
        title: "Twenty-minute dictations without the wait",
        constraint:
          "Uploading a long recording only when the speaker stops makes them wait for the whole clip, and holding it all in memory grows without limit.",
        decision:
          "The daemon drains the capture buffer every second and transcribes 30 to 60 second segments, cut at the quietest 250 ms, while recording continues.",
        result: "Memory stays bounded, and stopping only waits for the last segment.",
      },
      {
        title: "Paste into whatever has focus, safely",
        constraint:
          "Text has to land at the cursor in any app, Electron apps and terminals included, and never in a password field or the wrong window.",
        decision:
          "On macOS, read the frontmost app, window and focused Accessibility element, paste with the key that types “v” in the current layout, and refuse secure fields.",
        result:
          "When the target is unknown or has changed, nothing is typed: the text is copied and kept for recovery.",
      },
      {
        title: "Silence is not speech",
        constraint: "Speech models invent words from silence and clicks.",
        decision:
          "Before upload, 20 ms frames must hold at least 80 ms above a configurable floor, and known silence hallucinations from quiet clips are discarded.",
        result: "A silent press ends with “Didn’t catch anything” instead of pasting invented text.",
      },
    ],
    benchmarks: {
      memory: {
        title: "Fig. 1  Memory footprint",
        unit: "MiB",
        max: 25,
        step: 5,
        rows: [
          { label: "Idle", value: "3.0", note: "median of 1 Hz samples over 300 s" },
          { label: "Peak while dictating", value: "20.8", note: "daemon and recording pill, sampled at 20 Hz" },
        ],
      },
      latency: {
        title: "Fig. 2  Latency",
        unit: "ms",
        max: 700,
        step: 100,
        rows: [
          {
            label: "Stop to text",
            p50: "255",
            p95: "378",
            part: { label: "provider speech-to-text, p50", value: "250" },
          },
          { label: "Warm start to status", p50: "85.2", p95: "118" },
          { label: "Cold start to status", p50: "588", p95: "669" },
        ],
      },
      idle: "Idle CPU 0.0001 %, 0.00 wakeups per second.",
      conditions:
        "Measured 2026-10-29 at commit 6ebd451 on an Apple M2 with 8 GB, macOS 26.7.1; the latest macOS run. Memory is phys_footprint. Stop to text: 30 live Groq dictations of one 7.0 s clip, from the stop request to text in a file, real paste excluded. Start times: 30 launches each, sensitive to load.",
      source: {
        label: "scoreboard-macos.json",
        href: "https://github.com/itsmrad/xflow/blob/main/docs/benchmarks/scoreboard-macos.json",
      },
    },
    built: [
      "Ten cloud speech providers plus local whisper.cpp servers behind one interface.",
      "A CLI and a terminal UI for setup, history search and export, the dictionary and snippets.",
      "A macOS recording pill drawn with Core Animation in its own helper process, so the daemon never loads AppKit.",
      "Release engineering: CI-gated tagged releases, a checksum-verifying installer, .deb and .rpm packages for amd64 and arm64, an Arch PKGBUILD, a Nix flake, a signed macOS package and a Homebrew tap.",
      "A Rust workspace of four crates with about 1,000 tests.",
    ],
  },
];

/** One line each. Not shipped, so nothing more is claimed. */
export const building = [
  {
    name: "larpcc",
    line: "A Rust CLI that keeps separate Claude Code and Codex profile directories from colliding.",
    repo: "https://github.com/itsmrad/larpcc",
    updated: "2026-11-12",
  },
  {
    name: "vidura",
    line: "The foundation for one persistent assistant across web, desktop and mobile.",
    repo: "https://github.com/itsmrad/vidura",
    updated: "2026-09-18",
  },
] as const;

/** Numbered stack rows. Every item is in use in the owner's public repositories. */
export const stack = [
  { label: "Languages", items: ["Rust", "TypeScript", "Python"] },
  { label: "Frontend", items: ["React", "Next.js", "Tailwind CSS", "CodeMirror"] },
  { label: "Backend", items: ["Convex", "Inngest", "PostgreSQL", "SQLite"] },
  { label: "AI", items: ["Agent runtimes", "Cloud sandboxes", "Speech-to-text providers"] },
  { label: "Tooling", items: ["GitHub Actions", "Playwright", "Vitest", "Nix", "Sentry"] },
] as const;
