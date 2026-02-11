import { ACTIONS, BIOMES, STRUCTURES } from '@/lib/constants';
import type { Player, Hex, ActionType } from '@/lib/types';

interface ValidationResult {
  valid: boolean;
  error?: string;
  energyCost: number;
}

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function isAdjacent(a: { q: number; r: number }, b: { q: number; r: number }): boolean {
  return hexDistance(a, b) === 1;
}

export function validateAction(
  player: Player,
  actionType: string,
  params: Record<string, unknown>,
  hexes: Hex[],
  queuedEnergyCost: number,
): ValidationResult {
  const actionDef = ACTIONS[actionType];
  if (!actionDef) {
    return { valid: false, error: `Unknown action type: ${actionType}`, energyCost: 0 };
  }

  if (!player.is_alive) {
    return { valid: false, error: 'Player must be alive to perform actions', energyCost: 0 };
  }

  const totalCost = queuedEnergyCost + actionDef.energyCost;
  if (totalCost > player.energy) {
    return { valid: false, error: `Not enough energy (need ${totalCost}, have ${player.energy})`, energyCost: actionDef.energyCost };
  }

  // Action-specific validation
  switch (actionType) {
    case 'move':
      return validateMove(player, params, hexes, actionDef.energyCost);
    case 'build':
      return validateBuild(player, params, actionDef.energyCost);
    case 'craft':
      return validateCraft(player, params, actionDef.energyCost);
    default:
      return { valid: true, energyCost: actionDef.energyCost };
  }
}

function validateMove(
  player: Player,
  params: Record<string, unknown>,
  hexes: Hex[],
  energyCost: number,
): ValidationResult {
  const targetQ = params.target_q as number;
  const targetR = params.target_r as number;

  if (targetQ === undefined || targetR === undefined) {
    return { valid: false, error: 'Move requires target_q and target_r', energyCost };
  }

  const playerPos = { q: player.position_q ?? 0, r: player.position_r ?? 0 };
  const target = { q: targetQ, r: targetR };

  if (!isAdjacent(playerPos, target)) {
    return { valid: false, error: 'Target hex must be adjacent to current position', energyCost };
  }

  const targetHex = hexes.find(h => h.q === targetQ && h.r === targetR);
  if (!targetHex) {
    return { valid: false, error: 'Target hex does not exist', energyCost };
  }

  const biomeDef = BIOMES[targetHex.biome];
  if (biomeDef && !biomeDef.passable) {
    return { valid: false, error: 'Target hex is impassable', energyCost };
  }

  return { valid: true, energyCost };
}

function validateBuild(
  player: Player,
  params: Record<string, unknown>,
  energyCost: number,
): ValidationResult {
  const structureId = params.structure_id as string;
  if (!structureId) {
    return { valid: false, error: 'Build requires a structure_id param', energyCost };
  }

  const structureDef = STRUCTURES[structureId];
  if (!structureDef) {
    return { valid: false, error: `Unknown structure: ${structureId}`, energyCost };
  }

  // Check materials
  for (const [resource, amount] of Object.entries(structureDef.cost)) {
    const held = player.inventory.find(item => item.id === resource);
    if (!held || held.quantity < amount) {
      return { valid: false, error: `Not enough ${resource} (need ${amount})`, energyCost };
    }
  }

  return { valid: true, energyCost };
}

function validateCraft(
  player: Player,
  params: Record<string, unknown>,
  energyCost: number,
): ValidationResult {
  const itemId = params.item_id as string;
  if (!itemId) {
    return { valid: false, error: 'Craft requires an item_id param', energyCost };
  }

  // Check workbench
  if (!player.structures.includes('workbench')) {
    return { valid: false, error: 'Crafting requires a workbench at your camp', energyCost };
  }

  return { valid: true, energyCost };
}
