'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinGame } from '@/app/actions/game';

const AVATAR_OPTIONS = [
  { color: '#00ff88', label: 'Green' },
  { color: '#00bfff', label: 'Blue' },
  { color: '#ff4444', label: 'Red' },
  { color: '#ffaa00', label: 'Orange' },
  { color: '#da70d6', label: 'Purple' },
  { color: '#ff69b4', label: 'Pink' },
  { color: '#ffd700', label: 'Gold' },
  { color: '#87ceeb', label: 'Sky' },
];

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].color);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(raw.slice(0, 6));
  }

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim();
    const trimmedName = playerName.trim();

    if (trimmedCode.length !== 6) {
      setError('Game code must be 6 characters');
      return;
    }
    if (!trimmedName) {
      setError('Player name is required');
      return;
    }

    setLoading(true);
    try {
      const { game } = await joinGame(trimmedCode, trimmedName, selectedAvatar);
      router.push(`/game/${game.code}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-sm uppercase tracking-wider transition-colors"
          style={{ color: 'var(--accent-dim)' }}
        >
          &larr; Back
        </button>

        <h1
          className="glow-green mb-2 text-3xl font-bold tracking-wider"
          style={{ color: 'var(--accent)' }}
        >
          Join Game
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--border)' }}>
          Enter the code shared by the game creator
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Game code */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="game-code"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Game Code
            </label>
            <input
              id="game-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABC123"
              maxLength={6}
              className="h-14 rounded-lg border px-4 text-center font-mono text-2xl uppercase tracking-[0.4em] outline-none transition-colors focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Player name */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="player-name"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Player Name
            </label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your survivor name"
              maxLength={20}
              className="h-12 rounded-lg border px-4 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Avatar picker */}
          <div className="flex flex-col gap-3">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Avatar
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.color}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.color)}
                  className="flex aspect-square items-center justify-center rounded-full text-sm font-bold transition-all duration-150"
                  style={{
                    backgroundColor: avatar.color,
                    color: '#0a0a0a',
                    transform:
                      selectedAvatar === avatar.color
                        ? 'scale(1.15)'
                        : 'scale(1)',
                    boxShadow:
                      selectedAvatar === avatar.color
                        ? `0 0 20px ${avatar.color}80`
                        : 'none',
                    outline:
                      selectedAvatar === avatar.color
                        ? `2px solid ${avatar.color}`
                        : '2px solid transparent',
                    outlineOffset: '3px',
                  }}
                >
                  {getInitials(playerName) || '?'}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="glow-border h-14 rounded-lg border font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
              backgroundColor: 'rgba(0, 255, 136, 0.08)',
            }}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
