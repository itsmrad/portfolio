/**
 * Registry B: four games from the second arcade engineer. See ../contract.ts
 * and handoff/rebuild-arcade.md. Each asks for a side so the four alternate
 * where both margins exist (from about 1424 px), and each sits in a stretch
 * that is free on its side, so no card of registry A or C moves up or down there:
 * - Paper plane, left, by Codenaya's "Agent runs that outlive a deploy": it keeps flying.
 * - Word check, right, by the stack's "Engineering" row: its words are the stack's own.
 * - Sheet sizes, right, and Centre punch, left, beside the FAQ.
 * At 1280 every card goes right and that margin holds only two more cards: the
 * plane and the words land clean, the other two follow the FAQ (see the handoff).
 */
import type { Entry } from "../contract";

export const games: Entry[] = [
  { id: "sheets", name: "Sheet sizes", howTo: "Arrows or drag slide every sheet. Two equal sheets make the next size up. Reach A0.", section: "faq", side: "right", load: () => import("./sheets") },
  { id: "punch", name: "Centre punch", howTo: "Click each mark before it shrinks away, or aim with arrows and press Space. Twenty seconds.", section: "faq", side: "left", load: () => import("./punch") },
  { id: "words", name: "Word check", howTo: "Type a five-letter word and press Enter. Six tries; the marks show what is right.", section: "stack", near: "Engineering", side: "right", load: () => import("./words") },
  { id: "plane", name: "Paper plane", howTo: "Space, click or tap to climb. Fly through the gaps; they narrow as you go.", section: "codenaya", near: "Agent runs that outlive", side: "left", load: () => import("./plane") },
];
