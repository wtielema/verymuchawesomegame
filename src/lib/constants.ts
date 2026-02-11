import type { BiomeDef, ResourceDef, StructureDef, ItemDef, ActionDef, BiomeType, EquipmentSlot } from './types';

// --- Biomes ---

export const BIOMES: Record<BiomeType, BiomeDef> = {
  flats: {
    name: 'Flats',
    description: 'Barren rocky plains, low scrub. Safe, boring.',
    passable: true,
    risk: 0.1,
    yields: {
      rations: { min: 1, max: 3 },
      salvage: { min: 0, max: 2 },
    },
    color: '#8B7355',
  },
  biolume_forest: {
    name: 'Biolume Forest',
    description: 'Glowing alien trees, dense canopy. Things live in there.',
    passable: true,
    risk: 0.4,
    yields: {
      rations: { min: 2, max: 8 },
      biostock: { min: 1, max: 4 },
    },
    color: '#00FF88',
  },
  fungal_marsh: {
    name: 'Fungal Marsh',
    description: 'Spore-heavy wetlands. Visibility near zero. Weird things grow.',
    passable: true,
    risk: 0.7,
    yields: {
      rations: { min: 3, max: 10 },
      biostock: { min: 2, max: 6 },
    },
    color: '#7B4F8A',
  },
  crystal_ridge: {
    name: 'Crystal Ridge',
    description: 'Jagged mineral formations. Beautiful and resource-rich.',
    passable: true,
    risk: 0.4,
    yields: {
      salvage: { min: 2, max: 6 },
      energy_cells: { min: 1, max: 4 },
    },
    color: '#00BFFF',
  },
  ruin: {
    name: 'Ruin',
    description: 'Something built this. Long ago. Still hums faintly.',
    passable: true,
    risk: 0.6,
    yields: {
      salvage: { min: 1, max: 4 },
      energy_cells: { min: 0, max: 3 },
      ship_parts: { min: 0, max: 1 },
    },
    color: '#DAA520',
  },
  vent_fields: {
    name: 'Vent Fields',
    description: 'Geothermal activity. Warm, energy-rich, unstable.',
    passable: true,
    risk: 0.5,
    yields: {
      energy_cells: { min: 2, max: 6 },
      salvage: { min: 0, max: 2 },
    },
    color: '#FF4500',
  },
  scar: {
    name: 'The Scar',
    description: "Impact crater from the Meridian's breakup. Wreckage everywhere.",
    passable: true,
    risk: 0.3,
    yields: {
      salvage: { min: 3, max: 8 },
      ship_parts: { min: 0, max: 1 },
    },
    color: '#708090',
  },
  chasm: {
    name: 'Chasm',
    description: 'Impassable terrain. The ground drops away into darkness.',
    passable: false,
    risk: 1.0,
    yields: {},
    color: '#1A1A2E',
  },
};

// --- Resources ---

export const RESOURCES: Record<string, ResourceDef> = {
  rations: {
    name: 'Rations',
    description: 'Food. No food = health loss.',
  },
  salvage: {
    name: 'Salvage',
    description: 'Scrap metal and materials for building and crafting.',
  },
  biostock: {
    name: 'Biostock',
    description: 'Organic materials for medicine, tools, and fuel.',
  },
  energy_cells: {
    name: 'Energy Cells',
    description: 'Power source for equipment, scanners, and devices.',
  },
  ship_parts: {
    name: 'Ship Parts',
    description: 'Heavy components needed to repair the launch module.',
  },
};

// --- Structures ---

