import { describe, it, expect } from 'vitest';
import { BIOMES, RESOURCES, STRUCTURES, EQUIPMENT_SLOTS, ACTIONS, GAME_DEFAULTS } from '@/lib/constants';

describe('constants', () => {
  it('defines all 7 biome types plus chasm', () => {
    const biomeIds = Object.keys(BIOMES);
    expect(biomeIds).toContain('flats');
    expect(biomeIds).toContain('biolume_forest');
    expect(biomeIds).toContain('fungal_marsh');
    expect(biomeIds).toContain('crystal_ridge');
    expect(biomeIds).toContain('ruin');
    expect(biomeIds).toContain('vent_fields');
    expect(biomeIds).toContain('scar');
    expect(biomeIds).toContain('chasm');
    expect(biomeIds).toHaveLength(8);
  });

  it('each biome has yield ranges and risk level', () => {
    for (const [id, biome] of Object.entries(BIOMES)) {
      if (id === 'chasm') continue;
      expect(biome.risk).toBeGreaterThanOrEqual(0);
      expect(biome.risk).toBeLessThanOrEqual(1);
      expect(biome.yields).toBeDefined();
    }
  });

  it('defines 4 resource types plus ship_parts', () => {
    expect(Object.keys(RESOURCES)).toEqual(
      expect.arrayContaining(['rations', 'salvage', 'biostock', 'energy_cells', 'ship_parts'])
    );
  });

  it('defines 7 structures each with cost and build time', () => {
    expect(Object.keys(STRUCTURES)).toHaveLength(7);
    for (const structure of Object.values(STRUCTURES)) {
      expect(structure.cost).toBeDefined();
      expect(structure.buildActions).toBeGreaterThanOrEqual(1);
    }
  });

  it('defines 4 equipment slots', () => {
    expect(EQUIPMENT_SLOTS).toEqual(['tool', 'weapon', 'suit', 'device']);
  });

  it('defines all action types with energy costs', () => {
    const actionIds = Object.keys(ACTIONS);
    expect(actionIds).toContain('move');
    expect(actionIds).toContain('gather');
    expect(actionIds).toContain('explore');
    expect(actionIds).toContain('build');
    expect(actionIds).toContain('craft');
    expect(actionIds).toContain('sleep');
    expect(actionIds).toContain('attack');
    expect(actionIds).toContain('hide');
    expect(actionIds).toContain('install_part');
    for (const action of Object.values(ACTIONS)) {
      expect(action.energyCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('game defaults are sensible', () => {
    expect(GAME_DEFAULTS.tickIntervalHours).toBe(12);
    expect(GAME_DEFAULTS.maxEnergy).toBe(9);
    expect(GAME_DEFAULTS.baseEnergyPerTick).toBe(3);
    expect(GAME_DEFAULTS.inventorySlots).toBe(6);
    expect(GAME_DEFAULTS.maxStructures).toBe(6);
    expect(GAME_DEFAULTS.stashSlots).toBe(8);
    expect(GAME_DEFAULTS.maxHealth).toBe(100);
    expect(GAME_DEFAULTS.seatPercentage).toBeCloseTo(0.35);
    expect(GAME_DEFAULTS.launchCountdownTicks).toBe(3);
    expect(GAME_DEFAULTS.shipPartsMultiplier).toBe(2);
  });
});
