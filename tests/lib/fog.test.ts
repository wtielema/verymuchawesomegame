import { describe, it, expect } from 'vitest';
import { getVisibleHexes } from '@/lib/game/fog';
import { generateMap, hexDistance } from '@/lib/game/map';
import type { HexCoord } from '@/lib/types';

// Use a fixed map for testing
const testHexes = generateMap(6);

describe('fog of war', () => {
  it('base vision is 1 hex radius', () => {
    const position: HexCoord = { q: 0, r: 0 };
    const visible = getVisibleHexes(position, 0, [], testHexes);

    // Should include position itself + all neighbors at distance 1
    for (const h of visible) {
      expect(hexDistance(position, h)).toBeLessThanOrEqual(1);
    }

    // Should not include hexes at distance 2+
    const atDist2 = testHexes.filter(h => hexDistance(position, h) === 2);
    for (const h of atDist2) {
      expect(visible.find(v => v.q === h.q && v.r === h.r)).toBeUndefined();
    }
  });

  it('scanner array extends vision by 1', () => {
    const position: HexCoord = { q: 0, r: 0 };
    const visible = getVisibleHexes(position, 1, [], testHexes);

    // Should include hexes at distance 2
    const atDist2 = testHexes.filter(h => hexDistance(position, h) === 2);
    for (const h of atDist2) {
      expect(visible.find(v => v.q === h.q && v.r === h.r)).toBeDefined();
    }
  });

  it('faction members share vision', () => {
    const position: HexCoord = { q: 0, r: 0 };
    const allyPosition: HexCoord = { q: 3, r: 0 };

    const visible = getVisibleHexes(position, 0, [allyPosition], testHexes);

    // Should see hexes around ally too
    const aroundAlly = testHexes.filter(h => hexDistance(allyPosition, h) <= 1);
    for (const h of aroundAlly) {
      expect(visible.find(v => v.q === h.q && v.r === h.r)).toBeDefined();
    }
  });

  it('does not reveal beyond vision range', () => {
    const position: HexCoord = { q: 0, r: 0 };
    const visible = getVisibleHexes(position, 0, [], testHexes);

    const farHexes = testHexes.filter(h => hexDistance(position, h) > 1);
    for (const h of farHexes) {
      expect(visible.find(v => v.q === h.q && v.r === h.r)).toBeUndefined();
    }
  });
});
