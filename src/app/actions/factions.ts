'use server';

import { createServerSupabase } from '@/lib/supabase/server';

export async function createFaction(gameId: string, name: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find player
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single();
  if (!player) throw new Error('Player not found');

  // Check not already in a faction
  const { data: existing } = await supabase
    .from('faction_members')
    .select('faction_id')
    .eq('player_id', player.id)
    .limit(1);
  if (existing && existing.length > 0) throw new Error('Already in a faction');

  // Create faction
  const { data: faction, error } = await supabase
    .from('factions')
    .insert({ game_id: gameId, name, created_by: player.id })
    .select()
    .single();
  if (error) throw new Error(`Failed to create faction: ${error.message}`);

  // Add creator as member
  await supabase
    .from('faction_members')
    .insert({ faction_id: faction.id, player_id: player.id });

  return faction;
}

export async function inviteToFaction(factionId: string, targetPlayerId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find inviter's player
  const { data: inviter } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!inviter) throw new Error('Player not found');

  // Verify inviter is member
  const { data: membership } = await supabase
    .from('faction_members')
    .select()
    .eq('faction_id', factionId)
    .eq('player_id', inviter.id)
    .single();
  if (!membership) throw new Error('Not a faction member');

  const { data: invite, error } = await supabase
    .from('faction_invites')
    .insert({
      faction_id: factionId,
      invited_player_id: targetPlayerId,
      invited_by: inviter.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to invite: ${error.message}`);
  return invite;
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!player) throw new Error('Player not found');

  // Get invite
  const { data: invite } = await supabase
    .from('faction_invites')
    .select()
    .eq('id', inviteId)
    .eq('invited_player_id', player.id)
    .eq('status', 'pending')
    .single();
  if (!invite) throw new Error('Invite not found');

  // Check not already in a faction
  const { data: existing } = await supabase
    .from('faction_members')
    .select('faction_id')
    .eq('player_id', player.id)
    .limit(1);
  if (existing && existing.length > 0) throw new Error('Already in a faction');

  // Accept
  await supabase
    .from('faction_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);

  await supabase
    .from('faction_members')
    .insert({ faction_id: invite.faction_id, player_id: player.id });

  return { success: true };
}

export async function declineInvite(inviteId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!player) throw new Error('Player not found');

  await supabase
    .from('faction_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
    .eq('invited_player_id', player.id);

  return { success: true };
}

export async function leaveFaction(factionId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!player) throw new Error('Player not found');

  await supabase
    .from('faction_members')
    .delete()
    .eq('faction_id', factionId)
    .eq('player_id', player.id);

  return { success: true };
}
