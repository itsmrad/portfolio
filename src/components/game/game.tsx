/**
 * SLOT (sound + 404 branch): the playable 404.
 *
 * Renders nothing until filled. Contract:
 * - app/not-found.tsx stays a server shell that reads fine without the game.
 * - The game is a canvas loaded with next/dynamic({ ssr: false }) on a "play"
 *   press or when visible; desktop only; budget 12 KB for its lazy chunk.
 */
export function Game() {
  return null;
}
