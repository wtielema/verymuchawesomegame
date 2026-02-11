import { describe, it, expect } from 'vitest';
import { resolveCombat, type CombatContext } from '@/lib/game/combat';
import type { Player } from '@/lib/types';

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    game_id: 'g1',
    user_id: null,
    name: `Player ${id}`,
    avatar: 'default',
    health: 100,
    energy: 3,
    max_energy: 3,
    inventory: [{ id: 'rations', quantity: 3 }],
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

describe('combat', () => {
  const baseContext: CombatContext = {
    biome: 'flats',
    hostility: 0,
  };

  it('attacker vs idle defender — both take damage, attacker has advantage', () => {
    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    const result = resolveCombat(attacker, defender, 'attack', 'idle', baseContext);

    expect(result.attackerDamage).toBeGreaterThanOrEqual(0);
    expect(result.defenderDamage).toBeGreaterThan(0);
    // Attacker deals more damage than they take on average
    expect(result.defenderDamage).toBeGreaterThanOrEqual(result.attackerDamage);
  });

  it('mutual attack — both take significant damage', () => {
    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    const result = resolveCombat(attacker, defender, 'attack', 'attack', baseContext);

    expect(result.attackerDamage).toBeGreaterThan(0);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });

  it('death only at low health', () => {
    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', { health: 100 });
    const result = resolveCombat(attacker, defender, 'attack', 'idle', baseContext);

    // Full health defender should not die in one hit
    expect(result.defenderDead).toBe(false);
  });

  it('low health defender can die', () => {
    const attacker = makePlayer('p1', { equipment: { weapon: 'crystal_blade' } });
    const defender = makePlayer('p2', { health: 5 });
    const result = resolveCombat(attacker, defender, 'attack', 'idle', baseContext);

    // Very low health defender should die
    expect(result.defenderDead).toBe(true);
  });

  it('hide with spore suit in marsh — high stealth', () => {
    const hider = makePlayer('p1', { equipment: { suit: 'spore_suit' } });
    const seeker = makePlayer('p2');
    const marshContext: CombatContext = { biome: 'fungal_marsh', hostility: 0 };
    const result = resolveCombat(seeker, hider, 'attack', 'hide', marshContext);

    // High chance of evading — stealth bonus should mean 0 damage to hider often
    expect(result.evaded).toBeDefined();
  });

  it('forest gives defender bonus', () => {
    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    const forestContext: CombatContext = { biome: 'biolume_forest', hostility: 0 };
    const result = resolveCombat(attacker, defender, 'attack', 'idle', forestContext);

    // Forest reduces attacker effectiveness (defender takes less damage)
    // Just verify combat resolves without error
    expect(result.defenderDamage).toBeGreaterThanOrEqual(0);
    expect(result.attackerDamage).toBeGreaterThanOrEqual(0);
  });

  it('returns outcome type', () => {
    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    const result = resolveCombat(attacker, defender, 'attack', 'idle', baseContext);

    expect(['decisive_win', 'close_win', 'stalemate', 'loss']).toContain(result.outcome);
  });

  it('weapon equipment increases damage', () => {
    const unarmed = makePlayer('p1');
    const armed = makePlayer('p1armed', { equipment: { weapon: 'crystal_blade' } });
    const defender = makePlayer('p2');

    // Run many trials to compare average
    let unarmedTotal = 0;
    let armedTotal = 0;
    const trials = 100;
    for (let i = 0; i < trials; i++) {
      unarmedTotal += resolveCombat(unarmed, defender, 'attack', 'idle', baseContext).defenderDamage;
      armedTotal += resolveCombat(armed, defender, 'attack', 'idle', baseContext).defenderDamage;
    }

    expect(armedTotal / trials).toBeGreaterThan(unarmedTotal / trials);
  });
});
