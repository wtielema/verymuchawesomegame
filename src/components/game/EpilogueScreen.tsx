'use client';

import type { Player, TickReport } from '@/lib/types';

interface EpilogueScreenProps {
  players: Player[];
  currentPlayerId: string;
  epilogues: TickReport[];
  onPlayAgain: () => void;
}

export default function EpilogueScreen({ players, currentPlayerId, epilogues, onPlayAgain }: EpilogueScreenProps) {
  const winners = players.filter((p) => p.is_winner === true);
  const losers = players.filter((p) => p.is_winner === false || p.is_winner === null);
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isWinner = currentPlayer?.is_winner === true;
  const myEpilogue = epilogues.find((e) => e.player_id === currentPlayerId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-4 my-8 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#333355] rounded-2xl p-6 space-y-6">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className={`text-3xl font-black ${isWinner ? 'text-[#00ff88] glow-green' : 'text-[#ff4444]'}`}>
            {isWinner ? 'ESCAPED' : 'LEFT BEHIND'}
          </h1>
          <p className="text-sm text-gray-400">
            {isWinner
              ? 'You made it off the planet. The stars welcome you home.'
              : 'The Meridian left without you. The planet grows restless.'}
          </p>
        </div>

        {/* Winners */}
        {winners.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#00ff88] uppercase tracking-wider mb-2">
              Escaped
            </h3>
            <div className="flex flex-wrap gap-2">
              {winners.map((p) => (
                <div
                  key={p.id}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    p.id === currentPlayerId
                      ? 'bg-[#00ff88]/20 border-[#00ff88]/50 text-[#00ff88] font-bold'
                      : 'bg-[#0a0a0a] border-[#333355] text-gray-300'
                  }`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Losers */}
        {losers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#ff4444] uppercase tracking-wider mb-2">
              Left Behind
            </h3>
            <div className="flex flex-wrap gap-2">
              {losers.map((p) => (
                <div
                  key={p.id}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    p.id === currentPlayerId
                      ? 'bg-[#ff4444]/20 border-[#ff4444]/50 text-[#ff4444] font-bold'
                      : 'bg-[#0a0a0a] border-[#333355] text-gray-500'
                  }`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal epilogue */}
        {myEpilogue?.narrative && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Your Story
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              {myEpilogue.narrative}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 min-h-[44px] rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-medium text-sm hover:bg-[#00ff88]/20 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => {
              const text = myEpilogue?.narrative ?? 'I played Meridian!';
              navigator.clipboard?.writeText(text);
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#0a0a0a] border border-[#333355] text-gray-400 text-sm hover:text-white hover:border-gray-400 transition-colors"
          >
            Copy Story
          </button>
        </div>
      </div>
    </div>
  );
}
