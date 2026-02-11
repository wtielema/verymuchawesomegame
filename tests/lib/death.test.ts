import { describe, it, expect } from 'vitest';
import { resolveDeath } from '@/lib/game/build-craft';
import type { Player, Hex } from '@/lib/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    game_id: 'g1',
    user_id: null,
    name: 'Alice',
    avatar: 'default',
    health: 0,
    energy: 3,
    max_energy: 3,
    inventory: [{ id: 'salvage', quantity: 5 }, { id: 'rations', quantity: 3 }],
    equipment: { weapon: 'crystal_blade' },
    discoveries: ['alien_script', 'fungal_spore'],
    position_q: 2,
    position_r: 1,
    camp_q: 2,
    camp_r: 1,
    structures: ['lean_to', 'workbench'],
    stash: [{ id: 'energy_cells', quantity: 4 }],
    buffs: {},
    is_alive: false,
    is_winner: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeHex(q: number, r: number, biome: string = 'flats'): Hex {
  return {
    id: `h-${q}-${r}`,
    game_id: 'g1',
    q, r,
    biome: biome as Hex['biome'],
    features: {},
    history: [],
    ship_part: false,
    ruins_loot: null,
  };
}

const spawns = [
  makeHex(5, 0), makeHex(-5, 0), makeHex(0, 5), makeHex(0, -5),
];

describe('death and respawn', () => {
  it('clears inventory and stash', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.player.inventory).toEqual([]);
    expect(result.player.stash).toEqual([]);
  });

  it('clears equipment', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.player.equipment).toEqual({});
  });

  it('keeps discoveries', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.player.discoveries).toEqual(['alien_script', 'fungal_spore']);
  });

  it('respawns with full health and alive', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.player.health).toBe(100);
    expect(result.player.is_alive).toBe(true);
  });

  it('respawn position is away from other players', () => {
    const player = makePlayer();
    const otherPositions = [{ q: 5, r: 0 }];
    const result = resolveDeath(player, spawns, otherPositions);

    // Should not respawn at the same position as another player
    expect(
      otherPositions.some(p => p.q === result.player.position_q && p.r === result.player.position_r)
    ).toBe(false);
  });

  it('old camp becomes ruins loot', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.ruinsHex).toBeDefined();
    expect(result.ruinsHex!.q).toBe(2);
    expect(result.ruinsHex!.r).toBe(1);
    expect(result.ruinsHex!.loot.length).toBeGreaterThan(0);
  });

  it('clears structures and camp', () => {
    const player = makePlayer();
    const result = resolveDeath(player, spawns, []);
    expect(result.player.structures).toEqual([]);
    expect(result.player.camp_q).toBeNull();
    expect(result.player.camp_r).toBeNull();
  });
});
