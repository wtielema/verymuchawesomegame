import { GAME_DEFAULTS } from '@/lib/constants';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion

export function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function createInitialPlayer(name: string, avatar: string) {
  return {
    name,
    avatar,
    health: GAME_DEFAULTS.startingHealth,
    energy: GAME_DEFAULTS.startingEnergy,
    max_energy: GAME_DEFAULTS.startingEnergy,
    inventory: [] as { id: string; quantity: number }[],
    equipment: {} as Record<string, string>,
    discoveries: [] as string[],
    structures: [] as string[],
    stash: [] as { id: string; quantity: number }[],
    buffs: {} as Record<string, unknown>,
    is_alive: true,
  };
}

export function validateGameStart(playerCount: number): { valid: boolean; error?: string } {
  if (playerCount < GAME_DEFAULTS.minPlayers) {
    return { valid: false, error: `Need at least ${GAME_DEFAULTS.minPlayers} players to start` };
  }
  if (playerCount > GAME_DEFAULTS.maxPlayers) {
    return { valid: false, error: `Maximum ${GAME_DEFAULTS.maxPlayers} players allowed` };
  }
  return { valid: true };
}

export function calculateSeats(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount * GAME_DEFAULTS.seatPercentage));
}

export function calculateRequiredParts(playerCount: number): number {
  return calculateSeats(playerCount) * GAME_DEFAULTS.shipPartsMultiplier;
}
