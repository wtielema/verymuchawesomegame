import { BIOMES, GAME_DEFAULTS } from '@/lib/constants';
import type { GameState, TickResult, Player, Hex, Action } from '@/lib/types';
import { resolveCombat } from './combat';
import { resolveBuild, resolveCraft, resolveDeath } from './build-craft';
import { installPart } from './launch';
import { calculateWeatherDamage, shouldMutateBiome, mutateBiome } from './escalation';
import { generateFallbackEvent, type HexEventResult } from '@/lib/llm';

// Optional async LLM function — injected when available
type LLMGenerator = (context: {
  biome: string;
  action: string;
  playerName: string;
  playerHealth: number;
  playerEquipment: Record<string, string>;
  hexHistory: string[];
  hostility: number;
  tickNumber: number;
}) => Promise<HexEventResult>;

export interface TickOptions {
  generateHexEvent?: LLMGenerator;
}

export function resolveTick(state: GameState, options?: TickOptions): TickResult {
  const { game, players, hexes, actions } = state;

  const updatedPlayers = players.map(p => structuredClone(p));
  const updatedHexes = hexes.map(h => structuredClone(h));
  const narratives: Map<string, HexEventResult[]> = new Map();

  // --- 1. Movement ---
  resolveMovement(updatedPlayers, actions, updatedHexes);

  // --- 2. Actions ---
  resolveActions(updatedPlayers, actions, updatedHexes, game, narratives);

  // --- 3. Combat ---
  resolveCombatActions(updatedPlayers, actions, updatedHexes, game);

  // --- 4. Survival ---
  resolveSurvival(updatedPlayers);

  // --- 5. Weather damage (escalation) ---
  resolveWeather(updatedPlayers, game.hostility);

  // --- 6. Death check and respawn ---
  resolveDeaths(updatedPlayers, updatedHexes);

  // --- 7. Recovery ---
  resolveRecovery(updatedPlayers);

  // --- 8. Planet escalation ---
  const newHostility = Math.min(1, game.hostility + (1 / GAME_DEFAULTS.totalTicks));

  // --- 9. Biome mutations ---
  for (const hex of updatedHexes) {
    if (hex.biome !== 'chasm' && hex.biome !== 'scar' && shouldMutateBiome(game.hostility)) {
      hex.biome = mutateBiome(hex.biome);
    }
  }

  // --- 10. Generate reports ---
  const reports = updatedPlayers.map(player => {
    const events = narratives.get(player.id);
    let narrative: string | null = null;
    let outcomes: Record<string, unknown> = {};
    if (events && events.length > 0) {
      narrative = events.map(e => e.narrative).join('\n\n');
      for (const e of events) {
        for (const [key, val] of Object.entries(e.outcomes)) {
          const prev = (outcomes[key] as number) ?? 0;
          outcomes[key] = prev + (typeof val === 'number' ? val : 0);
        }
      }
    }
    return {
      game_id: game.id,
      player_id: player.id,
      tick_number: game.tick_number,
      report_type: 'tick' as const,
      narrative,
      outcomes,
    };
  });

  return {
    playerUpdates: updatedPlayers,
    hexUpdates: updatedHexes,
    reports,
    gameUpdates: {
      tick_number: game.tick_number + 1,
      hostility: newHostility,
    },
  };
}

