/**
 * Copy for the command palette, the keyboard shortcuts and the phone dock
 * (command branch). Facts and links come from site.ts; this file holds only
 * what these features say.
 */

/** The page's sections in order. `chord` is the key after `g`. Ids are the section ids. */
export const pageIndex = [
  { id: "top", label: "Home", chord: "h" },
  { id: "about", label: "About", chord: "a" },
  { id: "experience", label: "Experience", chord: "e" },
  { id: "work", label: "Selected work", chord: "w" },
  { id: "building", label: "Currently building", chord: "b" },
  { id: "activity", label: "GitHub activity", chord: "i" },
  { id: "stack", label: "Stack", chord: "s" },
  { id: "education", label: "Education", chord: "d" },
  { id: "contact", label: "Contact", chord: "c" },
] as const;

/** Palette rows and confirmations. */
export const commandCopy = {
  llms: "llms.txt",
  resume: "Download resume",
  call: "Book a call",
  copyEmail: "Copy email",
  copyLink: "Copy link",
  shortcuts: "Keyboard shortcuts",
  theme: "Toggle theme",
  sound: "Toggle sound",
  linkCopied: "Link copied",
  emailCopied: "Email copied",
  copyFailed: "Could not copy:",
} as const;
