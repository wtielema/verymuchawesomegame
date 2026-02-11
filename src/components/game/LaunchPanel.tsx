'use client';

import { useState } from 'react';
import type { Game, Player } from '@/lib/types';

interface LaunchPanelProps {
  game: Game;
  players: Player[];
  currentPlayerId: string;
  onVote: (targetId: string) => void;
}

export default function LaunchPanel({ game, players, currentPlayerId, onVote }: LaunchPanelProps) {
  const [votedFor, setVotedFor] = useState<string | null>(null);

  if (game.launch_countdown == null || game.launch_countdown <= 0) return null;

  const seats = (game.config as { seats?: number })?.seats ?? 2;
  const atHull = players.filter(
    (p) => p.is_alive && p.position_q === game.hull_q && p.position_r === game.hull_r
  );
  const needsVoting = atHull.length > seats;
  const currentAtHull = atHull.some((p) => p.id === currentPlayerId);

  const handleVote = (targetId: string) => {
    setVotedFor(targetId);
    onVote(targetId);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md mx-4 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#00ff88]/30 rounded-2xl p-6 space-y-5 animate-pulse-glow">
        {/* Countdown */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[#00ff88]/70">Launch Sequence</p>
          <h2 className="text-4xl font-black text-[#00ff88] glow-green">
            {game.launch_countdown}
          </h2>
          <p className="text-lg text-gray-300 font-medium">
            TICK{game.launch_countdown !== 1 ? 'S' : ''} REMAINING
          </p>
        </div>

        {/* Seats info */}
        <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#333355] rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-gray-500">Available Seats</p>
            <p className="text-xl font-bold text-white">{seats}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">At Hull</p>
            <p className="text-xl font-bold text-white">{atHull.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-sm font-bold ${currentAtHull ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
              {currentAtHull ? 'At Hull' : 'Not at Hull'}
            </p>
          </div>
        </div>

        {/* Players at hull */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Players at the Hull
          </h3>
          <div className="space-y-2">
            {atHull.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-[#0a0a0a] border border-[#333355] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
                  <span className="text-sm text-gray-200">{p.name}</span>
                  {p.id === currentPlayerId && (
                    <span className="text-[10px] text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded">YOU</span>
                  )}
                </div>

                {needsVoting && currentAtHull && p.id !== currentPlayerId && (
                  <button
                    onClick={() => handleVote(p.id)}
                    disabled={votedFor !== null}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      votedFor === p.id
                        ? 'bg-[#ff4444]/20 border-[#ff4444]/50 text-[#ff4444]'
                        : votedFor !== null
                          ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                          : 'bg-[#ff4444]/10 border-[#ff4444]/30 text-[#ff4444] hover:bg-[#ff4444]/20'
                    }`}
                  >
                    {votedFor === p.id ? 'Voted' : 'Eject'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Voting info */}
        {needsVoting && (
          <div className="bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-xl px-4 py-3">
            <p className="text-xs text-[#ffaa00] font-medium">
              Too many players for available seats! Vote to eject players before launch.
            </p>
          </div>
        )}

        {/* Warning for players not at hull */}
        {!currentAtHull && (
          <div className="bg-[#ff4444]/10 border border-[#ff4444]/30 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-[#ff4444] font-medium">
              You are not at the hull. Move there before launch to have a chance at a seat!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