// Async version that calls the LLM
export async function resolveTickAsync(state: GameState, generateHexEvent: LLMGenerator): Promise<TickResult> {
  const { game, players, hexes, actions } = state;

  const updatedPlayers = players.map(p => structuredClone(p));
  const updatedHexes = hexes.map(h => structuredClone(h));

  // --- 1. Movement ---
  resolveMovement(updatedPlayers, actions, updatedHexes);

  // --- 2. Gather/explore with LLM ---
  const llmActions = actions.filter(a => a.action_type === 'gather' || a.action_type === 'explore');
  const llmPromises = llmActions.map(async (action) => {
    const player = updatedPlayers.find(p => p.id === action.player_id);
    if (!player || !player.is_alive) return;

    const hex = updatedHexes.find(h => h.q === player.position_q && h.r === player.position_r);
    if (!hex) return;

    const result = await generateHexEvent({
      biome: hex.biome,
      action: action.action_type,
      playerName: player.name,
      playerHealth: player.health,
      playerEquipment: player.equipment as Record<string, string>,
      hexHistory: hex.history.map(h => h.summary),
      hostility: game.hostility,
      tickNumber: game.tick_number,
    });

    // Apply outcomes
    for (const [resource, amount] of Object.entries(result.outcomes)) {
      if (typeof amount !== 'number' || amount <= 0) continue;
      const existing = player.inventory.find(i => i.id === resource);
      if (existing) {
        existing.quantity += amount;
      } else {
        player.inventory.push({ id: resource, quantity: amount });
      }
    }

    // Add to hex history
    hex.history.push({ tick: game.tick_number, summary: result.narrative.slice(0, 100) });
    if (hex.history.length > 5) hex.history.shift();

    player.energy = Math.max(0, player.energy - action.energy_cost);

    return { playerId: player.id, result };
  });

  const llmResults = await Promise.all(llmPromises);

  // --- 3. Non-LLM actions ---
  const otherActions = actions.filter(a =>
    a.action_type !== 'move' && a.action_type !== 'gather' && a.action_type !== 'explore'
  );
  resolveActions(updatedPlayers, otherActions, updatedHexes, game, new Map());

  // --- 4-10: same as sync version ---
  resolveCombatActions(updatedPlayers, actions, updatedHexes, game);
  resolveSurvival(updatedPlayers);
  resolveWeather(updatedPlayers, game.hostility);
  resolveDeaths(updatedPlayers, updatedHexes);
  resolveRecovery(updatedPlayers);

  const newHostility = Math.min(1, game.hostility + (1 / GAME_DEFAULTS.totalTicks));

  for (const hex of updatedHexes) {
    if (hex.biome !== 'chasm' && hex.biome !== 'scar' && shouldMutateBiome(game.hostility)) {
      hex.biome = mutateBiome(hex.biome);
    }
  }

  const reports = updatedPlayers.map(player => {
    const llmResult = llmResults.find(r => r?.playerId === player.id);
    return {
      game_id: game.id,
      player_id: player.id,
      tick_number: game.tick_number,
      report_type: 'tick' as const,
      narrative: llmResult?.result.narrative ?? null,
      outcomes: llmResult?.result.outcomes ?? {},
    };
  });

  return {
    playerUpdates: updatedPlayers,
    hexUpdates: updatedHexes,
    reports,
    gameUpdates: {
      tick_number: game.tick_number + 1,
      hostility: newHostility,
    },
  };
}

function resolveMovement(players: Player[], actions: Action[], hexes: Hex[]) {
  const moveActions = actions.filter(a => a.action_type === 'move');

  for (const action of moveActions) {
    const player = players.find(p => p.id === action.player_id);
    if (!player || !player.is_alive) continue;

    const targetQ = action.params.target_q as number;
    const targetR = action.params.target_r as number;

    const targetHex = hexes.find(h => h.q === targetQ && h.r === targetR);
    if (!targetHex) continue;

    const biomeDef = BIOMES[targetHex.biome];
    if (!biomeDef?.passable) continue;

    player.position_q = targetQ;
    player.position_r = targetR;
    player.energy = Math.max(0, player.energy - action.energy_cost);
  }
}

function resolveActions(
  players: Player[],
  actions: Action[],
  hexes: Hex[],
  game: GameState['game'],
  narratives: Map<string, HexEventResult[]>,
) {
  for (const action of actions) {
    if (action.action_type === 'move') continue;

    const player = players.find(p => p.id === action.player_id);
    if (!player || !player.is_alive) continue;

    switch (action.action_type) {
      case 'gather': {
        const event = resolveGather(player, hexes);
        if (event) {
          const existing = narratives.get(player.id) ?? [];
          existing.push(event);
          narratives.set(player.id, existing);
        }
        break;
      }
      case 'sleep':
        player.buffs = { ...player.buffs, rested: true };
        break;
      case 'build': {
        const structureId = (action.params.structure ?? action.params.structure_id) as string;
        if (structureId) {
          const result = resolveBuild(player, structureId);
          if (result.success) {
            Object.assign(player, result.player);
          }
        }
        break;
      }
      case 'craft': {
        const itemId = (action.params.item ?? action.params.item_id) as string;
        if (itemId) {
          const result = resolveCraft(player, itemId);
          if (result.success) {
            Object.assign(player, result.player);
          }
        }
        break;
      }
      case 'install_part': {
        const result = installPart(game, player);
        if (result.success) {
          Object.assign(player, result.player);
        }
        break;
      }
    }

    player.energy = Math.max(0, player.energy - action.energy_cost);
  }
}

