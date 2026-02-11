'use client';

import { useMemo } from 'react';
import type { Player, Game } from '@/lib/types';
import { GAME_DEFAULTS } from '@/lib/constants';

interface StatusBarProps {
  player: Player;
  game: Game;
}

export default function StatusBar({ player, game }: StatusBarProps) {
  const healthPercent = Math.max(0, Math.min(100, (player.health / GAME_DEFAULTS.maxHealth) * 100));

  const timeUntilTick = useMemo(() => {
    if (!game.next_tick_at) return null;
    const now = Date.now();
    const next = new Date(game.next_tick_at).getTime();
    const diff = next - now;
    if (diff <= 0) return 'Resolving...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [game.next_tick_at]);

  const energyDots = useMemo(() => {
    const dots = [];
    for (let i = 0; i < player.max_energy; i++) {
      dots.push(i < player.energy);
    }
    return dots;
  }, [player.energy, player.max_energy]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a2e]/90 backdrop-blur-sm border-b border-[#333355]">
      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-lg mx-auto">
        {/* Player name */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#00ff88]">{player.name}</span>
          <span className="text-xs text-gray-500">T{game.tick_number}</span>
        </div>

        {/* Health bar */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative h-5 flex-1 min-w-[80px] max-w-[160px] rounded-full bg-[#0a0a0a] border border-[#333355] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff4444] to-[#ff6666] transition-all duration-500"
              style={{ width: `${healthPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {player.health}
            </span>
          </div>
        </div>

        {/* Energy dots */}
        <div className="flex items-center gap-1 shrink-0">
          {energyDots.map((filled, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-colors duration-300 ${
                filled
                  ? 'bg-blue-400 border-blue-300 shadow-[0_0_4px_rgba(96,165,250,0.5)]'
                  : 'bg-transparent border-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Tick countdown */}
        {timeUntilTick && (
          <div className="shrink-0 text-xs text-gray-400">
            <span className="hidden sm:inline">Next tick in </span>
            <span className="font-mono text-[#ffaa00]">{timeUntilTick}</span>
          </div>
        )}
      </div>
    </div>
  );
}
