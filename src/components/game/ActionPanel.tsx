'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Player, Action, ActionType } from '@/lib/types';
import { ACTIONS, STRUCTURES, ITEMS } from '@/lib/constants';

interface ActionPanelProps {
  player: Player;
  queuedActions: Action[];
  onSubmitAction: (actionType: ActionType, params?: Record<string, unknown>) => void;
  onCancelAction: (actionId: string) => void;
  selectedHex?: { q: number; r: number };
}

const ACTION_ICONS: Record<string, string> = {
  move: '\u2B21',
  gather: '\u2618',
  explore: '\uD83D\uDD0D',
  build: '\uD83D\uDD27',
  craft: '\u2692',
  sleep: '\uD83C\uDF19',
  attack: '\u2694',
  hide: '\uD83D\uDC41',
};

const DISPLAY_ACTIONS: ActionType[] = ['move', 'gather', 'explore', 'build', 'craft', 'sleep', 'attack', 'hide'];

export default function ActionPanel({
  player,
  queuedActions,
  onSubmitAction,
  onCancelAction,
  selectedHex,
}: ActionPanelProps) {
  const [expandedAction, setExpandedAction] = useState<'build' | 'craft' | null>(null);

  const energyCommitted = useMemo(
    () => queuedActions.reduce((sum, a) => sum + a.energy_cost, 0),
    [queuedActions]
  );

  const availableEnergy = player.energy - energyCommitted;

  const canAfford = useCallback(
    (actionKey: string) => {
      const def = ACTIONS[actionKey];
      return def ? availableEnergy >= def.energyCost : false;
    },
    [availableEnergy]
  );

  const handleActionClick = useCallback(
    (actionKey: ActionType) => {
      if (actionKey === 'build') {
        setExpandedAction(expandedAction === 'build' ? null : 'build');
        return;
      }
      if (actionKey === 'craft') {
        setExpandedAction(expandedAction === 'craft' ? null : 'craft');
        return;
      }
      setExpandedAction(null);

      const params: Record<string, unknown> = {};
      if (actionKey === 'move' && selectedHex) {
        params.target_q = selectedHex.q;
        params.target_r = selectedHex.r;
      }
      onSubmitAction(actionKey, params);
    },
    [expandedAction, selectedHex, onSubmitAction]
  );

  const handleBuild = useCallback(
    (structureKey: string) => {
      onSubmitAction('build', { structure: structureKey });
      setExpandedAction(null);
    },
    [onSubmitAction]
  );

  const handleCraft = useCallback(
    (itemKey: string) => {
      onSubmitAction('craft', { item: itemKey });
      setExpandedAction(null);
    },
    [onSubmitAction]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e]/90 backdrop-blur-sm border-t border-[#333355]">
      <div className="max-w-screen-lg mx-auto px-3 py-2 space-y-2">
        {/* Queued actions */}
        {queuedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {queuedActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#333355] rounded-lg px-2.5 py-1.5 text-xs"
              >
                <span className="text-gray-300">{ACTIONS[action.action_type]?.name ?? action.action_type}</span>
                <span className="text-blue-400">-{action.energy_cost}</span>
                <button
                  onClick={() => onCancelAction(action.id)}
                  className="ml-1 w-5 h-5 flex items-center justify-center rounded bg-[#ff4444]/20 text-[#ff4444] hover:bg-[#ff4444]/40 transition-colors text-xs font-bold"
                  aria-label={`Cancel ${action.action_type} action`}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown for Build */}
        {expandedAction === 'build' && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-3 space-y-1">
            <p className="text-xs text-gray-500 mb-2">Select structure to build:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(STRUCTURES).map(([key, def]) => {
                const costStr = Object.entries(def.cost)
                  .map(([res, amt]) => `${amt} ${res}`)
                  .join(', ');
                return (
                  <button
                    key={key}
                    onClick={() => handleBuild(key)}
                    disabled={!canAfford('build')}
                    className="min-h-[44px] text-left px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#333355] hover:border-[#00ff88]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="block text-sm text-gray-200">{def.name}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{costStr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dropdown for Craft */}
        {expandedAction === 'craft' && (
          <div className="bg-[#0a0a0a] border border-[#333355] rounded-xl p-3 space-y-1">
            <p className="text-xs text-gray-500 mb-2">Select item to craft:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ITEMS).map(([key, def]) => {
                const costStr = Object.entries(def.materials)
                  .map(([res, amt]) => `${amt} ${res}`)
                  .join(', ');
                return (
                  <button
                    key={key}
                    onClick={() => handleCraft(key)}
                    disabled={!canAfford('craft')}
                    className="min-h-[44px] text-left px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#333355] hover:border-[#00ff88]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="block text-sm text-gray-200">{def.name}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{costStr}</span>
                    <span className="block text-xs text-[#00ff88]/70 mt-0.5">{def.effects}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons grid */}
        <div className="grid grid-cols-4 gap-2">
          {DISPLAY_ACTIONS.map((actionKey) => {
            const def = ACTIONS[actionKey];
            if (!def) return null;
            const affordable = canAfford(actionKey);
            const isMove = actionKey === 'move';
            const isMoveHighlighted = isMove && !!selectedHex;
            const isExpanded =
              (actionKey === 'build' && expandedAction === 'build') ||
              (actionKey === 'craft' && expandedAction === 'craft');

            return (
              <button
                key={actionKey}
                onClick={() => handleActionClick(actionKey)}
                disabled={!affordable && !isExpanded}
                className={`
                  min-h-[44px] flex flex-col items-center justify-center gap-0.5
                  rounded-xl border transition-all duration-200 text-center
                  ${
                    isMoveHighlighted
                      ? 'bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                      : isExpanded
                        ? 'bg-[#333355]/50 border-[#00ff88]/50 text-gray-200'
                        : affordable
                          ? 'bg-[#0a0a0a] border-[#333355] text-gray-300 hover:border-[#00ff88]/50 hover:text-white active:scale-95'
                          : 'bg-[#0a0a0a]/50 border-[#333355]/50 text-gray-600 cursor-not-allowed'
                  }
                `}
                aria-label={`${def.name} - costs ${def.energyCost} energy`}
              >
                <span className="text-lg leading-none">{ACTION_ICONS[actionKey]}</span>
                <span className="text-xs font-medium">{def.name}</span>
                <span className={`text-[10px] ${affordable ? 'text-blue-400' : 'text-gray-600'}`}>
                  {def.energyCost > 0 ? `${def.energyCost}E` : 'Free'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Energy summary */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500">
          <span>
            Energy: <span className="text-blue-400 font-mono">{availableEnergy}</span>
            <span className="text-gray-600">/{player.max_energy}</span>
            {energyCommitted > 0 && (
              <span className="text-[#ffaa00] ml-1">({energyCommitted} queued)</span>
            )}
          </span>
          <span>{queuedActions.length} action{queuedActions.length !== 1 ? 's' : ''} queued</span>
        </div>
      </div>
    </div>
  );
}
