'use client';

import type { Player, InventoryItem, EquipmentSlot } from '@/lib/types';
import { EQUIPMENT_SLOTS, ITEMS, GAME_DEFAULTS } from '@/lib/constants';

interface InventoryPanelProps {
  player: Player;
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  tool: 'Tool',
  weapon: 'Weapon',
  suit: 'Suit',
  device: 'Device',
};

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  tool: '\uD83D\uDD27',
  weapon: '\u2694',
  suit: '\uD83D\uDEE1',
  device: '\uD83D\uDCE1',
};

function InventorySlot({ item, index }: { item: InventoryItem | null; index: number }) {
  const itemDef = item ? ITEMS[item.id] : null;

  return (
    <div
      className={`
        aspect-square flex flex-col items-center justify-center rounded-xl border transition-colors
        ${
          item
            ? 'bg-[#0a0a0a] border-[#333355] text-gray-300'
            : 'bg-[#0a0a0a]/50 border-[#333355]/30 text-gray-700'
        }
      `}
      aria-label={item ? `Inventory slot ${index + 1}: ${itemDef?.name ?? item.id}` : `Empty inventory slot ${index + 1}`}
    >
      {item ? (
        <>
          <span className="text-xs font-medium text-center leading-tight px-1 truncate w-full">
            {itemDef?.name ?? item.id}
          </span>
          {item.quantity > 1 && (
            <span className="text-[10px] text-[#00ff88] font-mono mt-0.5">x{item.quantity}</span>
          )}
        </>
      ) : (
        <span className="text-[10px]">Empty</span>
      )}
    </div>
  );
}

function EquipmentSlotDisplay({ slot, equippedItemId }: { slot: EquipmentSlot; equippedItemId: string | undefined }) {
  const itemDef = equippedItemId ? ITEMS[equippedItemId] : null;

  return (
    <div
      className={`
        flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border transition-colors
        ${
          equippedItemId
            ? 'bg-[#0a0a0a] border-[#00ff88]/30 text-gray-200'
            : 'bg-[#0a0a0a]/50 border-[#333355]/30 text-gray-600'
        }
      `}
      aria-label={`${SLOT_LABELS[slot]}: ${equippedItemId ? (itemDef?.name ?? equippedItemId) : 'Empty'}`}
    >
      <span className="text-base">{SLOT_ICONS[slot]}</span>
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500">
          {SLOT_LABELS[slot]}
        </span>
        <span className="block text-xs truncate">
          {equippedItemId ? (itemDef?.name ?? equippedItemId) : '---'}
        </span>
      </div>
    </div>
  );
}

export default function InventoryPanel({ player }: InventoryPanelProps) {
  // Pad inventory to always show all slots
  const inventorySlots: (InventoryItem | null)[] = Array.from(
    { length: GAME_DEFAULTS.inventorySlots },
    (_, i) => player.inventory[i] ?? null
  );

  const hasStash = player.structures.includes('stash');
  const isAtCamp =
    player.camp_q !== null &&
    player.camp_r !== null &&
    player.position_q === player.camp_q &&
    player.position_r === player.camp_r;
  const showStash = hasStash && isAtCamp;

  // Pad stash to GAME_DEFAULTS.stashSlots
  const stashSlots: (InventoryItem | null)[] = showStash
    ? Array.from({ length: GAME_DEFAULTS.stashSlots }, (_, i) => player.stash[i] ?? null)
    : [];

  return (
    <div className="bg-[#1a1a2e]/90 backdrop-blur-sm border border-[#333355] rounded-2xl p-4 space-y-4">
      {/* Equipment */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Equipment
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_SLOTS.map((slot) => (
            <EquipmentSlotDisplay
              key={slot}
              slot={slot}
              equippedItemId={player.equipment[slot]}
            />
          ))}
        </div>
      </div>

      {/* Inventory */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Inventory
          <span className="text-gray-600 font-normal ml-1">
            ({player.inventory.length}/{GAME_DEFAULTS.inventorySlots})
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {inventorySlots.map((item, i) => (
            <InventorySlot key={i} item={item} index={i} />
          ))}
        </div>
      </div>

      {/* Stash */}
      {showStash && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Stash
            <span className="text-gray-600 font-normal ml-1">
              ({player.stash.length}/{GAME_DEFAULTS.stashSlots})
            </span>
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {stashSlots.map((item, i) => (
              <InventorySlot key={`stash-${i}`} item={item} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
