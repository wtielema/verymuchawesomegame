'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { validateAction } from '@/lib/game/actions';
import { ACTIONS } from '@/lib/constants';

export async function submitAction(
  gameId: string,
  playerId: string,
  actionType: string,
  params: Record<string, unknown> = {},
) {
  const supabase = await createServerSupabase();

  // Load player and game
  const [playerRes, gameRes, hexesRes, queuedRes] = await Promise.all([
    supabase.from('players').select().eq('id', playerId).single(),
    supabase.from('games').select().eq('id', gameId).single(),
    supabase.from('hexes').select().eq('game_id', gameId),
    supabase.from('actions').select().eq('player_id', playerId).eq('game_id', gameId).eq('resolved', false),
  ]);

  if (playerRes.error || !playerRes.data) throw new Error('Player not found');
  if (gameRes.error || !gameRes.data) throw new Error('Game not found');
  if (gameRes.data.status !== 'active') throw new Error('Game is not active');

  const player = playerRes.data;
  const hexes = hexesRes.data ?? [];
  const queuedEnergy = (queuedRes.data ?? []).reduce((sum, a) => sum + a.energy_cost, 0);

  const validation = validateAction(player, actionType, params, hexes, queuedEnergy);
  if (!validation.valid) throw new Error(validation.error);

  const { data, error } = await supabase
    .from('actions')
    .insert({
      game_id: gameId,
      player_id: playerId,
      tick_number: gameRes.data.tick_number,
      action_type: actionType,
      params,
      energy_cost: validation.energyCost,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit action: ${error.message}`);
  return data;
}

export async function cancelAction(actionId: string, playerId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from('actions')
    .delete()
    .eq('id', actionId)
    .eq('player_id', playerId)
    .eq('resolved', false);

  if (error) throw new Error(`Failed to cancel action: ${error.message}`);
  return { success: true };
}

export async function getMyActions(gameId: string, playerId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('actions')
    .select()
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .eq('resolved', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load actions: ${error.message}`);
  return data ?? [];
}
