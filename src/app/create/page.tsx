'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGame } from '@/app/actions/game';

const TICK_OPTIONS = [
  { label: '12 hours (standard)', value: 12 * 60 * 60 * 1000 },
  { label: '1 hour (testing)', value: 60 * 60 * 1000 },
  { label: '1 minute (dev)', value: 60 * 1000 },
];

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tickInterval, setTickInterval] = useState(TICK_OPTIONS[0].value);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Game name is required');
      return;
    }

    setLoading(true);
    try {
      const game = await createGame(trimmed, tickInterval);
      router.push(`/game/${game.code}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
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
          Create Game
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--border)' }}>
          Set up a new Meridian session
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Game name */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="game-name"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Game Name
            </label>
            <input
              id="game-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Night Survival"
              maxLength={40}
              className="h-12 rounded-lg border px-4 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Tick interval */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="tick-interval"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Tick Interval
            </label>
            <select
              id="tick-interval"
              value={tickInterval}
              onChange={(e) => setTickInterval(Number(e.target.value))}
              className="h-12 rounded-lg border px-4 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              {TICK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs" style={{ color: 'var(--border)' }}>
              How often the game advances. Standard games use 12-hour ticks.
            </p>
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
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
