import { getItem } from '@/data/items';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { MAX_SLOTS } from '@/game/systems/inventory';
import { audio } from '@/game/audio/AudioManager';

export default function StoragePanel() {
  const state = useGameStore((s) => s.state);
  const storeItem = useGameStore((s) => s.storeItem);
  const retrieveItem = useGameStore((s) => s.retrieveItem);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;

  const column = (
    title: string,
    slots: typeof state.inventory,
    action: (id: string, qty: number) => void,
    verb: string,
  ) => (
    <div>
      <div className="section-title">
        {title} ({slots.length}/{MAX_SLOTS})
      </div>
      {slots.length === 0 ? (
        <p className="muted tiny">Empty.</p>
      ) : (
        <div className="scroll-list">
          {slots.map((s) => {
            const def = getItem(s.itemId);
            if (!def) return null;
            return (
              <button
                key={s.itemId}
                className="item-card"
                onClick={() => {
                  action(s.itemId, 1);
                  audio.play('ui');
                }}
                title={`${verb} one`}
              >
                <span className="icon" aria-hidden>
                  {def.icon}
                </span>
                <span className="meta">
                  <span className="title">
                    <span>{def.name}</span>
                    <span className="muted mono">×{s.qty}</span>
                  </span>
                  <span className="desc">{verb} one</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="overlay">
      <Panel title="Storage chest" icon="📦" onClose={close}>
        <div className="grid-2">
          {column('Your bag', state.inventory, storeItem, 'Store')}
          {column('In the chest', state.storage, retrieveItem, 'Take')}
        </div>
      </Panel>
    </div>
  );
}
