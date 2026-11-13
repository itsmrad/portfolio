/**
 * SLOT (command + theme branch): mounted once at the end of <body>.
 *
 * Renders nothing until filled. Put here: the always-on key listener (at most
 * 1 KB; ignores typing in inputs and events with Ctrl/Meta/Alt), the lazy
 * palette dialog and the phone dock. Shortcuts that need no palette (nav keys,
 * `d`, `m`, `r`, `g` chords) run in the listener from ./shortcuts.
 */
export function CommandRoot() {
  return null;
}
