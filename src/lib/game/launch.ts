import { GAME_DEFAULTS } from '@/lib/constants';
import type { Game, Player } from '@/lib/types';

interface InstallResult {
  success: boolean;
  error?: string;
  partsInstalled: number;
  player: Player;
}

interface LaunchTriggerResult {
  success: boolean;
  error?: string;
  countdown: number;
}

interface CountdownResult {
  countdown: number;
  launched: boolean;
  winners: string[];
  losers: string[];
}

interface VoteResult {
  ejected: string[];
  tallies: Record<string, number>;
}

export function installPart(game: Game, player: Player): InstallResult {
  const p = structuredClone(player);

  // Must be at hull
  if (p.position_q !== game.hull_q || p.position_r !== game.hull_r) {
    return { success: false, error: 'Must be at the hull hex to install parts', partsInstalled: game.parts_installed, player: p };
  }

  // Must have ship_parts
  const partsIdx = p.inventory.findIndex(i => i.id === 'ship_parts');
  if (partsIdx === -1 || p.inventory[partsIdx].quantity <= 0) {
    return { success: false, error: 'No ship_parts in inventory', partsInstalled: game.parts_installed, player: p };
  }

  // Consume one ship part
  p.inventory[partsIdx].quantity -= 1;
  if (p.inventory[partsIdx].quantity <= 0) {
    p.inventory.splice(partsIdx, 1);
  }

  return {
    success: true,
    partsInstalled: game.parts_installed + 1,
    player: p,
  };
}

export function triggerLaunch(game: Game): LaunchTriggerResult {
  if (game.parts_installed < game.parts_required) {
    return {
      success: false,
      error: `Not enough parts installed (${game.parts_installed}/${game.parts_required})`,
      countdown: 0,
    };
  }

  return {
    success: true,
    countdown: GAME_DEFAULTS.launchCountdownTicks,
  };
}

export function resolveLaunchCountdown(game: Game, players?: Player[]): CountdownResult {
  const newCountdown = (game.launch_countdown ?? 1) - 1;

  if (newCountdown > 0) {
    return { countdown: newCountdown, launched: false, winners: [], losers: [] };
  }

  // Launch!
  const allPlayers = players ?? [];
  const seats = (game.config as { seats?: number })?.seats ?? 2;

  const atHull = allPlayers.filter(p =>
    p.is_alive && p.position_q === game.hull_q && p.position_r === game.hull_r
  );
  const notAtHull = allPlayers.filter(p =>
    p.is_alive && (p.position_q !== game.hull_q || p.position_r !== game.hull_r)
  );

  let winners: string[];
  let losers: string[];

  if (atHull.length <= seats) {
    // All at hull win
    winners = atHull.map(p => p.id);
    losers = notAtHull.map(p => p.id);
  } else {
    // More at hull than seats — voting should have resolved this
    // Default: first N players at hull win (voting happens separately)
    winners = atHull.slice(0, seats).map(p => p.id);
    losers = [...atHull.slice(seats).map(p => p.id), ...notAtHull.map(p => p.id)];
  }

  // Dead players are always losers
  const deadLosers = (players ?? []).filter(p => !p.is_alive).map(p => p.id);
  losers = [...new Set([...losers, ...deadLosers])];

  return { countdown: 0, launched: true, winners, losers };
}

export function resolveVotes(
  votes: { voter_id: string; target_id: string }[],
  seatsAvailable: number,
): VoteResult {
  // Tally votes per target
  const tallies: Record<string, number> = {};
  for (const vote of votes) {
    tallies[vote.target_id] = (tallies[vote.target_id] ?? 0) + 1;
  }

  // Sort by most votes
  const sorted = Object.entries(tallies).sort(([, a], [, b]) => b - a);

  // Count unique voters (these are the players at the hull)
  const voterCount = new Set(votes.map(v => v.voter_id)).size;
  const toEject = Math.max(0, voterCount - seatsAvailable);

  const ejected = sorted.slice(0, toEject).map(([id]) => id);

  return { ejected, tallies };
}
