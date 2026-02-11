'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { generateMap } from '@/lib/game/map';
import { createInitialPlayer, calculateSeats, calculateRequiredParts } from '@/lib/game/lifecycle';
import { resolveTick } from '@/lib/game/tick';
import { getVisibleHexes } from '@/lib/game/fog';
import { GAME_DEFAULTS, BIOMES, STRUCTURES, ITEMS } from '@/lib/constants';
import type { Game, Player, Hex, Action, ActionType, TickReport as TickReportType, GameState } from '@/lib/types';
import StatusBar from '@/components/game/StatusBar';
import ActionPanel from '@/components/game/ActionPanel';
import TickReport from '@/components/game/TickReport';
import InventoryPanel from '@/components/game/InventoryPanel';
import HexInfo from '@/components/game/HexInfo';
import LaunchPanel from '@/components/game/LaunchPanel';
import EpilogueScreen from '@/components/game/EpilogueScreen';

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false });

const BOT_NAMES = ['Kira', 'Zane', 'Nova', 'Cass', 'Rook', 'Lyra', 'Dax', 'Mira'];
const BOT_ACTIONS: ActionType[] = ['gather', 'gather', 'gather', 'explore', 'sleep', 'move'];

function initGame(playerCount: number) {
  const mapHexes = generateMap(playerCount);
  const hullHex = mapHexes.find(h => h.isHull)!;
  const spawnHexes = mapHexes.filter(h => h.isSpawn);
  const seats = calculateSeats(playerCount);
  const partsRequired = calculateRequiredParts(playerCount);

  const game: Game = {
    id: 'dev-game',
    code: 'DEVMOD',
    name: 'Dev Test Game',
    status: 'active',
    tick_number: 1,
    next_tick_at: null,
    hostility: 0,
    config: { seats },
    hull_q: hullHex.q,
    hull_r: hullHex.r,
    parts_installed: 0,
    parts_required: partsRequired,
    launch_countdown: null,
    created_at: new Date().toISOString(),
  };

  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    const spawn = spawnHexes[i % spawnHexes.length];
    const name = i === 0 ? 'You' : BOT_NAMES[(i - 1) % BOT_NAMES.length];
    const base = createInitialPlayer(name, `avatar_${i}`);
    players.push({
      ...base,
      id: `player-${i}`,
      game_id: game.id,
      user_id: null,
      position_q: spawn.q,
      position_r: spawn.r,
      camp_q: spawn.q,
      camp_r: spawn.r,
      created_at: new Date().toISOString(),
    });
  }

  const hexes: Hex[] = mapHexes.map((h, i) => ({
    id: `hex-${i}`,
    game_id: game.id,
    q: h.q,
    r: h.r,
    biome: h.biome,
    features: {},
    history: [],
    ship_part: h.ship_part,
    ruins_loot: null,
  }));

  return { game, players, hexes };
}

function generateBotActions(players: Player[], hexes: Hex[], game: Game): Action[] {
  const actions: Action[] = [];
  for (const player of players.slice(1)) { // Skip player 0 (the human)
    if (!player.is_alive || player.energy <= 0) continue;

    const actionType = BOT_ACTIONS[Math.floor(Math.random() * BOT_ACTIONS.length)];
    const params: Record<string, unknown> = {};

    if (actionType === 'move') {
      // Pick a random adjacent passable hex
      const neighbors = hexes.filter(h => {
        const dq = Math.abs(h.q - (player.position_q ?? 0));
        const dr = Math.abs(h.r - (player.position_r ?? 0));
        const ds = Math.abs((-h.q - h.r) - (-(player.position_q ?? 0) - (player.position_r ?? 0)));
        return Math.max(dq, dr, ds) === 1 && BIOMES[h.biome]?.passable;
      });
      if (neighbors.length > 0) {
        const target = neighbors[Math.floor(Math.random() * neighbors.length)];
        params.target_q = target.q;
        params.target_r = target.r;
      } else {
        continue; // Skip if no valid move
      }
    }

    actions.push({
      id: `bot-action-${player.id}-${game.tick_number}`,
      game_id: game.id,
      player_id: player.id,
      tick_number: game.tick_number,
      action_type: actionType,
      params,
      energy_cost: actionType === 'sleep' ? 0 : 1,
      resolved: false,
      created_at: new Date().toISOString(),
    });
  }
  return actions;
}

