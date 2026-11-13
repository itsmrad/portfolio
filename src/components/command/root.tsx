/**
 * Mounted once at the end of <body> (command branch): the always-on key
 * listener with the lazy palette, and the phone dock.
 *
 * The listener gets two tiny key maps built here from the registry, so the
 * registry and the content file stay out of first-load JavaScript.
 */
import { resumePdf } from "@/lib/resume";
import { Commands } from "@/components/command/commands";
import { Dock } from "@/components/command/dock";
import { actions } from "@/components/command/shortcuts";

export function CommandRoot() {
  const resume = resumePdf() !== null;
  const keys: Record<string, string> = {};
  const chords: Record<string, string> = {};
  for (const action of actions) {
    if (action.id === "resume" && !resume) continue;
    if (action.key) {
      const inPage = action.href?.startsWith("/#");
      keys[action.key] = action.control ? "click" : inPage ? action.href! : action.id;
    }
    if (action.chord && action.href) chords[action.chord] = action.href;
  }

  return (
    <>
      <Commands keys={keys} chords={chords} resume={resume} />
      <Dock />
    </>
  );
}