function resolveGather(player: Player, hexes: Hex[]): HexEventResult | null {
  const hex = hexes.find(h => h.q === player.position_q && h.r === player.position_r);
  if (!hex) return null;

  const event = generateFallbackEvent(hex.biome, 'gather');

  for (const [resource, amount] of Object.entries(event.outcomes)) {
    if (typeof amount !== 'number' || amount <= 0) continue;
    const existing = player.inventory.find(item => item.id === resource);
    if (existing) {
      existing.quantity += amount;
    } else {
      player.inventory.push({ id: resource, quantity: amount });
    }
  }

  return event;
}

function resolveCombatActions(players: Player[], actions: Action[], hexes: Hex[], game: GameState['game']) {
  const attackActions = actions.filter(a => a.action_type === 'attack');

  for (const action of attackActions) {
    const attacker = players.find(p => p.id === action.player_id);
    if (!attacker || !attacker.is_alive) continue;

    // Find a target on the same hex
    const targets = players.filter(p =>
      p.id !== attacker.id &&
      p.is_alive &&
      p.position_q === attacker.position_q &&
      p.position_r === attacker.position_r
    );
    if (targets.length === 0) continue;

    const target = targets[0]; // Attack first encountered
    const targetAction = actions.find(a => a.player_id === target.id);
    const defenderAction = targetAction?.action_type ?? 'idle';

    const hex = hexes.find(h => h.q === attacker.position_q && h.r === attacker.position_r);
    const biome = hex?.biome ?? 'flats';

    const result = resolveCombat(attacker, target, 'attack', defenderAction, {
      biome: biome as any,
      hostility: game.hostility,
    });

    attacker.health = Math.max(0, attacker.health - result.attackerDamage);
    target.health = Math.max(0, target.health - result.defenderDamage);

    if (result.attackerDead) attacker.is_alive = false;
    if (result.defenderDead) target.is_alive = false;
  }
}

function resolveSurvival(players: Player[]) {
  for (const player of players) {
    if (!player.is_alive) continue;

    const rationsIdx = player.inventory.findIndex(i => i.id === 'rations');
    if (rationsIdx !== -1 && player.inventory[rationsIdx].quantity > 0) {
      player.inventory[rationsIdx].quantity -= 1;
      if (player.inventory[rationsIdx].quantity <= 0) {
        player.inventory.splice(rationsIdx, 1);
      }
    } else {
      player.health = Math.max(0, player.health - GAME_DEFAULTS.starvationDamage);
      if (player.health <= 0) {
        player.is_alive = false;
      }
    }
  }
}

function resolveWeather(players: Player[], hostility: number) {
  for (const player of players) {
    if (!player.is_alive) continue;

    const atCamp = player.camp_q === player.position_q && player.camp_r === player.position_r;
    const hasShelter = atCamp && player.structures.includes('lean_to');
    const damage = calculateWeatherDamage(hostility, hasShelter);

    if (damage > 0) {
      player.health = Math.max(0, player.health - damage);
      if (player.health <= 0) {
        player.is_alive = false;
      }
    }
  }
}

function resolveDeaths(players: Player[], hexes: Hex[]) {
  const passableHexes = hexes.filter(h => BIOMES[h.biome]?.passable);
  const alivePositions = players.filter(p => p.is_alive).map(p => ({
    q: p.position_q ?? 0,
    r: p.position_r ?? 0,
  }));

  for (const player of players) {
    if (player.is_alive || player.health > 0) continue;

    const result = resolveDeath(player, passableHexes as any, alivePositions);
    Object.assign(player, result.player);

    // Mark old camp hex as having ruins loot
    if (result.ruinsHex) {
      const hex = hexes.find(h => h.q === result.ruinsHex!.q && h.r === result.ruinsHex!.r);
      if (hex) {
        hex.ruins_loot = result.ruinsHex.loot;
      }
    }
  }
}

function resolveRecovery(players: Player[]) {
  for (const player of players) {
    if (!player.is_alive) continue;

    const atCamp = player.camp_q === player.position_q && player.camp_r === player.position_r;
    const hasShelter = atCamp && player.structures.includes('lean_to');

    let energyGain = hasShelter ? GAME_DEFAULTS.baseEnergyPerTick : (GAME_DEFAULTS.baseEnergyPerTick - 1);

    if (player.buffs?.rested) {
      energyGain += 1;
    }

    player.energy = Math.min(GAME_DEFAULTS.maxEnergy, player.energy + energyGain);

    if (player.buffs?.rested) {
      const { rested, ...rest } = player.buffs as Record<string, unknown>;
      player.buffs = rest;
    }
  }
}
