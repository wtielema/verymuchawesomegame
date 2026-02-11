import type { BiomeType } from '@/lib/types';

export function calculateWeatherDamage(hostility: number, hasShelter: boolean): number {
  if (hostility <= 0) return 0;

  const baseDamage = hasShelter
    ? Math.floor(hostility * 5)
    : Math.floor(hostility * 15);

  return baseDamage;
}

export function shouldMutateBiome(hostility: number): boolean {
  // Probability scales with hostility: ~1% at 0.1, ~10% at 1.0
  const probability = hostility * 0.1;
  return Math.random() < probability;
}

// Mutation pathways: biomes degrade toward more hostile types
const MUTATION_MAP: Partial<Record<BiomeType, BiomeType[]>> = {
  flats: ['fungal_marsh', 'vent_fields'],
  biolume_forest: ['fungal_marsh', 'vent_fields'],
  crystal_ridge: ['vent_fields', 'scar'],
  fungal_marsh: ['vent_fields', 'chasm'],
  vent_fields: ['scar', 'chasm'],
  ruin: ['scar', 'vent_fields'],
};

export function mutateBiome(currentBiome: BiomeType): BiomeType {
  const options = MUTATION_MAP[currentBiome];
  if (!options || options.length === 0) return currentBiome;

  return options[Math.floor(Math.random() * options.length)];
}
