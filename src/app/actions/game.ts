'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { generateGameCode, createInitialPlayer, validateGameStart, calculateSeats, calculateRequiredParts } from '@/lib/game/lifecycle';

export async function createGame(name: string, tickIntervalMs?: number) {
  const supabase = await createServerSupabase();
  const code = generateGameCode();

  const insertData: Record<string, unknown> = { name, code };
  if (tickIntervalMs) {
    insertData.tick_interval_ms = tickIntervalMs;
  }

  const { data, error } = await supabase
    .from('games')
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create game: ${error.message}`);
  return data;
}

export async function joinGame(code: string, playerName: string, avatar: string) {
  const supabase = await createServerSupabase();

  // Sign in anonymously if not already authenticated
  const { data: { user } } = await supabase.auth.getUser();
  let userId = user?.id;

  if (!userId) {
    const { data: anonAuth, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) throw new Error(`Auth failed: ${authError.message}`);
    userId = anonAuth.user?.id;
  }

  // Find the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select()
    .eq('code', code.toUpperCase())
    .eq('status', 'lobby')
    .single();

  if (gameError || !game) throw new Error('Game not found or already started');

  // Create the player
  const playerDefaults = createInitialPlayer(playerName, avatar);
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ ...playerDefaults, game_id: game.id, user_id: userId })
    .select()
    .single();

  if (playerError) {
    if (playerError.code === '23505') throw new Error('Name already taken in this game');
    throw new Error(`Failed to join: ${playerError.message}`);
  }

  return { player, game };
}

export async function startGame(gameId: string) {
  const supabase = await createServerSupabase();

  // Count players
  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId);

  if (countError) throw new Error(`Failed to count players: ${countError.message}`);

  const playerCount = count ?? 0;
  const validation = validateGameStart(playerCount);
  if (!validation.valid) throw new Error(validation.error);

  const seats = calculateSeats(playerCount);
  const partsRequired = calculateRequiredParts(playerCount);

  // Fetch the game to read tick_interval_ms
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('tick_interval_ms')
    .eq('id', gameId)
    .single();

  const tickInterval = game?.tick_interval_ms ?? 12 * 60 * 60 * 1000; // default 12h
  if (gameError) throw new Error(`Failed to read game: ${gameError.message}`);

  // Update game status
  const nextTickAt = new Date(Date.now() + tickInterval).toISOString();

  const { data, error } = await supabase
    .from('games')
    .update({
      status: 'active',
      tick_number: 1,
      next_tick_at: nextTickAt,
      parts_required: partsRequired,
      config: { seats },
    })
    .eq('id', gameId)
    .eq('status', 'lobby')
    .select()
    .single();

  if (error) throw new Error(`Failed to start game: ${error.message}`);
  return data;
}

export async function getGameState(gameId: string, playerId: string) {
  const supabase = await createServerSupabase();

  const [gameRes, playerRes, hexesRes, actionsRes, reportRes] = await Promise.all([
    supabase.from('games').select().eq('id', gameId).single(),
    supabase.from('players').select().eq('id', playerId).single(),
    supabase.from('hexes').select().eq('game_id', gameId),
    supabase.from('actions').select().eq('player_id', playerId).eq('resolved', false),
    supabase.from('tick_reports').select().eq('player_id', playerId).order('tick_number', { ascending: false }).limit(1),
  ]);

  if (gameRes.error) throw new Error(`Failed to load game: ${gameRes.error.message}`);

  return {
    game: gameRes.data,
    player: playerRes.data,
    hexes: hexesRes.data ?? [],
    actions: actionsRes.data ?? [],
    latestReport: reportRes.data?.[0] ?? null,
  };
}
