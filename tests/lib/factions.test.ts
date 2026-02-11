import { describe, it, expect } from 'vitest';
import { FactionManager } from '@/lib/game/factions';

describe('factions', () => {
  it('creates a faction', () => {
    const fm = new FactionManager();
    const faction = fm.createFaction('g1', 'Alpha Team', 'p1');
    expect(faction.name).toBe('Alpha Team');
    expect(faction.created_by).toBe('p1');
    expect(fm.getMembers(faction.id)).toContain('p1');
  });

  it('invites and accepts', () => {
    const fm = new FactionManager();
    const faction = fm.createFaction('g1', 'Alpha', 'p1');
    const invite = fm.invite(faction.id, 'p2', 'p1');
    expect(invite.status).toBe('pending');

    fm.acceptInvite(invite.id, 'p2');
    expect(fm.getMembers(faction.id)).toContain('p2');
  });

  it('one faction per player', () => {
    const fm = new FactionManager();
    const f1 = fm.createFaction('g1', 'Alpha', 'p1');
    const f2 = fm.createFaction('g1', 'Beta', 'p2');

    const invite = fm.invite(f2.id, 'p1', 'p2');
    expect(() => fm.acceptInvite(invite.id, 'p1')).toThrow('already in a faction');
  });

  it('leaving removes access', () => {
    const fm = new FactionManager();
    const faction = fm.createFaction('g1', 'Alpha', 'p1');
    const invite = fm.invite(faction.id, 'p2', 'p1');
    fm.acceptInvite(invite.id, 'p2');

    expect(fm.getMembers(faction.id)).toContain('p2');

    fm.leave(faction.id, 'p2');
    expect(fm.getMembers(faction.id)).not.toContain('p2');
  });

  it('invisible to non-members', () => {
    const fm = new FactionManager();
    fm.createFaction('g1', 'Alpha', 'p1');

    const p2Factions = fm.getPlayerFaction('p2');
    expect(p2Factions).toBeNull();
  });

  it('decline invite', () => {
    const fm = new FactionManager();
    const faction = fm.createFaction('g1', 'Alpha', 'p1');
    const invite = fm.invite(faction.id, 'p2', 'p1');
    fm.declineInvite(invite.id, 'p2');

    expect(fm.getMembers(faction.id)).not.toContain('p2');
  });

  it('cannot invite yourself', () => {
    const fm = new FactionManager();
    const faction = fm.createFaction('g1', 'Alpha', 'p1');
    expect(() => fm.invite(faction.id, 'p1', 'p1')).toThrow();
  });
});
