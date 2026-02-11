import { describe, it, expect } from 'vitest';
import { installPart, triggerLaunch, resolveLaunchCountdown, resolveVotes } from '@/lib/game/launch';
import type { Game, Player } from '@/lib/types';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    code: 'ABCDEF',
    name: 'Test',
    status: 'active',
    tick_number: 20,
    next_tick_at: null,
    hostility: 0.7,
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
    inventory: [],
    equipment: {},
    discoveries: [],
    position_q: q,
    position_r: r,
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

describe('launch sequence', () => {
  it('installing part at hull increases progress', () => {
    const game = makeGame({ hull_q: 0, hull_r: 0 });
    const player = makePlayer('p1', 0, 0, {
      inventory: [{ id: 'ship_parts', quantity: 1 }],
    });
    const result = installPart(game, player);
    expect(result.success).toBe(true);
    expect(result.partsInstalled).toBe(1);
    expect(result.player.inventory.find(i => i.id === 'ship_parts')).toBeUndefined();
  });

  it('rejects install when not at hull', () => {
    const game = makeGame({ hull_q: 0, hull_r: 0 });
    const player = makePlayer('p1', 3, 0, {
      inventory: [{ id: 'ship_parts', quantity: 1 }],
    });
    const result = installPart(game, player);
    expect(result.success).toBe(false);
    expect(result.error).toContain('hull');
  });

  it('rejects install without ship parts', () => {
    const game = makeGame({ hull_q: 0, hull_r: 0 });
    const player = makePlayer('p1', 0, 0);
    const result = installPart(game, player);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ship_parts');
  });

  it('launch requires enough parts', () => {
    const game = makeGame({ parts_installed: 2, parts_required: 4 });
    const result = triggerLaunch(game);
    expect(result.success).toBe(false);
    expect(result.error).toContain('parts');
  });

  it('trigger starts 3-tick countdown', () => {
    const game = makeGame({ parts_installed: 4, parts_required: 4 });
    const result = triggerLaunch(game);
    expect(result.success).toBe(true);
    expect(result.countdown).toBe(3);
  });

  it('countdown decrements each tick', () => {
    const game = makeGame({ launch_countdown: 3 });
    const result = resolveLaunchCountdown(game);
    expect(result.countdown).toBe(2);
    expect(result.launched).toBe(false);
  });

  it('launch resolves — players at hull win', () => {
    const game = makeGame({ launch_countdown: 1, hull_q: 0, hull_r: 0, config: { seats: 2 } });
    const players = [
      makePlayer('p1', 0, 0), // at hull
      makePlayer('p2', 0, 0), // at hull
      makePlayer('p3', 3, 0), // not at hull
    ];
    const result = resolveLaunchCountdown(game, players);
    expect(result.launched).toBe(true);
    expect(result.winners).toContain('p1');
    expect(result.winners).toContain('p2');
    expect(result.losers).toContain('p3');
  });

  it('vote to eject player when more players than seats', () => {
    const votes = [
      { voter_id: 'p1', target_id: 'p3' },
      { voter_id: 'p2', target_id: 'p3' },
      { voter_id: 'p3', target_id: 'p1' },
    ];
    const result = resolveVotes(votes, 2);
    expect(result.ejected).toContain('p3');
    expect(result.ejected).toHaveLength(1);
  });
});
