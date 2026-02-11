import { BIOMES } from '@/lib/constants';
import type { BiomeType } from '@/lib/types';

export interface HexEventContext {
  biome: string;
  action: string;
  playerName: string;
  playerHealth: number;
  playerEquipment: Record<string, string>;
  hexHistory: string[];
  hostility: number;
  tickNumber: number;
}

export interface HexEventResult {
  narrative: string;
  outcomes: Record<string, number>;
}

interface PromptParts {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = `You are the narrator for Meridian, a survival strategy game set on an alien planet.
Players are astronauts stranded after the colony ship Meridian crashed. They must survive, explore, and eventually repair the ship to escape — but there aren't enough seats for everyone.

Your role: narrate what happens when a player performs an action on a hex. Be vivid, concise (2-3 sentences), and match the tone: weird planet meets pulp adventure. Strange, beautiful, dangerous — but fun.

You MUST respond with valid JSON matching this schema:
{
  "narrative": "2-3 sentence story of what happened",
  "outcomes": { "resource_id": amount, ... }
}

Valid resource IDs: rations, salvage, biostock, energy_cells, ship_parts
Outcomes must be integers within the yield ranges provided for the biome.
Do NOT invent new resource types. Do NOT exceed yield ranges.`;

export function buildHexEventPrompt(context: HexEventContext): PromptParts {
  const biomeDef = BIOMES[context.biome as BiomeType];
  const yieldsDesc = biomeDef?.yields
    ? Object.entries(biomeDef.yields)
        .map(([resource, range]) => `${resource}: ${range.min}-${range.max}`)
        .join(', ')
    : 'none';

  const user = `Biome: ${context.biome} (${biomeDef?.name ?? context.biome})
Description: ${biomeDef?.description ?? 'Unknown terrain'}
Action: ${context.action}
Player: ${context.playerName} (health: ${context.playerHealth}/100)
Equipment: ${JSON.stringify(context.playerEquipment)}
Planet hostility: ${(context.hostility * 100).toFixed(0)}%
Tick: ${context.tickNumber}
Yield ranges for this biome: ${yieldsDesc}
Hex history: ${context.hexHistory.length > 0 ? context.hexHistory.join('; ') : 'First visit'}

Narrate what happens. Respond with JSON only.`;

  return { system: SYSTEM_PROMPT, user };
}

export async function callGemini(prompt: PromptParts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ parts: [{ text: prompt.user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 300,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export function parseEventResponse(text: string, biomeType: string): HexEventResult {
  // Try to extract JSON from response
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        json = JSON.parse(match[1].trim());
      } catch {
        return generateFallbackEvent(biomeType, 'gather');
      }
    } else {
      return generateFallbackEvent(biomeType, 'gather');
    }
  }

  const narrative = typeof json.narrative === 'string' ? json.narrative : 'Something happened...';
  const rawOutcomes = json.outcomes && typeof json.outcomes === 'object' ? json.outcomes : {};

  // Clamp outcomes to biome yield ranges
  const biomeDef = BIOMES[biomeType as BiomeType];
  const outcomes: Record<string, number> = {};

  for (const [resource, value] of Object.entries(rawOutcomes)) {
    if (typeof value !== 'number') continue;
    const amount = Math.floor(value);
    if (amount <= 0) continue;

    const yieldRange = biomeDef?.yields?.[resource as keyof typeof biomeDef.yields];
    if (yieldRange) {
      outcomes[resource] = Math.min(amount, yieldRange.max);
    } else {
      // Resource not typical for this biome — allow small amounts
      outcomes[resource] = Math.min(amount, 2);
    }
  }

  return { narrative, outcomes };
}

export function generateFallbackEvent(biomeType: string, action: string): HexEventResult {
  const biomeDef = BIOMES[biomeType as BiomeType];
  const outcomes: Record<string, number> = {};

  if (biomeDef?.yields) {
    for (const [resource, range] of Object.entries(biomeDef.yields)) {
      if (!range) continue;
      const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (amount > 0) {
        outcomes[resource] = amount;
      }
    }
  }

  const narratives: Record<string, string[]> = {
    gather: [
      `You scavenge the ${biomeDef?.name ?? 'terrain'}, finding what you can.`,
      `The ${biomeDef?.name ?? 'area'} yields its resources reluctantly.`,
      `A productive search through the ${biomeDef?.name?.toLowerCase() ?? 'landscape'}.`,
    ],
    explore: [
      `You push deeper into the ${biomeDef?.name?.toLowerCase() ?? 'unknown'}, noting landmarks.`,
      `The ${biomeDef?.name ?? 'terrain'} reveals new features as you explore.`,
      `Something catches your eye in the ${biomeDef?.name?.toLowerCase() ?? 'distance'}.`,
    ],
  };

  const options = narratives[action] ?? narratives.gather;
  const narrative = options[Math.floor(Math.random() * options.length)];

  return { narrative, outcomes };
}

export async function generateHexEvent(context: HexEventContext): Promise<HexEventResult> {
  try {
    const prompt = buildHexEventPrompt(context);
    const text = await callGemini(prompt);
    return parseEventResponse(text, context.biome);
  } catch {
    return generateFallbackEvent(context.biome, context.action);
  }
}

export async function generateEpilogue(playerContext: {
  playerName: string;
  position: { q: number; r: number };
  biome: string;
  inventory: { id: string; quantity: number }[];
  discoveries: string[];
  ticksSurvived: number;
}): Promise<string> {
  try {
    const prompt: PromptParts = {
      system: `You are the narrator for Meridian. Write a personal epilogue for a player who was stranded when the ship launched without them. 3-4 sentences. Bittersweet, memorable, fitting their journey. They are alone on this alien planet now.`,
      user: `Player: ${playerContext.playerName}
Location: ${playerContext.biome} hex at (${playerContext.position.q}, ${playerContext.position.r})
Inventory: ${JSON.stringify(playerContext.inventory)}
Discoveries: ${playerContext.discoveries.join(', ') || 'none'}
Ticks survived: ${playerContext.ticksSurvived}

Write their epilogue. Respond with plain text (no JSON).`,
    };

    return await callGemini(prompt);
  } catch {
    return `${playerContext.playerName} watched the launch module disappear into the alien sky. The planet was quiet now. There was nothing left to do but make this strange world home.`;
  }
}
