import { describe, it, expect } from 'vitest';
import { generateMap, hexDistance, hexNeighbors, hexRing, axialToPixel, pixelToAxial } from '@/lib/game/map';
import { BIOMES } from '@/lib/constants';

describe('hex math', () => {
  it('calculates distance between adjacent hexes as 1', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
  });

  it('calculates distance between non-adjacent hexes', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2);
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3);
  });

  it('returns 6 neighbors', () => {
    const neighbors = hexNeighbors(0, 0);
    expect(neighbors).toHaveLength(6);
    for (const n of neighbors) {
      expect(hexDistance({ q: 0, r: 0 }, n)).toBe(1);
    }
  });

  it('returns correct ring size', () => {
    const ring1 = hexRing({ q: 0, r: 0 }, 1);
    expect(ring1).toHaveLength(6);
    const ring2 = hexRing({ q: 0, r: 0 }, 2);
    expect(ring2).toHaveLength(12);
    const ring3 = hexRing({ q: 0, r: 0 }, 3);
    expect(ring3).toHaveLength(18);
  });

  it('ring hexes are at exact distance', () => {
    const ring2 = hexRing({ q: 0, r: 0 }, 2);
    for (const h of ring2) {
      expect(hexDistance({ q: 0, r: 0 }, h)).toBe(2);
    }
  });

  it('converts axial to pixel and back', () => {
    const pixel = axialToPixel(3, -2);
    const back = pixelToAxial(pixel.x, pixel.y);
    expect(back.q).toBe(3);
    expect(back.r).toBe(-2);
  });
});

describe('map generation', () => {
  it('generates correct hex count for player count', () => {
    const hexes = generateMap(6);
    // ~9 * 6 = 54, with some variance for border
    expect(hexes.length).toBeGreaterThanOrEqual(40);
    expect(hexes.length).toBeLessThanOrEqual(80);
  });

  it('all hexes have valid biome types', () => {
    const hexes = generateMap(6);
    const validBiomes = Object.keys(BIOMES);
    for (const hex of hexes) {
      expect(validBiomes).toContain(hex.biome);
    }
  });

  it('contains scar hexes including near center', () => {
    const hexes = generateMap(6);
    const scars = hexes.filter(h => h.biome === 'scar');
    expect(scars.length).toBeGreaterThan(0);
    // At least one scar at center (the hull)
    const centerScars = scars.filter(s => hexDistance({ q: 0, r: 0 }, s) <= 1);
    expect(centerScars.length).toBeGreaterThan(0);
  });

  it('chasm hexes form outer border', () => {
    const hexes = generateMap(6);
    const chasms = hexes.filter(h => h.biome === 'chasm');
    expect(chasms.length).toBeGreaterThan(0);
    // All chasms should be on the outer ring
    const maxDist = Math.max(...hexes.map(h => hexDistance({ q: 0, r: 0 }, h)));
    for (const chasm of chasms) {
      expect(hexDistance({ q: 0, r: 0 }, chasm)).toBe(maxDist);
    }
  });

  it('places ship parts in scars and ruins', () => {
    const hexes = generateMap(6);
    const parted = hexes.filter(h => h.ship_part);
    expect(parted.length).toBeGreaterThan(0);
    for (const h of parted) {
      expect(['scar', 'ruin']).toContain(h.biome);
    }
  });

  it('designates a hull hex', () => {
    const result = generateMap(6);
    const hull = result.find(h => h.isHull);
    expect(hull).toBeDefined();
    expect(hull!.biome).toBe('scar');
  });

  it('generates spawn points spread apart', () => {
    const hexes = generateMap(6);
    const spawns = hexes.filter(h => h.isSpawn);
    expect(spawns.length).toBe(6);
    // Check minimum spacing
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        expect(hexDistance(spawns[i], spawns[j])).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('spawn points are on passable biomes', () => {
    const hexes = generateMap(6);
    const spawns = hexes.filter(h => h.isSpawn);
    for (const spawn of spawns) {
      expect(BIOMES[spawn.biome].passable).toBe(true);
    }
  });
});
