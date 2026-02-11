import { describe, it, expect } from 'vitest';
import { resolveBuild, resolveCraft } from '@/lib/game/build-craft';
import type { Player } from '@/lib/types';

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
    inventory: [
      { id: 'salvage', quantity: 10 },
      { id: 'biostock', quantity: 5 },
      { id: 'energy_cells', quantity: 3 },
    ],
    equipment: {},
    discoveries: [],
    position_q: 2,
    position_r: 1,
    camp_q: 2,
    camp_r: 1,
    structures: [],
    stash: [],
    buffs: {},
    is_alive: true,
    is_winner: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('building', () => {
  it('adds structure to player camp', () => {
    const player = makePlayer();
    const result = resolveBuild(player, 'lean_to');
    expect(result.success).toBe(true);
    expect(result.player.structures).toContain('lean_to');
  });

  it('sets camp location if none exists', () => {
    const player = makePlayer({ camp_q: null, camp_r: null });
    const result = resolveBuild(player, 'lean_to');
    expect(result.success).toBe(true);
    expect(result.player.camp_q).toBe(player.position_q);
    expect(result.player.camp_r).toBe(player.position_r);
  });

  it('fails if missing materials', () => {
    const player = makePlayer({ inventory: [] });
    const result = resolveBuild(player, 'lean_to');
    expect(result.success).toBe(false);
    expect(result.error).toContain('salvage');
  });

  it('rejects beyond max structures', () => {
    const player = makePlayer({
      structures: ['lean_to', 'bed', 'stash', 'workbench', 'signal_fire', 'scanner_array'],
    });
    const result = resolveBuild(player, 'barricade');
    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum');
  });

  it('consumes materials on success', () => {
    const player = makePlayer({ inventory: [{ id: 'salvage', quantity: 5 }] });
    const result = resolveBuild(player, 'lean_to'); // costs 3 salvage
    expect(result.success).toBe(true);
    const salvage = result.player.inventory.find(i => i.id === 'salvage');
    expect(salvage!.quantity).toBe(2);
  });
});

describe('crafting', () => {
  it('creates item and adds to inventory', () => {
    const player = makePlayer({ structures: ['workbench'] });
    const result = resolveCraft(player, 'makeshift_knife');
    expect(result.success).toBe(true);
    expect(result.player.inventory.find(i => i.id === 'makeshift_knife')).toBeDefined();
  });

  it('requires workbench', () => {
    const player = makePlayer({ structures: [] });
    const result = resolveCraft(player, 'makeshift_knife');
    expect(result.success).toBe(false);
    expect(result.error).toContain('workbench');
  });

  it('auto-equips to empty slot', () => {
    const player = makePlayer({ structures: ['workbench'] });
    const result = resolveCraft(player, 'makeshift_knife');
    expect(result.success).toBe(true);
    expect(result.player.equipment.tool).toBe('makeshift_knife');
  });

  it('does not auto-equip if slot is taken', () => {
    const player = makePlayer({
      structures: ['workbench'],
      equipment: { tool: 'existing_tool' },
    });
    const result = resolveCraft(player, 'makeshift_knife');
    expect(result.success).toBe(true);
    expect(result.player.equipment.tool).toBe('existing_tool');
  });
});
