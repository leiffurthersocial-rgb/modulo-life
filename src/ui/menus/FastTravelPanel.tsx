import { LOCATIONS } from '@/data/locations';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { getGame } from '../gameRef';
import { countItem } from '@/game/systems/inventory';
import { audio } from '@/game/audio/AudioManager';

/** Bike racks only connect to the three places that have one. */
const RACK_LOCATIONS = ['plaza', 'konbini', 'park'];

export default function FastTravelPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  if (!state) return null;

  const hasKey = countItem(state.inventory, 'bike_key') > 0;

  return (
    <div className="overlay">
      <Panel title="Bicycle rack" icon="🚲" width="narrow" onClose={close}>
        {!hasKey ? (
          <div className="callout warn">
            These are all locked. Sakura Foods sells a bicycle key — pick one up and the racks around the
            neighbourhood become a fast way to get about.
          </div>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Ride to another rack. The trip takes about twelve minutes.
            </p>
            <div className="col">
              {RACK_LOCATIONS.map((id) => {
                const loc = LOCATIONS.find((l) => l.id === id);
                if (!loc) return null;
                return (
                  <button
                    key={id}
                    className="item-card"
                    onClick={() => {
                      audio.play('confirm');
                      close();
                      getGame()?.fastTravel(id);
                    }}
                  >
                    <span className="icon" aria-hidden>
                      {loc.mapIcon}
                    </span>
                    <span className="meta">
                      <span className="title">{loc.name}</span>
                      <span className="desc">{loc.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
