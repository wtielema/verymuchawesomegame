import { ITEMS } from '@/lib/constants';
import type { Player, BiomeType } from '@/lib/types';

export interface CombatContext {
  biome: BiomeType;
  hostility: number;
}

export interface CombatResult {
  attackerDamage: number;
  defenderDamage: number;
  attackerDead: boolean;
  defenderDead: boolean;
  evaded: boolean;
  outcome: 'decisive_win' | 'close_win' | 'stalemate' | 'loss';
  lootedItem?: string;
}

const WEAPON_BONUS: Record<string, number> = {
  crystal_blade: 20,
  makeshift_knife: 5,
};

const ARMOR_REDUCTION: Record<string, number> = {
  chitin_shield: 10,
  spore_suit: 5,
};

const BIOME_DEFENSE_BONUS: Partial<Record<BiomeType, number>> = {
  biolume_forest: 5,
  fungal_marsh: 8,
  crystal_ridge: 3,
};

const STEALTH_BONUS: Record<string, number> = {
  spore_suit: 30,
};

const BIOME_STEALTH_BONUS: Partial<Record<BiomeType, number>> = {
  fungal_marsh: 25,
  biolume_forest: 15,
};

const BASE_DAMAGE = 15;
const DAMAGE_VARIANCE = 10;

export function resolveCombat(
  attacker: Player,
  defender: Player,
  attackerAction: string,
  defenderAction: string,
  context: CombatContext,
): CombatResult {
  // --- Handle hide (stealth) ---
  if (defenderAction === 'hide') {
    const stealthChance = calculateStealthChance(defender, context);
    if (Math.random() * 100 < stealthChance) {
      return {
        attackerDamage: 0,
        defenderDamage: 0,
        attackerDead: false,
        defenderDead: false,
        evaded: true,
        outcome: 'loss',
      };
    }
  }

  // --- Calculate attack power ---
  const attackerWeapon = attacker.equipment?.weapon as string | undefined;
  const attackerBonus = attackerWeapon ? (WEAPON_BONUS[attackerWeapon] ?? 0) : 0;
  const attackRoll = BASE_DAMAGE + attackerBonus + Math.floor(Math.random() * DAMAGE_VARIANCE);

  // --- Calculate defense ---
  const defenderSuit = defender.equipment?.suit as string | undefined;
  const armorReduction = defenderSuit ? (ARMOR_REDUCTION[defenderSuit] ?? 0) : 0;
  const biomeDefense = BIOME_DEFENSE_BONUS[context.biome] ?? 0;

  let defenderDamage = Math.max(1, attackRoll - armorReduction - biomeDefense);

  // --- Counter-attack (if defender is also attacking or just defending) ---
  let attackerDamage = 0;
  if (defenderAction === 'attack') {
    const defenderWeapon = defender.equipment?.weapon as string | undefined;
    const defenderBonus = defenderWeapon ? (WEAPON_BONUS[defenderWeapon] ?? 0) : 0;
    const defenseRoll = BASE_DAMAGE + defenderBonus + Math.floor(Math.random() * DAMAGE_VARIANCE);

    const attackerSuit = attacker.equipment?.suit as string | undefined;
    const attackerArmor = attackerSuit ? (ARMOR_REDUCTION[attackerSuit] ?? 0) : 0;

    attackerDamage = Math.max(1, defenseRoll - attackerArmor);
  } else if (defenderAction === 'idle') {
    // Idle defender gets a weak counter
    attackerDamage = Math.max(0, Math.floor(Math.random() * (BASE_DAMAGE / 2)));
  }

  // --- Determine deaths ---
  const defenderDead = (defender.health - defenderDamage) <= 0;
  const attackerDead = (attacker.health - attackerDamage) <= 0;

  // --- Determine outcome ---
  let outcome: CombatResult['outcome'];
  const damageRatio = defenderDamage / Math.max(1, attackerDamage);

  if (defenderDead && !attackerDead) {
    outcome = 'decisive_win';
  } else if (damageRatio >= 2) {
    outcome = 'decisive_win';
  } else if (damageRatio >= 1.2) {
    outcome = 'close_win';
  } else if (damageRatio >= 0.8) {
    outcome = 'stalemate';
  } else {
    outcome = 'loss';
  }

  // --- Loot on decisive win ---
  let lootedItem: string | undefined;
  if (outcome === 'decisive_win' && defender.inventory.length > 0) {
    const randomIdx = Math.floor(Math.random() * defender.inventory.length);
    lootedItem = defender.inventory[randomIdx].id;
  }

  return {
    attackerDamage,
    defenderDamage,
    attackerDead,
    defenderDead,
    evaded: false,
    outcome,
    lootedItem,
  };
}

function calculateStealthChance(hider: Player, context: CombatContext): number {
  let chance = 20; // Base 20% chance to evade

  // Equipment bonus
  const suit = hider.equipment?.suit as string | undefined;
  if (suit) {
    chance += STEALTH_BONUS[suit] ?? 0;
  }

  // Biome bonus
  chance += BIOME_STEALTH_BONUS[context.biome] ?? 0;

  return Math.min(95, chance); // Cap at 95%
}
