import { describe, it, expect } from 'vitest';
import { generateGameCode, validateGameStart, createInitialPlayer, calculateSeats, calculateRequiredParts } from '@/lib/game/lifecycle';
import { GAME_DEFAULTS } from '@/lib/constants';

describe('game lifecycle', () => {
  it('generates a 6-char alphanumeric code', () => {
    const code = generateGameCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateGameCode()));
    expect(codes.size).toBeGreaterThan(90);
  });

  it('creates an initial player with correct defaults', () => {
    const player = createInitialPlayer('Alice', 'avatar_1');
    expect(player.name).toBe('Alice');
    expect(player.avatar).toBe('avatar_1');
    expect(player.health).toBe(GAME_DEFAULTS.startingHealth);
    expect(player.energy).toBe(GAME_DEFAULTS.startingEnergy);
    expect(player.max_energy).toBe(GAME_DEFAULTS.startingEnergy);
    expect(player.inventory).toEqual([]);
    expect(player.equipment).toEqual({});
    expect(player.discoveries).toEqual([]);
    expect(player.structures).toEqual([]);
    expect(player.stash).toEqual([]);
    expect(player.buffs).toEqual({});
    expect(player.is_alive).toBe(true);
  });

  it('validates game start with 3+ players', () => {
    const result = validateGameStart(3);
    expect(result.valid).toBe(true);
  });

  it('rejects game start with < 3 players', () => {
    const result = validateGameStart(2);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects game start with > 20 players', () => {
    const result = validateGameStart(21);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('calculates correct seat count', () => {
    // floor(n * 0.35): 6→2, 10→3, 15→5, 20→7
    expect(calculateSeats(6)).toBe(2);
    expect(calculateSeats(10)).toBe(3);
    expect(calculateSeats(15)).toBe(5);
    expect(calculateSeats(20)).toBe(7);
  });

  it('calculates required ship parts', () => {
    expect(calculateRequiredParts(6)).toBe(4);   // 2 seats * 2
    expect(calculateRequiredParts(10)).toBe(6);  // 3 seats * 2
  });
});
