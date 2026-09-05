import { useMemo, useState } from 'react';
import { getItem } from '@/data/items';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { formatMoney } from '@/game/systems/economy';
import { inventoryValue, MAX_SLOTS, totalItems } from '@/game/systems/inventory';
import type { ItemCategory } from '@/game/types';
import { audio } from '@/game/audio/AudioManager';

const CATEGORIES: Array<{ id: ItemCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'drink', label: 'Drink' },
  { id: 'gift', label: 'Gifts' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'collectible', label: 'Collectibles' },
  { id: 'misc', label: 'Misc' },
];

export default function InventoryPanel() {
  const state = useGameStore((s) => s.state);
  const consumeItem = useGameStore((s) => s.useItem);
  const close = useUiStore((s) => s.closePanel);
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const slots = useMemo(() => {
    if (!state) return [];
    return state.inventory
      .map((s) => ({ slot: s, def: getItem(s.itemId)! }))
      .filter((x) => x.def && (filter === 'all' || x.def.category === filter))
      .sort((a, b) => a.def.category.localeCompare(b.def.category) || a.def.name.localeCompare(b.def.name));
  }, [state, filter]);

  if (!state) return null;
  const selectedDef = selected ? getItem(selected) : null;

  return (
    <div className="overlay">
      <Panel
        title="Bag"
        icon="🎒"
        onClose={close}
        tabs={
          <div className="tabs">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={filter === c.id ? 'on' : ''} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        }
        footer={
          <>
            <span className="muted tiny grow">
              {totalItems(state.inventory)} items in {state.inventory.length}/{MAX_SLOTS} slots · worth about{' '}
              {formatMoney(inventoryValue(state.inventory))}
            </span>
            {selectedDef && (
              <button
                className="btn primary"
                onClick={() => {
                  consumeItem(selectedDef.id);
                  audio.play('confirm');
                }}
              >
                {selectedDef.category === 'furniture'
                  ? 'Place at home'
                  : selectedDef.category === 'clothing'
                    ? 'Wear'
                    : 'Use'}
              </button>
            )}
          </>
        }
      >
        {slots.length === 0 ? (
          <div className="empty-state">Nothing here. The konbini on Main Street is open all night.</div>
        ) : (
          <div className="grid-3">
            {slots.map(({ slot, def }) => (
              <button
                key={def.id}
                className={`item-card ${selected === def.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelected(def.id);
                  audio.play('ui');
                }}
              >
                <span className="icon" aria-hidden>
                  {def.icon}
                </span>
                <span className="meta">
                  <span className="title">
                    <span>{def.name}</span>
                    <span className="muted mono">×{slot.qty}</span>
                  </span>
                  <span className="desc">{def.description}</span>
                  {state.wearing === def.id && <span className="chip" style={{ marginTop: '0.3rem' }}>Wearing</span>}
                  {state.homeFurniture.includes(def.id) && (
                    <span className="chip" style={{ marginTop: '0.3rem' }}>
                      At home
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
