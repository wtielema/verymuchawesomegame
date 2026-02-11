import { describe, it, expect } from 'vitest';
import { resolveTick } from '@/lib/game/tick';
import type { Game, Player, Hex, Action } from '@/lib/types';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    code: 'ABCDEF',
    name: 'Test',
    status: 'active',
    tick_number: 1,
    next_tick_at: null,
    hostility: 0,
    config: { seats: 2 },
    hull_q: 0,
    hull_r: 0,
    parts_installed: 0,
    parts_required: 4,
    launch_countdown: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makePlayer(id: string, q: number, r: number, overrides: Partial<Player> = {}): Player {
  return {
    id,
    game_id: 'g1',
    user_id: null,
    name: `Player ${id}`,
    avatar: 'default',
    health: 100,
    energy: 3,
    max_energy: 3,
    inventory: [{ id: 'rations', quantity: 5 }],
    equipment: {},
    discoveries: [],
    position_q: q,
    position_r: r,
    camp_q: q,
    camp_r: r,
    structures: ['lean_to'],
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

function makeAction(playerId: string, type: string, params: Record<string, unknown> = {}): Action {
  return {
    id: `a-${playerId}-${type}`,
    game_id: 'g1',
    player_id: playerId,
    tick_number: 1,
    action_type: type as Action['action_type'],
    params,
    energy_cost: 1,
    resolved: false,
    created_at: new Date().toISOString(),
  };
}

const hexes = [
  makeHex(0, 0, 'scar'),
  makeHex(1, 0, 'flats'),
  makeHex(0, 1, 'biolume_forest'),
  makeHex(-1, 0, 'crystal_ridge'),
  makeHex(-1, 1, 'fungal_marsh'),
  makeHex(0, -1, 'vent_fields'),
  makeHex(1, -1, 'ruin'),
  makeHex(2, 0, 'flats'),
];

describe('tick resolution', () => {
  it('advances tick number', () => {
    const game = makeGame({ tick_number: 5 });
    const result = resolveTick({ game, players: [makePlayer('p1', 0, 0)], hexes, actions: [] });
    expect(result.gameUpdates.tick_number).toBe(6);
  });

  it('resolves move actions', () => {
    const player = makePlayer('p1', 0, 0);
    const action = makeAction('p1', 'move', { target_q: 1, target_r: 0 });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [action] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    expect(playerUpdate?.position_q).toBe(1);
    expect(playerUpdate?.position_r).toBe(0);
  });

  it('resolves gather — adds resources', () => {
    const player = makePlayer('p1', 0, 1); // biolume_forest
    const action = makeAction('p1', 'gather', {});
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [action] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    expect(playerUpdate?.inventory).toBeDefined();
    // Should have gained some resources from biolume_forest (rations or biostock)
    const totalResources = playerUpdate!.inventory!.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalResources).toBeGreaterThan(0);
  });

  it('consumes 1 ration per player', () => {
    const player = makePlayer('p1', 0, 0, { inventory: [{ id: 'rations', quantity: 3 }] });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    const rations = playerUpdate!.inventory!.find(i => i.id === 'rations');
    expect(rations!.quantity).toBe(2);
  });

  it('starvation causes health loss', () => {
    const player = makePlayer('p1', 0, 0, { inventory: [] });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    expect(playerUpdate!.health!).toBeLessThan(100);
  });

  it('restores energy based on shelter', () => {
    const player = makePlayer('p1', 0, 0, {
      energy: 1,
      max_energy: 9,
      structures: ['lean_to'],
      camp_q: 0,
      camp_r: 0,
    });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    // At camp with shelter: +3 energy, capped at max
    expect(playerUpdate!.energy!).toBe(4); // 1 + 3
  });

  it('less energy recovery without shelter', () => {
    const player = makePlayer('p1', 1, 0, {
      energy: 1,
      max_energy: 9,
      structures: [],
      camp_q: null,
      camp_r: null,
    });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    // No shelter: +2 energy
    expect(playerUpdate!.energy!).toBe(3); // 1 + 2
  });

  it('rested buff grants +1 energy', () => {
    const player = makePlayer('p1', 0, 0, {
      energy: 1,
      max_energy: 9,
      structures: ['lean_to', 'bed'],
      camp_q: 0,
      camp_r: 0,
      buffs: { rested: true },
    });
    const result = resolveTick({ game: makeGame(), players: [player], hexes, actions: [] });

    const playerUpdate = result.playerUpdates.find(u => u.id === 'p1');
    // Sheltered +3, rested +1 = +4
    expect(playerUpdate!.energy!).toBe(5); // 1 + 4
  });

  it('escalates planet hostility', () => {
    const game = makeGame({ tick_number: 10, hostility: 0.3 });
    const result = resolveTick({ game, players: [makePlayer('p1', 0, 0)], hexes, actions: [] });

    expect(result.gameUpdates.hostility).toBeGreaterThan(0.3);
  });

  it('generates a report per player', () => {
    const players = [makePlayer('p1', 0, 0), makePlayer('p2', 1, 0)];
    const result = resolveTick({ game: makeGame(), players, hexes, actions: [] });

    expect(result.reports).toHaveLength(2);
    expect(result.reports[0].player_id).toBe('p1');
    expect(result.reports[1].player_id).toBe('p2');
  });
});
