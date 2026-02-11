'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { getGameState } from '@/app/actions/game';
import { submitAction, cancelAction } from '@/app/actions/player';
import type { Game, Player, Hex, Action, ActionType, TickReport as TickReportType } from '@/lib/types';
import { getVisibleHexes } from '@/lib/game/fog';
import StatusBar from '@/components/game/StatusBar';
import ActionPanel from '@/components/game/ActionPanel';
import TickReport from '@/components/game/TickReport';
import InventoryPanel from '@/components/game/InventoryPanel';
import HexInfo from '@/components/game/HexInfo';
import LaunchPanel from '@/components/game/LaunchPanel';
import EpilogueScreen from '@/components/game/EpilogueScreen';

// Dynamic import of Phaser canvas (browser only, no SSR)
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false });

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [hexes, setHexes] = useState<Hex[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [latestReport, setLatestReport] = useState<TickReportType | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [epilogues, setEpilogues] = useState<TickReportType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastReportTick = useRef<number>(-1);

  // Load initial state
  useEffect(() => {
    async function load() {
      try {
        // Get player ID from local storage (set during join)
        const playerId = localStorage.getItem(`meridian_player_${code}`);
        const gameId = localStorage.getItem(`meridian_game_${code}`);
        if (!playerId || !gameId) {
          router.push(`/join?code=${code}`);
          return;
        }

        const state = await getGameState(gameId, playerId);
        setGame(state.game);
        setPlayer(state.player);
        setHexes(state.hexes);
        setActions(state.actions);

        if (state.latestReport) {
          setLatestReport(state.latestReport);
          if (state.latestReport.tick_number > lastReportTick.current) {
            lastReportTick.current = state.latestReport.tick_number;
            setShowReport(true);
          }
        }

        // Load other visible players
        const supabase = createBrowserSupabase();
        const { data: allPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .neq('id', playerId);

        if (allPlayers) {
          setOtherPlayers(allPlayers);
        }

        // Check if game is finished
        if (state.game.status === 'finished') {
          const { data: eps } = await supabase
            .from('tick_reports')
            .select('*')
            .eq('game_id', gameId)
            .eq('report_type', 'epilogue');
          if (eps) setEpilogues(eps);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      }
    }
    load();
  }, [code, router]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const gameId = localStorage.getItem(`meridian_game_${code}`);
    const playerId = localStorage.getItem(`meridian_player_${code}`);
    if (!gameId || !playerId) return;

    const supabase = createBrowserSupabase();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          setGame(payload.new as Game);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as Player;
          if (updated.id === playerId) {
            setPlayer(updated);
          } else {
            setOtherPlayers(prev => {
              const idx = prev.findIndex(p => p.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
            });
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tick_reports', filter: `player_id=eq.${playerId}` },
        (payload) => {
          const report = payload.new as TickReportType;
          if (report.report_type === 'epilogue') {
            setEpilogues(prev => [...prev, report]);
          } else {
            setLatestReport(report);
            if (report.tick_number > lastReportTick.current) {
              lastReportTick.current = report.tick_number;
              setShowReport(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code]);

  // Compute visible hexes
  const visibleHexKeys = useCallback((): Set<string> => {
    if (!player) return new Set();

    const scannerBonus = player.structures.includes('scanner_array') ? 1 : 0;
    const factionPositions = otherPlayers
      .filter(p => p.is_alive)
      .map(p => ({ q: p.position_q ?? 0, r: p.position_r ?? 0 }));

    const visible = getVisibleHexes(
      { q: player.position_q ?? 0, r: player.position_r ?? 0 },
      scannerBonus,
      factionPositions,
      hexes,
    );
    return new Set(visible.map(h => `${h.q},${h.r}`));
  }, [player, otherPlayers, hexes]);

  const handleSubmitAction = useCallback(async (actionType: ActionType, params?: Record<string, unknown>) => {
    if (!game || !player) return;
    try {
      const gameId = localStorage.getItem(`meridian_game_${code}`);
      const playerId = localStorage.getItem(`meridian_player_${code}`);
      if (!gameId || !playerId) return;

      const result = await submitAction(gameId, playerId, actionType, params ?? {});
      if (result) {
        setActions(prev => [...prev, result]);
      }
    } catch (err) {
      console.error('Failed to submit action:', err);
    }
  }, [game, player, code]);

  const handleCancelAction = useCallback(async (actionId: string) => {
    try {
      const playerId = localStorage.getItem(`meridian_player_${code}`);
      if (!playerId) return;
      await cancelAction(actionId, playerId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) {
      console.error('Failed to cancel action:', err);
    }
  }, [code]);

  const handleHexSelected = useCallback((q: number, r: number) => {
    const hex = hexes.find(h => h.q === q && h.r === r);
    setSelectedHex(hex ?? null);
  }, [hexes]);

  const handleVote = useCallback(async (targetId: string) => {
    // TODO: wire to server action when voting is implemented
    console.log('Vote to eject:', targetId);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4">
          <p className="text-[#ff4444]">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#333355] text-gray-300 hover:text-white"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!game || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-[#00ff88] animate-pulse">Loading game...</div>
      </div>
    );
  }

  const playersOnSelectedHex = selectedHex
    ? [player, ...otherPlayers]
        .filter(p => p.is_alive && p.position_q === selectedHex.q && p.position_r === selectedHex.r)
        .map(p => ({ id: p.id, name: p.name }))
    : [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Phaser canvas */}
      <GameCanvas
        hexes={hexes}
        player={player}
        otherPlayers={otherPlayers}
        visibleHexKeys={visibleHexKeys()}
        hullQ={game.hull_q ?? 0}
        hullR={game.hull_r ?? 0}
        onHexSelected={handleHexSelected}
      />

      {/* Status bar */}
      <StatusBar player={player} game={game} />

      {/* Hex info panel (right side) */}
      {selectedHex && (
        <div className="fixed top-14 right-3 z-40 w-72">
          <HexInfo
            hex={selectedHex}
            playersOnHex={playersOnSelectedHex}
            onMoveHere={() => {
              handleSubmitAction('move', { target_q: selectedHex.q, target_r: selectedHex.r });
              setSelectedHex(null);
            }}
            onClose={() => setSelectedHex(null)}
          />
        </div>
      )}

      {/* Inventory toggle + panel */}
      <button
        onClick={() => setShowInventory(!showInventory)}
        className="fixed top-14 left-3 z-40 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1a1a2e]/90 border border-[#333355] text-gray-300 hover:text-white transition-colors"
        aria-label="Toggle inventory"
      >
        <span className="text-lg">&#x1F392;</span>
      </button>

      {showInventory && (
        <div className="fixed top-[72px] left-3 z-40 w-72">
          <InventoryPanel player={player} />
        </div>
      )}

      {/* Action panel (bottom) */}
      <ActionPanel
        player={player}
        queuedActions={actions}
        onSubmitAction={handleSubmitAction}
        onCancelAction={handleCancelAction}
        selectedHex={selectedHex ? { q: selectedHex.q, r: selectedHex.r } : undefined}
      />

      {/* Tick report overlay */}
      {showReport && (
        <TickReport
          report={latestReport}
          onDismiss={() => setShowReport(false)}
        />
      )}

      {/* Launch panel */}
      {game.launch_countdown != null && game.launch_countdown > 0 && (
        <LaunchPanel
          game={game}
          players={[player, ...otherPlayers]}
          currentPlayerId={player.id}
          onVote={handleVote}
        />
      )}

      {/* Epilogue screen */}
      {game.status === 'finished' && (
        <EpilogueScreen
          players={[player, ...otherPlayers]}
          currentPlayerId={player.id}
          epilogues={epilogues}
          onPlayAgain={() => router.push('/')}
        />
      )}
    </div>
  );
}