export default function DevPage() {
  const [playerCount, setPlayerCount] = useState(4);
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hexes, setHexes] = useState<Hex[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [latestReport, setLatestReport] = useState<TickReportType | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [epilogues, setEpilogues] = useState<TickReportType[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[T${game?.tick_number ?? 0}] ${msg}`, ...prev].slice(0, 50));
  }, [game?.tick_number]);

  const player = players[0] ?? null;
  const otherPlayers = players.slice(1);

  const visibleHexKeys = useMemo((): Set<string> => {
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

  const handleStart = useCallback(() => {
    const { game: g, players: p, hexes: h } = initGame(playerCount);
    setGame(g);
    setPlayers(p);
    setHexes(h);
    setActions([]);
    setLatestReport(null);
    setEpilogues([]);
    setLog([`Game started with ${playerCount} players. ${h.length} hexes generated.`]);
    setStarted(true);
  }, [playerCount]);

  const handleSubmitAction = useCallback((actionType: ActionType, params?: Record<string, unknown>) => {
    if (!game || !player) return;

    const energyCost = actionType === 'sleep' ? 0 : actionType === 'attack' || actionType === 'install_part' ? 2 : 1;
    const committed = actions.reduce((sum, a) => sum + a.energy_cost, 0);
    if (player.energy - committed < energyCost) return;

    const action: Action = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      game_id: game.id,
      player_id: player.id,
      tick_number: game.tick_number,
      action_type: actionType,
      params: params ?? {},
      energy_cost: energyCost,
      resolved: false,
      created_at: new Date().toISOString(),
    };

    setActions(prev => [...prev, action]);
    addLog(`Queued: ${actionType}${params?.target_q != null ? ` to (${params.target_q},${params.target_r})` : ''}`);
  }, [game, player, actions, addLog]);

  const handleCancelAction = useCallback((actionId: string) => {
    setActions(prev => prev.filter(a => a.id !== actionId));
    addLog('Cancelled an action');
  }, [addLog]);

  const handleResolveTick = useCallback(() => {
    if (!game || !player) return;

    // Generate bot actions
    const botActions = generateBotActions(players, hexes, game);
    const allActions = [...actions, ...botActions];

    addLog(`Resolving tick ${game.tick_number} with ${allActions.length} actions (${actions.length} yours, ${botActions.length} bot)`);

    const state: GameState = { game, players, hexes, actions: allActions };
    const result = resolveTick(state);

    const updatedGame = { ...game, ...result.gameUpdates };
    const updatedPlayers = result.playerUpdates as Player[];
    const updatedHexes = result.hexUpdates as Hex[];

    setGame(updatedGame);
    setPlayers(updatedPlayers);
    setHexes(updatedHexes);
    setActions([]);

    // Find report for player 0
    const myReport = result.reports.find(r => r.player_id === player.id);
    if (myReport) {
      const report: TickReportType = {
        ...myReport,
        id: `report-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setLatestReport(report);
      setShowReport(true);
    }

    // Log build/craft results
    const me = updatedPlayers.find(p => p.id === player.id);
    if (me) {
      const newStructures = me.structures.filter(s => !player.structures.includes(s));
      for (const s of newStructures) {
        const def = STRUCTURES[s];
        addLog(`Built: ${def?.name ?? s}`);
      }
      for (const item of me.inventory) {
        const prev = player.inventory.find(i => i.id === item.id);
        const prevQty = prev?.quantity ?? 0;
        if (item.quantity > prevQty && ITEMS[item.id]) {
          addLog(`Crafted: ${ITEMS[item.id].name} (x${item.quantity - prevQty})`);
        }
      }
    }

    // Log summary
    const alive = updatedPlayers.filter(p => p.is_alive).length;
    addLog(`Tick ${game.tick_number} resolved. Hostility: ${(updatedGame.hostility * 100).toFixed(0)}%. Alive: ${alive}/${updatedPlayers.length}`);

    if (updatedGame.status === 'finished') {
      addLog('Game finished!');
    }
  }, [game, player, players, hexes, actions, addLog]);

  const handleHexSelected = useCallback((q: number, r: number) => {
    const hex = hexes.find(h => h.q === q && h.r === r);
    setSelectedHex(hex ?? null);
  }, [hexes]);

  const handleCheatGiveItems = useCallback(() => {
    if (!player) return;
    const updated = [...players];
    updated[0] = {
      ...updated[0],
      inventory: [
        { id: 'rations', quantity: 20 },
        { id: 'salvage', quantity: 15 },
        { id: 'biostock', quantity: 10 },
        { id: 'energy_cells', quantity: 8 },
        { id: 'ship_parts', quantity: 5 },
      ],
      energy: GAME_DEFAULTS.maxEnergy,
      health: GAME_DEFAULTS.maxHealth,
    };
    setPlayers(updated);
    addLog('CHEAT: Gave items, full energy, full health');
  }, [player, players, addLog]);

  const handleCheatTeleportHull = useCallback(() => {
    if (!player || !game) return;
    const updated = [...players];
    updated[0] = {
      ...updated[0],
      position_q: game.hull_q,
      position_r: game.hull_r,
    };
    setPlayers(updated);
    addLog(`CHEAT: Teleported to hull (${game.hull_q}, ${game.hull_r})`);
  }, [player, players, game, addLog]);

  // --- Setup screen ---
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="max-w-sm w-full mx-4 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-[#00ff88] glow-green">MERIDIAN</h1>
            <p className="text-sm text-gray-500">Dev Test Mode — No backend needed</p>
          </div>

          <div className="bg-[#1a1a2e] border border-[#333355] rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Players (including you)</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#333355] rounded-lg px-3 py-2 text-white"
              >
                {[3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => (
                  <option key={n} value={n}>{n} players</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Hexes: ~{GAME_DEFAULTS.hexesPerPlayer * playerCount}</p>
              <p>Seats on ship: {calculateSeats(playerCount)}</p>
              <p>Parts needed: {calculateRequiredParts(playerCount)}</p>
              <p>Ticks to play: {GAME_DEFAULTS.totalTicks}</p>
            </div>

            <button
              onClick={handleStart}
              className="w-full min-h-[44px] rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-bold text-lg hover:bg-[#00ff88]/20 transition-colors animate-pulse-glow"
            >
              Start Dev Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Game screen ---
  if (!game || !player) return null;

  const playersOnSelectedHex = selectedHex
    ? players
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
        visibleHexKeys={visibleHexKeys}
        hullQ={game.hull_q ?? 0}
        hullR={game.hull_r ?? 0}
        onHexSelected={handleHexSelected}
      />

      {/* Status bar */}
      <StatusBar player={player} game={game} />

      {/* Dev controls (top right) */}
      <div className="fixed top-14 right-3 z-50 flex flex-col gap-2 w-56">
        {/* Resolve tick button */}
        <button
          onClick={handleResolveTick}
          className="w-full min-h-[44px] rounded-xl bg-[#ffaa00]/20 border border-[#ffaa00]/50 text-[#ffaa00] font-bold text-sm hover:bg-[#ffaa00]/30 transition-colors"
        >
          Resolve Tick ({game.tick_number}/{GAME_DEFAULTS.totalTicks})
        </button>

        {/* Cheat buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCheatGiveItems}
            className="flex-1 min-h-[36px] rounded-lg bg-[#1a1a2e] border border-[#333355] text-gray-400 text-xs hover:text-white transition-colors"
          >
            Give Items
          </button>
          <button
            onClick={handleCheatTeleportHull}
            className="flex-1 min-h-[36px] rounded-lg bg-[#1a1a2e] border border-[#333355] text-gray-400 text-xs hover:text-white transition-colors"
          >
            Go to Hull
          </button>
        </div>

        {/* Game info */}
        <div className="bg-[#1a1a2e]/90 border border-[#333355] rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Hostility</span>
            <span className="text-[#ff4444] font-mono">{(game.hostility * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Parts</span>
            <span className="text-[#ffaa00] font-mono">{game.parts_installed}/{game.parts_required}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Seats</span>
            <span className="text-white font-mono">{(game.config as { seats: number }).seats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Alive</span>
            <span className="text-[#00ff88] font-mono">{players.filter(p => p.is_alive).length}/{players.length}</span>
          </div>
        </div>

        {/* Hex info panel */}
        {selectedHex && (
          <HexInfo
            hex={selectedHex}
            playersOnHex={playersOnSelectedHex}
            onMoveHere={() => {
              handleSubmitAction('move', { target_q: selectedHex.q, target_r: selectedHex.r });
              setSelectedHex(null);
            }}
            onClose={() => setSelectedHex(null)}
          />
        )}
      </div>

      {/* Inventory toggle + panel (left side) */}
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

      {/* Dev log (bottom left, above action panel) */}
      <div className="fixed bottom-[180px] left-3 z-40 w-72 max-h-40 overflow-y-auto bg-[#0a0a0a]/90 border border-[#333355] rounded-xl p-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Dev Log</p>
        {log.map((entry, i) => (
          <p key={i} className="text-[11px] text-gray-500 leading-tight">{entry}</p>
        ))}
      </div>

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
          players={players}
          currentPlayerId={player.id}
          onVote={() => {}}
        />
      )}

      {/* Epilogue screen */}
      {game.status === 'finished' && (
        <EpilogueScreen
          players={players}
          currentPlayerId={player.id}
          epilogues={epilogues}
          onPlayAgain={() => {
            setStarted(false);
            setGame(null);
            setPlayers([]);
            setHexes([]);
          }}
        />
      )}
    </div>
  );
}
