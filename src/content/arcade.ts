/**
 * Copy for the arcade shell (the cartridge cards in the wide margins). Game
 * names and how-to lines live in the registry files next to the games
 * (components/arcade/games/registry-*.ts). Names are the site's own (R15).
 */
export const arcadeCopy = {
  /** Landmark name of the layer holding the cartridges. */
  label: "Arcade",
  index: "Arcade",
  indexHowTo: "Small games in the margins. Pick one; Esc stops it.",
  cart: "Cart.",
  play: "Play",
  best: "Best",
  score: "Score",
  close: "Close",
  loading: "Loading…",
  paused: "Paused · click to go on",
  over: "Done.",
  newBest: "New best!",
  again: "Space or click to play again",
  failed: "Could not load. Try again.",
  started: "playing. Esc to stop.",
  stopped: "stopped.",
} as const;
