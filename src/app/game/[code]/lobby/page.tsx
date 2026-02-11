'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { startGame } from '@/app/actions/game';

interface Player {
  id: string;
  name: string;
  avatar: string;
  created_at: string;
}

interface Game {
  id: string;
  code: string;
  name: string;
  status: string;
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch initial game + players, subscribe to realtime
  const loadGame = useCallback(async () => {
    const supabase = createClient();

    // Fetch game
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code)
      .single();

    if (gameError || !gameData) {
      setError('Game not found');
      return;
    }

    // Redirect if game already started
    if (gameData.status === 'active') {
      router.replace(`/game/${code}`);
      return;
    }

    setGame(gameData);

    // Fetch existing players
    const { data: playerData } = await supabase
      .from('players')
      .select('id, name, avatar, created_at')
      .eq('game_id', gameData.id)
      .order('created_at', { ascending: true });

    setPlayers(playerData ?? []);

    // Subscribe to new players
    const playersChannel = supabase
      .channel(`lobby-players-${gameData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameData.id}`,
        },
        (payload) => {
          const newPlayer = payload.new as Player;
          setPlayers((prev) => {
            if (prev.some((p) => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer];
          });
        }
      )
      .subscribe();

    // Subscribe to game status changes (for when host starts the game)
    const gameChannel = supabase
      .channel(`lobby-game-${gameData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameData.id}`,
        },
        (payload) => {
          const updated = payload.new as Game;
          if (updated.status === 'active') {
            router.replace(`/game/${code}`);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(gameChannel);
    };
  }, [code, router]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    loadGame().then((fn) => {
      if (fn) cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, [loadGame]);

  async function handleStart() {
    if (!game) return;
    setStarting(true);
    setError('');

    try {
      await startGame(game.id);
      router.replace(`/game/${code}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start game'
      );
      setStarting(false);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the code text
    }
  }

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const canStart = players.length >= 3;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-sm uppercase tracking-wider transition-colors"
          style={{ color: 'var(--accent-dim)' }}
        >
          &larr; Leave Lobby
        </button>

        {/* Game name */}
        {game && (
          <p className="mb-1 text-sm" style={{ color: 'var(--border)' }}>
            {game.name}
          </p>
        )}

        <h1
          className="glow-green mb-6 text-3xl font-bold tracking-wider"
          style={{ color: 'var(--accent)' }}
        >
          Waiting Room
        </h1>

        {/* Game code display */}
        <div
          className="glow-border mb-8 flex flex-col items-center gap-2 rounded-lg border p-6"
          style={{
            borderColor: 'var(--accent)',
            backgroundColor: 'rgba(0, 255, 136, 0.03)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--accent-dim)' }}
          >
            Share this code
          </p>
          <p
            className="font-mono text-4xl font-bold tracking-[0.4em]"
            style={{ color: 'var(--accent)' }}
          >
            {code}
          </p>
          <button
            onClick={handleCopyCode}
            className="mt-1 rounded px-3 py-1 text-xs uppercase tracking-wider transition-colors"
            style={{
              color: copied ? 'var(--accent)' : 'var(--border)',
              backgroundColor: copied
                ? 'rgba(0, 255, 136, 0.1)'
                : 'transparent',
            }}
          >
            {copied ? 'Copied!' : 'Tap to copy'}
          </button>
        </div>

        {/* Player list */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-dim)' }}
            >
              Players
            </p>
            <p className="text-xs" style={{ color: 'var(--border)' }}>
              {players.length} joined{' '}
              {!canStart && `(need ${3 - players.length} more)`}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: player.avatar,
                    color: '#0a0a0a',
                  }}
                >
                  {getInitials(player.name)}
                </div>
                {/* Name */}
                <span className="text-sm font-medium">{player.name}</span>
              </div>
            ))}

            {/* Empty slots indicator */}
            {players.length === 0 && (
              <div
                className="flex items-center justify-center rounded-lg border border-dashed px-4 py-6"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--border)' }}>
                  Waiting for players to join...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        {/* Start game button */}
        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="glow-border h-14 w-full rounded-lg border font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
          style={{
            borderColor: canStart ? 'var(--accent)' : 'var(--border)',
            color: canStart ? 'var(--accent)' : 'var(--border)',
            backgroundColor: canStart
              ? 'rgba(0, 255, 136, 0.08)'
              : 'var(--surface)',
          }}
        >
          {starting
            ? 'Starting...'
            : canStart
              ? 'Start Game'
              : `Need ${3 - players.length} more player${3 - players.length === 1 ? '' : 's'}`}
        </button>

        {canStart && (
          <p
            className="mt-3 text-center text-xs"
            style={{ color: 'var(--border)' }}
          >
            All players must be present before starting
          </p>
        )}
      </div>
    </div>
  );
}
