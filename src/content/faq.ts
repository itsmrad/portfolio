/**
 * The questions people and assistants ask about the owner, each answered in one
 * or two sentences that still make sense when quoted alone (so every answer
 * names him). Only facts already on the page; tests hold every number and
 * address here to the rest of the page. Never a phone number.
 *
 * Shown in the FAQ section, emitted as FAQPage structured data and copied into
 * the Markdown files. `id` makes each one a stable link: /#faq-<id>.
 */
import { resumePdf } from "@/lib/resume";

import { site, socials } from "./site";

export type Question = { id: string; question: string; answer: string };

const resume = resumePdf();
const handles = socials.map((social) => `${social.handle} on ${social.label}`).join(", ");

export const faq: Question[] = [
  {
    id: "who",
    question: "Who is Anupam Das?",
    answer:
      "Anupam Das is a software engineer and AI/LLM engineer based in New Delhi, India. He is an AI/LLM Intern at PlanCover and a final-year B.Tech student in Information Technology at Bhagwan Parshuram Institute of Technology (BPIT).",
  },
  {
    id: "builds",
    question: "What does Anupam Das build?",
    answer:
      "Anupam Das builds AI products and fast native developer tools end to end, from the interface and backend to the release pipeline. His work includes a production AI insurance assistant at PlanCover, Codenaya and its coding agent, and xflow, a native tool written in Rust.",
  },
  {
    id: "codenaya",
    question: "What is Codenaya?",
    answer:
      "Codenaya is Anupam Das's own product, live at codenaya.tech: a browser IDE with a built-in coding agent that writes an app file by file, runs it with a live preview and a terminal, and exports it to GitHub or a ZIP. He started it in February 2026 and wrote 777 of its 801 commits.",
  },
  {
    id: "xflow",
    question: "What is xflow?",
    answer:
      "xflow is an open-source, MIT-licensed dictation tool for macOS and Linux that Anupam Das wrote in Rust: hold a key, speak, and it types the cleaned-up text at your cursor in any app. Its published benchmarks on an Apple M2 show 3.0 MiB of memory at idle and text a median 255 ms after you stop speaking.",
  },
  {
    id: "stack",
    question: "What tech stack does Anupam Das use?",
    answer:
      "Anupam Das works mainly in TypeScript, Python and Rust: Next.js and React on the front end, FastAPI and Node.js on the back end, LangGraph, Pinecone, OpenRouter and the Vercel AI SDK for AI systems, and Docker, CI/CD and Sentry in production.",
  },
  {
    id: "experience",
    question: "Where has Anupam Das worked?",
    answer:
      "Anupam Das has been an AI/LLM Intern at PlanCover in Gurugram since September 2026. Before that he was an AI Full-Stack Developer & Automation Systems Associate at Dasgupta Maiti & Associates in Kolkata (June to July 2026) and a Full Spectrum Product Engineering Intern at Syuniqe in Faridabad (June to August 2025).",
  },
  {
    id: "location",
    question: "Where is Anupam Das based?",
    answer: `Anupam Das is based in ${site.location.label}, in India Standard Time (UTC+5:30).`,
  },
  {
    id: "hire",
    question: "Is Anupam Das available for hire?",
    answer: `Yes: Anupam Das is ${site.availability.toLowerCase()}. Email ${site.email} or book a call at ${site.calUrl}.`,
  },
  {
    id: "contact",
    question: "How can I contact Anupam Das?",
    answer: `Email Anupam Das at ${site.email} or book a call at ${site.calUrl}${resume ? `; his resume is at ${site.url}${resume}` : ""}. He is ${handles}.`,
  },
];
