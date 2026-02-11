import { describe, it, expect } from 'vitest';
import { buildHexEventPrompt, parseEventResponse, generateFallbackEvent } from '@/lib/llm';
import { BIOMES } from '@/lib/constants';

describe('LLM integration', () => {
  it('builds prompt with full context', () => {
    const prompt = buildHexEventPrompt({
      biome: 'biolume_forest',
      action: 'gather',
      playerName: 'Alice',
      playerHealth: 80,
      playerEquipment: { tool: 'makeshift_knife' },
      hexHistory: ['Found glowing mushrooms'],
      hostility: 0.3,
      tickNumber: 5,
    });
    expect(prompt.system).toContain('Meridian');
    expect(prompt.user).toContain('biolume_forest');
    expect(prompt.user).toContain('gather');
    expect(prompt.user).toContain('Alice');
  });

  it('parses structured JSON from response', () => {
    const response = '{"narrative":"You find shimmering berries.","outcomes":{"rations":4,"biostock":1}}';
    const parsed = parseEventResponse(response, 'biolume_forest');
    expect(parsed.narrative).toContain('berries');
    expect(parsed.outcomes.rations).toBe(4);
    expect(parsed.outcomes.biostock).toBe(1);
  });

  it('clamps outcomes to biome yield ranges', () => {
    const response = '{"narrative":"Incredible haul!","outcomes":{"rations":999}}';
    const parsed = parseEventResponse(response, 'biolume_forest');
    const maxRations = BIOMES.biolume_forest.yields.rations!.max;
    expect(parsed.outcomes.rations).toBeLessThanOrEqual(maxRations);
  });

  it('handles malformed JSON gracefully', () => {
    const response = 'This is not JSON at all';
    const parsed = parseEventResponse(response, 'flats');
    expect(parsed.narrative).toBeTruthy();
    expect(parsed.outcomes).toBeDefined();
  });

  it('extracts JSON from mixed text response', () => {
    const response = 'Here is the result:\n```json\n{"narrative":"Found salvage.","outcomes":{"salvage":3}}\n```';
    const parsed = parseEventResponse(response, 'scar');
    expect(parsed.narrative).toContain('salvage');
    expect(parsed.outcomes.salvage).toBe(3);
  });

  it('falls back gracefully on LLM failure', () => {
    const result = generateFallbackEvent('biolume_forest', 'gather');
    expect(result.narrative).toBeTruthy();
    expect(result.outcomes).toBeDefined();
    // Should have some yield from biolume_forest
    const hasResource = Object.values(result.outcomes).some(v => typeof v === 'number' && v > 0);
    expect(hasResource).toBe(true);
  });

  it('generates different fallback events per biome', () => {
    const forest = generateFallbackEvent('biolume_forest', 'gather');
    const scar = generateFallbackEvent('scar', 'gather');
    // Different biomes should yield different resources
    expect(JSON.stringify(Object.keys(forest.outcomes))).not.toBe(JSON.stringify(Object.keys(scar.outcomes)));
  });

  it('generates fallback for explore action', () => {
    const result = generateFallbackEvent('ruin', 'explore');
    expect(result.narrative).toBeTruthy();
  });
});
