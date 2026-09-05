import { useMemo, useState } from 'react';
import { getItem } from '@/data/items';
import { getShop } from '@/data/shops';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { buyPrice, formatMoney, sellPrice } from '@/game/systems/economy';
import { countItem } from '@/game/systems/inventory';
import { audio } from '@/game/audio/AudioManager';

export default function ShopPanel() {
  const shopId = useUiStore((s) => s.shopId);
  const close = useUiStore((s) => s.closePanel);
  const state = useGameStore((s) => s.state);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const addMoney = useGameStore((s) => s.addMoney);
  const give = useGameStore((s) => s.give);
  const take = useGameStore((s) => s.take);
  const patch = useGameStore((s) => s.patch);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const shop = shopId ? getShop(shopId) : null;

  const sellable = useMemo(() => {
    if (!state || !shop || shop.buyback <= 0) return [];
    return state.inventory.filter((slot) => {
      const def = getItem(slot.itemId);
      return def && shop.buys.includes(def.category);
    });
  }, [state, shop]);

  if (!shop || !state) return null;

  const buy = (itemId: string, qty: number) => {
    const cost = buyPrice(shop.id, itemId) * qty;
    if (!spendMoney(cost)) {
      audio.play('error');
      return;
    }
    if (!give(itemId, qty, true)) {
      // Refund if the bag was full.
      addMoney(cost);
      return;
    }
    patch((s) => {
      s.counters = { ...s.counters, itemsBought: s.counters.itemsBought + qty };
    });
    audio.play('buy');
    useUiStore.getState().toast(`Bought ${getItem(itemId)?.name} ×${qty}`, 'good', getItem(itemId)?.icon);
  };

  const sell = (itemId: string, qty: number) => {
    if (!take(itemId, qty)) return;
    const value = sellPrice(shop.id, itemId) * qty;
    addMoney(value, 'Sold');
    audio.play('coin');
  };

  return (
    <div className="overlay">
      <Panel
        title={shop.name}
        icon="🛒"
        onClose={close}
        tabs={
          shop.buyback > 0 ? (
            <div className="tabs">
              <button className={mode === 'buy' ? 'on' : ''} onClick={() => setMode('buy')}>
                Buy
              </button>
              <button className={mode === 'sell' ? 'on' : ''} onClick={() => setMode('sell')}>
                Sell
              </button>
            </div>
          ) : undefined
        }
        footer={
          <>
            <span className="grow money-line">
              <span aria-hidden>💴</span>
              <span className="mono">{formatMoney(state.money)}</span>
            </span>
            <button className="btn" onClick={close}>
              Done
            </button>
          </>
        }
      >
        <p className="muted" style={{ marginTop: 0 }}>
          {shop.greeting}
        </p>

        {mode === 'buy' ? (
          <div className="grid-3">
            {shop.stock.map((id) => {
              const def = getItem(id);
              if (!def) return null;
              const price = buyPrice(shop.id, id);
              const affordable = state.money >= price;
              return (
                <div key={id} className="item-card" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <span className="icon" aria-hidden>
                      {def.icon}
                    </span>
                    <span className="meta">
                      <span className="title">
                        <span>{def.name}</span>
                        <span className="price">{formatMoney(price)}</span>
                      </span>
                      <span className="desc">{def.description}</span>
                      {countItem(state.inventory, id) > 0 && (
                        <span className="desc muted">You have {countItem(state.inventory, id)}</span>
                      )}
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: '0.5rem', gap: '0.35rem' }}>
                    <button className="btn small grow" disabled={!affordable} onClick={() => buy(id, 1)}>
                      Buy
                    </button>
                    <button
                      className="btn small"
                      disabled={state.money < price * 5}
                      onClick={() => buy(id, 5)}
                      title="Buy five"
                    >
                      ×5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {sellable.length === 0 ? (
              <div className="empty-state">Nothing here they would take off your hands.</div>
            ) : (
              <div className="grid-3">
                {sellable.map((slot) => {
                  const def = getItem(slot.itemId)!;
                  const value = sellPrice(shop.id, slot.itemId);
                  return (
                    <div key={slot.itemId} className="item-card" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
                      <div className="row" style={{ alignItems: 'flex-start' }}>
                        <span className="icon" aria-hidden>
                          {def.icon}
                        </span>
                        <span className="meta">
                          <span className="title">
                            <span>
                              {def.name} <span className="muted mono">×{slot.qty}</span>
                            </span>
                            <span className="price">{formatMoney(value)}</span>
                          </span>
                          <span className="desc">{def.description}</span>
                        </span>
                      </div>
                      <div className="row" style={{ marginTop: '0.5rem', gap: '0.35rem' }}>
                        <button className="btn small grow" onClick={() => sell(slot.itemId, 1)}>
                          Sell one
                        </button>
                        {slot.qty > 1 && (
                          <button className="btn small" onClick={() => sell(slot.itemId, slot.qty)}>
                            All
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
