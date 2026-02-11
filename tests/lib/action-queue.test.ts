import { describe, it, expect } from 'vitest';
import { validateAction } from '@/lib/game/actions';
import { ACTIONS, GAME_DEFAULTS } from '@/lib/constants';
import type { Player, Hex } from '@/lib/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    game_id: 'g1',
    user_id: null,
    name: 'Alice',
    avatar: 'default',
    health: 100,
    energy: 3,
    max_energy: 3,
    inventory: [],
    equipment: {},
    discoveries: [],
    position_q: 0,
    position_r: 0,
    camp_q: null,
    camp_r: null,
    structures: [],
    stash: [],
    buffs: {},
    is_alive: true,
    is_winner: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeHex(q: number, r: number, biome: string = 'flats'): Hex {
  return {
    id: `h-${q}-${r}`,
    game_id: 'g1',
    q,
    r,
    biome: biome as Hex['biome'],
    features: {},
    history: [],
    ship_part: false,
    ruins_loot: null,
  };
}

describe('action validation', () => {
  const hexes = [
    makeHex(0, 0),
    makeHex(1, 0),
    makeHex(0, 1),
    makeHex(1, -1),
    makeHex(-1, 1),
    makeHex(-1, 0),
    makeHex(0, -1),
    makeHex(2, 0, 'chasm'),
  ];

  it('accepts a valid move to adjacent hex', () => {
    const player = makePlayer({ energy: 3 });
    const result = validateAction(player, 'move', { target_q: 1, target_r: 0 }, hexes, 0);
    expect(result.valid).toBe(true);
  });

  it('rejects move to non-adjacent hex', () => {
    const player = makePlayer({ energy: 3 });
    const result = validateAction(player, 'move', { target_q: 2, target_r: 0 }, hexes, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('adjacent');
  });

  it('rejects move to impassable hex', () => {
    const player = makePlayer({ energy: 3, position_q: 1, position_r: 0 });
    const result = validateAction(player, 'move', { target_q: 2, target_r: 0 }, hexes, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('impassable');
  });

  it('rejects actions when energy is insufficient', () => {
    const player = makePlayer({ energy: 0 });
    const result = validateAction(player, 'gather', {}, hexes, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('energy');
  });

  it('rejects actions when energy would be exceeded with queued cost', () => {
    const player = makePlayer({ energy: 2 });
    const result = validateAction(player, 'attack', {}, hexes, 1); // attack=2, queued=1, total=3 > 2
    expect(result.valid).toBe(false);
  });

  it('accepts gather on current hex', () => {
    const player = makePlayer({ energy: 3 });
    const result = validateAction(player, 'gather', {}, hexes, 0);
    expect(result.valid).toBe(true);
  });

  it('accepts sleep action with 0 energy cost', () => {
    const player = makePlayer({ energy: 0 });
    const result = validateAction(player, 'sleep', {}, hexes, 0);
    expect(result.valid).toBe(true);
  });

  it('rejects actions from dead players', () => {
    const player = makePlayer({ is_alive: false });
    const result = validateAction(player, 'gather', {}, hexes, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('alive');
  });

  it('validates build requires structure param', () => {
    const player = makePlayer({ energy: 3 });
    const result = validateAction(player, 'build', {}, hexes, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('structure');
  });

  it('accepts valid build action', () => {
    const player = makePlayer({
      energy: 3,
      inventory: [{ id: 'salvage', quantity: 5 }],
    });
    const result = validateAction(player, 'build', { structure_id: 'lean_to' }, hexes, 0);
    expect(result.valid).toBe(true);
  });
});
