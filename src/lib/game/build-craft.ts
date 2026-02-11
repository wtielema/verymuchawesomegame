import { STRUCTURES, ITEMS, GAME_DEFAULTS } from '@/lib/constants';
import type { Player, Hex, InventoryItem, HexCoord } from '@/lib/types';
import { hexDistance } from '@/lib/game/map';

interface BuildResult {
  success: boolean;
  error?: string;
  player: Player;
}

interface CraftResult {
  success: boolean;
  error?: string;
  player: Player;
}

interface DeathResult {
  player: Player;
  ruinsHex: { q: number; r: number; loot: InventoryItem[] } | null;
}

export function resolveBuild(player: Player, structureId: string): BuildResult {
  const p = structuredClone(player);

  const structureDef = STRUCTURES[structureId];
  if (!structureDef) {
    return { success: false, error: `Unknown structure: ${structureId}`, player: p };
  }

  // Check max structures
  if (p.structures.length >= GAME_DEFAULTS.maxStructures) {
    return { success: false, error: `Already at maximum structures (${GAME_DEFAULTS.maxStructures})`, player: p };
  }

  // Check materials
  for (const [resource, amount] of Object.entries(structureDef.cost)) {
    const held = p.inventory.find(item => item.id === resource);
    if (!held || held.quantity < amount) {
      return { success: false, error: `Not enough ${resource} (need ${amount}, have ${held?.quantity ?? 0})`, player: p };
    }
  }

  // Consume materials
  for (const [resource, amount] of Object.entries(structureDef.cost)) {
    const held = p.inventory.find(item => item.id === resource)!;
    held.quantity -= amount;
  }
  p.inventory = p.inventory.filter(i => i.quantity > 0);

  // Set camp if none
  if (p.camp_q === null || p.camp_r === null) {
    p.camp_q = p.position_q;
    p.camp_r = p.position_r;
  }

  p.structures.push(structureId);

  return { success: true, player: p };
}

export function resolveCraft(player: Player, itemId: string): CraftResult {
  const p = structuredClone(player);

  const itemDef = ITEMS[itemId];
  if (!itemDef) {
    return { success: false, error: `Unknown item: ${itemId}`, player: p };
  }

  // Check workbench
  if (!p.structures.includes('workbench')) {
    return { success: false, error: 'Crafting requires a workbench at your camp', player: p };
  }

  // Check materials
  for (const [resource, amount] of Object.entries(itemDef.materials)) {
    const held = p.inventory.find(item => item.id === resource);
    if (!held || held.quantity < amount) {
      return { success: false, error: `Not enough ${resource} (need ${amount}, have ${held?.quantity ?? 0})`, player: p };
    }
  }

  // Consume materials
  for (const [resource, amount] of Object.entries(itemDef.materials)) {
    const held = p.inventory.find(item => item.id === resource)!;
    held.quantity -= amount;
  }
  p.inventory = p.inventory.filter(i => i.quantity > 0);

  // Add crafted item to inventory
  const existing = p.inventory.find(i => i.id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    p.inventory.push({ id: itemId, quantity: 1 });
  }

  // Auto-equip to empty slot
  if (!p.equipment[itemDef.slot]) {
    p.equipment = { ...p.equipment, [itemDef.slot]: itemId };
  }

  return { success: true, player: p };
}

export function resolveDeath(
  player: Player,
  availableSpawns: Hex[],
  otherPlayerPositions: HexCoord[],
): DeathResult {
  const p = structuredClone(player);

  // Collect loot from inventory + stash + equipment
  const loot: InventoryItem[] = [
    ...p.inventory,
    ...p.stash,
  ];
  // Add equipment as loot items
  for (const [, itemId] of Object.entries(p.equipment)) {
    if (itemId) {
      loot.push({ id: itemId as string, quantity: 1 });
    }
  }

  // Create ruins at old camp
  let ruinsHex: DeathResult['ruinsHex'] = null;
  if (p.camp_q !== null && p.camp_r !== null && loot.length > 0) {
    ruinsHex = { q: p.camp_q, r: p.camp_r, loot };
  }

  // Reset player
  p.inventory = [];
  p.stash = [];
  p.equipment = {};
  p.structures = [];
  p.camp_q = null;
  p.camp_r = null;
  p.buffs = {};
  p.health = GAME_DEFAULTS.startingHealth;
  p.energy = GAME_DEFAULTS.startingEnergy;
  p.is_alive = true;
  // Keep discoveries

  // Find spawn position far from others
  const candidates = [...availableSpawns]
    .filter(h => !otherPlayerPositions.some(op => op.q === h.q && op.r === h.r))
    .sort((a, b) => {
      const aMinDist = otherPlayerPositions.length > 0
        ? Math.min(...otherPlayerPositions.map(op => hexDistance(op, a)))
        : Infinity;
      const bMinDist = otherPlayerPositions.length > 0
        ? Math.min(...otherPlayerPositions.map(op => hexDistance(op, b)))
        : Infinity;
      return bMinDist - aMinDist; // prefer furthest from others
    });

  const spawn = candidates[0] ?? availableSpawns[0];
  p.position_q = spawn.q;
  p.position_r = spawn.r;

  return { player: p, ruinsHex };
}
