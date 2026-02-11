import { GAME_DEFAULTS } from '@/lib/constants';
import { hexDistance } from '@/lib/game/map';
import type { HexCoord } from '@/lib/types';

export function getVisibleHexes<T extends HexCoord>(
  playerPosition: HexCoord,
  scannerBonus: number,
  factionMemberPositions: HexCoord[],
  allHexes: T[],
): T[] {
  const visionRange = GAME_DEFAULTS.baseVisionRange + scannerBonus;

  // Collect all observer positions
  const observers: HexCoord[] = [playerPosition, ...factionMemberPositions];

  // A hex is visible if it's within range of any observer
  return allHexes.filter(hex =>
    observers.some(obs => hexDistance(obs, hex) <= visionRange)
  );
}
