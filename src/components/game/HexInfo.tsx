'use client';

import type { Hex } from '@/lib/types';
import { BIOMES } from '@/lib/constants';

interface HexInfoProps {
  hex: Hex | null;
  playersOnHex?: { id: string; name: string }[];
  onMoveHere: () => void;
  onClose: () => void;
}

function RiskBar({ risk }: { risk: number }) {
  const percent = Math.round(risk * 100);
  const color =
    risk <= 0.3
      ? '#00ff88'
      : risk <= 0.6
        ? '#ffaa00'
        : '#ff4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Risk Level</span>
        <span className="text-xs font-mono" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

export default function HexInfo({ hex, playersOnHex = [], onMoveHere, onClose }: HexInfoProps) {
  if (!hex) return null;

  const biome = BIOMES[hex.biome];
  if (!biome) return null;

  return (
    <div className="bg-[#1a1a2e]/90 backdrop-blur-sm border border-[#333355] rounded-2xl p-4 space-y-3 max-w-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: biome.color }}
            />
            {biome.name}
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            ({hex.q}, {hex.r})
          </span>
        </div>
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0a0a0a] border border-[#333355] text-gray-400 hover:text-white hover:border-gray-400 transition-colors shrink-0"
          aria-label="Close hex info"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 leading-relaxed">
        {biome.description}
      </p>

      {/* Risk level */}
      <RiskBar risk={biome.risk} />

      {/* Ship part indicator */}
      {hex.ship_part && (
        <div className="flex items-center gap-2 bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-lg px-3 py-2">
          <span className="text-sm">*</span>
          <span className="text-xs text-[#ffaa00] font-medium">Ship part detected on this hex</span>
        </div>
      )}

      {/* Players on hex */}
      {playersOnHex.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Players here
          </h4>
          <div className="space-y-1">
            {playersOnHex.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-sm text-gray-300"
              >
                <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move here button */}
      {biome.passable && (
        <button
          onClick={onMoveHere}
          className="w-full min-h-[44px] rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-medium text-sm hover:bg-[#00ff88]/20 active:scale-[0.98] transition-all"
        >
          Move here
        </button>
      )}

      {/* Impassable warning */}
      {!biome.passable && (
        <div className="flex items-center justify-center min-h-[44px] rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm font-medium">
          Impassable terrain
        </div>
      )}
    </div>
  );
}
