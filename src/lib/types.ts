// --- Enums / Union Types ---

export type BiomeType =
  | 'flats'
  | 'biolume_forest'
  | 'fungal_marsh'
  | 'crystal_ridge'
  | 'ruin'
  | 'vent_fields'
  | 'scar'
  | 'chasm';

export type GameStatus = 'lobby' | 'active' | 'finished';

export type ActionType =
  | 'move'
  | 'gather'
  | 'explore'
  | 'build'
  | 'craft'
  | 'sleep'
  | 'attack'
  | 'hide'
  | 'install_part';

export type ResourceType = 'rations' | 'salvage' | 'biostock' | 'energy_cells' | 'ship_parts';

export type EquipmentSlot = 'tool' | 'weapon' | 'suit' | 'device';

export type ReportType = 'tick' | 'epilogue';

// --- Yield Range ---

export interface YieldRange {
  min: number;
  max: number;
}

// --- Biome Definition ---

export interface BiomeDef {
  name: string;
  description: string;
  passable: boolean;
  risk: number; // 0-1
  yields: Partial<Record<ResourceType, YieldRange>>;
  color: string; // hex color for rendering
}

// --- Resource Definition ---

export interface ResourceDef {
  name: string;
  description: string;
}

// --- Structure Definition ---

export interface StructureDef {
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  buildActions: number;
}

// --- Item Definition ---

export interface ItemDef {
  name: string;
  slot: EquipmentSlot;
  materials: Partial<Record<ResourceType, number>>;
  effects: string;
}

// --- Action Definition ---

export interface ActionDef {
  name: string;
  description: string;
  energyCost: number;
}

// --- Database Row Types ---

export interface Game {
  id: string;
  code: string;
  name: string;
  status: GameStatus;
  tick_number: number;
  next_tick_at: string | null;
  hostility: number;
  config: Record<string, unknown>;
  hull_q: number | null;
  hull_r: number | null;
  parts_installed: number;
  parts_required: number;
  launch_countdown: number | null;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  user_id: string | null;
  name: string;
  avatar: string;
  health: number;
  energy: number;
  max_energy: number;
  inventory: InventoryItem[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  discoveries: string[];
  position_q: number | null;
  position_r: number | null;
  camp_q: number | null;
  camp_r: number | null;
  structures: string[];
  stash: InventoryItem[];
  buffs: Record<string, unknown>;
  is_alive: boolean;
  is_winner: boolean | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  quantity: number;
}

export interface Hex {
  id: string;
  game_id: string;
  q: number;
  r: number;
  biome: BiomeType;
  features: Record<string, unknown>;
  history: HexEvent[];
  ship_part: boolean;
  ruins_loot: InventoryItem[] | null;
}

export interface HexEvent {
  tick: number;
  summary: string;
}

export interface Action {
  id: string;
  game_id: string;
  player_id: string;
  tick_number: number;
  action_type: ActionType;
  params: Record<string, unknown>;
  energy_cost: number;
  resolved: boolean;
  created_at: string;
}

export interface Faction {
  id: string;
  game_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FactionMember {
  faction_id: string;
  player_id: string;
  joined_at: string;
}

export interface FactionInvite {
  id: string;
  faction_id: string;
  invited_player_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface TickReport {
  id: string;
  game_id: string;
  player_id: string;
  tick_number: number;
  report_type: ReportType;
  narrative: string | null;
  outcomes: Record<string, unknown>;
  created_at: string;
}

export interface LaunchVote {
  id: string;
  game_id: string;
  voter_id: string;
  target_id: string;
  tick_number: number;
  created_at: string;
}

// --- Hex Coordinate ---

export interface HexCoord {
  q: number;
  r: number;
}

// --- Tick Resolution ---

export interface GameState {
  game: Game;
  players: Player[];
  hexes: Hex[];
  actions: Action[];
}

export interface TickResult {
  playerUpdates: Partial<Player>[];
  hexUpdates: Partial<Hex>[];
  reports: Omit<TickReport, 'id' | 'created_at'>[];
  gameUpdates: Partial<Game>;
}
