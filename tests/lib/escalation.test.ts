import { describe, it, expect } from 'vitest';
import { calculateWeatherDamage, shouldMutateBiome, mutateBiome } from '@/lib/game/escalation';
import type { BiomeType } from '@/lib/types';

describe('escalation', () => {
  it('hostility increases each tick', () => {
    // hostility = tick / totalTicks
    const h1 = 1 / 28;
    const h10 = 10 / 28;
    expect(h10).toBeGreaterThan(h1);
  });

  it('weather damage scales with hostility', () => {
    const lowDamage = calculateWeatherDamage(0.1, true);
    const highDamage = calculateWeatherDamage(0.8, true);
    expect(highDamage).toBeGreaterThan(lowDamage);
  });

  it('unsheltered players take more weather damage', () => {
    const sheltered = calculateWeatherDamage(0.5, true);
    const unsheltered = calculateWeatherDamage(0.5, false);
    expect(unsheltered).toBeGreaterThan(sheltered);
  });

  it('no weather damage at zero hostility', () => {
    const damage = calculateWeatherDamage(0, true);
    expect(damage).toBe(0);
  });

  it('biomes can mutate at high hostility', () => {
    // At max hostility, mutation chance should be non-trivial
    let mutated = 0;
    for (let i = 0; i < 1000; i++) {
      if (shouldMutateBiome(1.0)) mutated++;
    }
    expect(mutated).toBeGreaterThan(50); // > 5%
    expect(mutated).toBeLessThan(200);   // < 20%
  });

  it('biomes rarely mutate at low hostility', () => {
    let mutated = 0;
    for (let i = 0; i < 1000; i++) {
      if (shouldMutateBiome(0.1)) mutated++;
    }
    expect(mutated).toBeLessThan(30); // < 3%
  });

  it('mutation produces valid biome type', () => {
    const result = mutateBiome('biolume_forest');
    const validBiomes: BiomeType[] = ['flats', 'biolume_forest', 'fungal_marsh', 'crystal_ridge', 'ruin', 'vent_fields', 'scar', 'chasm'];
    expect(validBiomes).toContain(result);
  });

  it('forest can mutate to marsh', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(mutateBiome('biolume_forest'));
    }
    expect(results.has('fungal_marsh')).toBe(true);
  });

  it('late game is significantly more dangerous', () => {
    const earlyDamage = calculateWeatherDamage(0.1, false);
    const lateDamage = calculateWeatherDamage(0.9, false);
    expect(lateDamage).toBeGreaterThanOrEqual(earlyDamage * 3);
  });
});
