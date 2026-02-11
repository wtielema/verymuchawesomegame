import { BIOMES, GAME_DEFAULTS } from '@/lib/constants';
import type { BiomeType, HexCoord } from '@/lib/types';

export interface MapHex {
  q: number;
  r: number;
  biome: BiomeType;
  ship_part: boolean;
  isHull: boolean;
  isSpawn: boolean;
}

// --- Hex Math ---

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexNeighbors(q: number, r: number): HexCoord[] {
  return DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [{ q: center.q, r: center.r }];

  const results: HexCoord[] = [];
  // Start at the "bottom-left" of the ring
  let q = center.q - radius;
  let r = center.r + radius;

  for (let dir = 0; dir < 6; dir++) {
    for (let step = 0; step < radius; step++) {
      results.push({ q, r });
      q += DIRECTIONS[dir].q;
      r += DIRECTIONS[dir].r;
    }
  }

  return results;
}

const HEX_SIZE = 40; // pixels

export function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * (3 / 2) * r;
  return { x, y };
}

export function pixelToAxial(x: number, y: number): HexCoord {
  const r = (2 / 3) * y / HEX_SIZE;
  const q = (Math.sqrt(3) / 3 * x - y / 3) / HEX_SIZE;
  return { q: Math.round(q), r: Math.round(r) };
}

// --- Map Generation ---

// Biome weights for inner hexes (not center, not outer ring)
const INNER_BIOME_WEIGHTS: [BiomeType, number][] = [
  ['flats', 25],
  ['biolume_forest', 20],
  ['crystal_ridge', 15],
  ['fungal_marsh', 10],
  ['vent_fields', 10],
  ['ruin', 12],
  ['scar', 8],
];

function pickWeightedBiome(weights: [BiomeType, number][]): BiomeType {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [biome, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return biome;
  }
  return weights[0][0];
}

export function generateMap(playerCount: number): MapHex[] {
  const targetHexCount = GAME_DEFAULTS.hexesPerPlayer * playerCount;
  // Calculate radius needed: hex count in a filled hexagon of radius R = 3R² + 3R + 1
  // Solve for R given target count
  let radius = 1;
  while (3 * radius * radius + 3 * radius + 1 < targetHexCount) {
    radius++;
  }

  const hexes: MapHex[] = [];

  // Center hex: always scar (Meridian crash), this is the hull
  hexes.push({ q: 0, r: 0, biome: 'scar', ship_part: false, isHull: true, isSpawn: false });

  // Build rings from 1 to radius
  for (let ring = 1; ring <= radius; ring++) {
    const ringHexes = hexRing({ q: 0, r: 0 }, ring);

    for (const coord of ringHexes) {
      let biome: BiomeType;

      if (ring === radius) {
        // Outer ring: chasm border
        biome = 'chasm';
      } else if (ring === 1) {
        // Inner ring: safer biomes + scar
        const innerWeights: [BiomeType, number][] = [
          ['scar', 30],
          ['flats', 30],
          ['biolume_forest', 25],
          ['crystal_ridge', 15],
        ];
        biome = pickWeightedBiome(innerWeights);
      } else {
        // Mid/outer rings: full distribution
        biome = pickWeightedBiome(INNER_BIOME_WEIGHTS);
      }

      hexes.push({
        q: coord.q,
        r: coord.r,
        biome,
        ship_part: false,
        isHull: false,
        isSpawn: false,
      });
    }
  }

  // Place ship parts in scar and ruin hexes
  const seats = Math.max(1, Math.floor(playerCount * GAME_DEFAULTS.seatPercentage));
  const totalParts = seats * GAME_DEFAULTS.shipPartsMultiplier;
  const eligibleForParts = hexes.filter(h => (h.biome === 'scar' || h.biome === 'ruin') && !h.isHull);

  // Shuffle eligible hexes and assign ship parts
  const shuffled = [...eligibleForParts].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(totalParts, shuffled.length); i++) {
    const hex = hexes.find(h => h.q === shuffled[i].q && h.r === shuffled[i].r)!;
    hex.ship_part = true;
  }

  // If not enough scar/ruin hexes, force-convert some flats to ruin
  if (shuffled.length < totalParts) {
    const flats = hexes.filter(h => h.biome === 'flats' && !h.isHull);
    const extra = flats.sort(() => Math.random() - 0.5);
    for (let i = 0; i < totalParts - shuffled.length && i < extra.length; i++) {
      extra[i].biome = 'ruin';
      extra[i].ship_part = true;
    }
  }

  // Select spawn points: passable hexes in rings 2 to radius-1, spread apart
  const passable = hexes.filter(h =>
    BIOMES[h.biome].passable &&
    !h.isHull &&
    hexDistance({ q: 0, r: 0 }, h) >= 2 &&
    hexDistance({ q: 0, r: 0 }, h) < radius
  );

  const spawns: MapHex[] = [];
  const candidates = [...passable].sort(() => Math.random() - 0.5);

  for (const candidate of candidates) {
    if (spawns.length >= playerCount) break;

    const farEnough = spawns.every(s => hexDistance(s, candidate) >= 2);
    if (farEnough) {
      candidate.isSpawn = true;
      spawns.push(candidate);
    }
  }

  // If not enough spawns with distance 2, relax constraint
  if (spawns.length < playerCount) {
    for (const candidate of candidates) {
      if (spawns.length >= playerCount) break;
      if (!candidate.isSpawn) {
        candidate.isSpawn = true;
        spawns.push(candidate);
      }
    }
  }

  return hexes;
}
