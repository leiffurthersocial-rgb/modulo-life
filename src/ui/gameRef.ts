import type { Game } from '@/game/Game';

/**
 * The single live Game instance. Panels reach the engine through this rather
 * than threading a prop down every component.
 */
let current: Game | null = null;

export function setGame(game: Game | null): void {
  current = game;
}

export function getGame(): Game | null {
  return current;
}
