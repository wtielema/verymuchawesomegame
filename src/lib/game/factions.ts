import { v4 as uuidv4 } from 'uuid';

interface Faction {
  id: string;
  game_id: string;
  name: string;
  created_by: string;
}

interface FactionInvite {
  id: string;
  faction_id: string;
  invited_player_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
}

// In-memory faction manager for pure logic testing.
// Server actions use Supabase directly.
export class FactionManager {
  private factions: Faction[] = [];
  private members: Map<string, string[]> = new Map(); // factionId -> playerIds
  private invites: FactionInvite[] = [];
  private playerFaction: Map<string, string> = new Map(); // playerId -> factionId

  createFaction(gameId: string, name: string, creatorId: string): Faction {
    if (this.playerFaction.has(creatorId)) {
      throw new Error('Player is already in a faction');
    }

    const faction: Faction = {
      id: uuidv4(),
      game_id: gameId,
      name,
      created_by: creatorId,
    };

    this.factions.push(faction);
    this.members.set(faction.id, [creatorId]);
    this.playerFaction.set(creatorId, faction.id);

    return faction;
  }

  invite(factionId: string, targetPlayerId: string, invitedBy: string): FactionInvite {
    const faction = this.factions.find(f => f.id === factionId);
    if (!faction) throw new Error('Faction not found');

    if (targetPlayerId === invitedBy) {
      throw new Error('Cannot invite yourself');
    }

    const members = this.members.get(factionId) ?? [];
    if (!members.includes(invitedBy)) {
      throw new Error('Only faction members can invite');
    }

    const invite: FactionInvite = {
      id: uuidv4(),
      faction_id: factionId,
      invited_player_id: targetPlayerId,
      invited_by: invitedBy,
      status: 'pending',
    };

    this.invites.push(invite);
    return invite;
  }

  acceptInvite(inviteId: string, playerId: string): void {
    const invite = this.invites.find(i => i.id === inviteId);
    if (!invite) throw new Error('Invite not found');
    if (invite.invited_player_id !== playerId) throw new Error('Not your invite');
    if (invite.status !== 'pending') throw new Error('Invite already resolved');

    if (this.playerFaction.has(playerId)) {
      throw new Error('Player is already in a faction');
    }

    invite.status = 'accepted';
    const members = this.members.get(invite.faction_id) ?? [];
    members.push(playerId);
    this.members.set(invite.faction_id, members);
    this.playerFaction.set(playerId, invite.faction_id);
  }

  declineInvite(inviteId: string, playerId: string): void {
    const invite = this.invites.find(i => i.id === inviteId);
    if (!invite) throw new Error('Invite not found');
    if (invite.invited_player_id !== playerId) throw new Error('Not your invite');

    invite.status = 'declined';
  }

  leave(factionId: string, playerId: string): void {
    const members = this.members.get(factionId);
    if (!members) throw new Error('Faction not found');

    const idx = members.indexOf(playerId);
    if (idx === -1) throw new Error('Not a member');

    members.splice(idx, 1);
    this.members.set(factionId, members);
    this.playerFaction.delete(playerId);
  }

  getMembers(factionId: string): string[] {
    return this.members.get(factionId) ?? [];
  }

  getPlayerFaction(playerId: string): Faction | null {
    const factionId = this.playerFaction.get(playerId);
    if (!factionId) return null;
    return this.factions.find(f => f.id === factionId) ?? null;
  }
}