export const STRUCTURES: Record<string, StructureDef> = {
  lean_to: {
    name: 'Lean-to',
    description: 'Basic shelter. Weather protection, proper rest.',
    cost: { salvage: 3 },
    buildActions: 1,
  },
  bed: {
    name: 'Bed',
    description: 'Enables Sleep action for Rested buff (+1 energy next tick).',
    cost: { salvage: 2, biostock: 2 },
    buildActions: 1,
  },
  stash: {
    name: 'Stash',
    description: 'Secure storage. 8 extra inventory slots at your camp.',
    cost: { salvage: 4 },
    buildActions: 1,
  },
  workbench: {
    name: 'Workbench',
    description: 'Required to craft tools and equipment.',
    cost: { salvage: 3, biostock: 1 },
    buildActions: 2,
  },
  signal_fire: {
    name: 'Signal Fire',
    description: 'Visible to all players within 3 hexes. Call allies or set bait.',
    cost: { salvage: 2, energy_cells: 1 },
    buildActions: 1,
  },
  scanner_array: {
    name: 'Scanner Array',
    description: '+1 vision range. Detects movement within 2 hexes.',
    cost: { salvage: 4, energy_cells: 2 },
    buildActions: 2,
  },
  barricade: {
    name: 'Barricade',
    description: 'Defensive. Attackers take damage/energy breaking through.',
    cost: { salvage: 5 },
    buildActions: 2,
  },
};

// --- Items / Equipment ---

export const ITEMS: Record<string, ItemDef> = {
  makeshift_knife: {
    name: 'Makeshift Knife',
    slot: 'tool',
    materials: { salvage: 2 },
    effects: 'Basic gathering bonus (+1 yield)',
  },
  crystal_blade: {
    name: 'Crystal Blade',
    slot: 'weapon',
    materials: { salvage: 3, energy_cells: 1 },
    effects: 'Solid combat weapon (+20 attack)',
  },
  spore_suit: {
    name: 'Spore Suit',
    slot: 'suit',
    materials: { biostock: 4 },
    effects: 'Fungal marsh immunity, camouflage in forests',
  },
  patched_scanner: {
    name: 'Patched Scanner',
    slot: 'device',
    materials: { salvage: 2, energy_cells: 2 },
    effects: 'Reveals hex contents before entering',
  },
  chitin_shield: {
    name: 'Chitin Shield',
    slot: 'suit',
    materials: { biostock: 2, salvage: 2 },
    effects: 'Damage reduction (-10 incoming)',
  },
  alien_resonator: {
    name: 'Alien Resonator',
    slot: 'device',
    materials: { salvage: 3, energy_cells: 3 },
    effects: 'Unpredictable alien tech — effects determined by LLM',
  },
};

// --- Equipment Slots ---

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['tool', 'weapon', 'suit', 'device'];

// --- Actions ---

export const ACTIONS: Record<string, ActionDef> = {
  move: {
    name: 'Move',
    description: 'Move to an adjacent hex.',
    energyCost: 1,
  },
  gather: {
    name: 'Gather',
    description: 'Collect resources from your current hex.',
    energyCost: 1,
  },
  explore: {
    name: 'Explore',
    description: 'Search your hex for discoveries, ruins features, or hidden items.',
    energyCost: 1,
  },
  build: {
    name: 'Build',
    description: 'Construct a structure at your camp.',
    energyCost: 1,
  },
  craft: {
    name: 'Craft',
    description: 'Create equipment at your workbench.',
    energyCost: 1,
  },
  sleep: {
    name: 'Sleep',
    description: 'Rest in a bed. Grants Rested buff next tick (+1 energy).',
    energyCost: 0,
  },
  attack: {
    name: 'Attack',
    description: 'Attack another player on your hex.',
    energyCost: 2,
  },
  hide: {
    name: 'Hide',
    description: 'Attempt to avoid detection on your hex.',
    energyCost: 1,
  },
  install_part: {
    name: 'Install Part',
    description: 'Install a ship part at the hull. Must be at the hull hex.',
    energyCost: 2,
  },
};

// --- Game Defaults ---

export const GAME_DEFAULTS = {
  tickIntervalHours: 12,
  totalTicks: 28,
  maxEnergy: 9,
  baseEnergyPerTick: 3,
  inventorySlots: 6,
  maxStructures: 6,
  stashSlots: 8,
  maxHealth: 100,
  startingHealth: 100,
  startingEnergy: 3,
  seatPercentage: 0.35,
  launchCountdownTicks: 3,
  shipPartsMultiplier: 2,
  hexesPerPlayer: 9,
  minPlayers: 3,
  maxPlayers: 20,
  starvationDamage: 15,
  baseVisionRange: 1,
  scannerVisionBonus: 1,
} as const;
