import { useEffect, useState } from 'react';
import { LOCATIONS } from '@/data/locations';
import { BUILDINGS, ROADS, WORLD_BOUNDS } from '@/data/world-layout';
import { CHARACTERS, getCharacter } from '@/data/characters';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { getGame } from '../gameRef';
import { isOpen } from '@/data/locations';
import { hourOf } from '@/game/systems/timeSystem';

const W = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
const H = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;

const px = (x: number) => `${((x - WORLD_BOUNDS.minX) / W) * 100}%`;
const pz = (z: number) => `${((z - WORLD_BOUNDS.minZ) / H) * 100}%`;
const pw = (w: number) => `${(w / W) * 100}%`;
const ph = (h: number) => `${(h / H) * 100}%`;

export default function MapPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  const [npcs, setNpcs] = useState<Array<{ id: string; x: number; z: number; inside: string | null }>>([]);

  useEffect(() => {
    const tick = () => setNpcs(getGame()?.npcPositions() ?? []);
    tick();
    const id = window.setInterval(tick, 1200);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;
  const hour = hourOf(state.time);

  return (
    <div className="overlay">
      <Panel title="Hoshizaki" icon="🗺️" onClose={close} width="wide">
        <div className="map-canvas">
          {ROADS.map((r, i) =>
            r.axis === 'ew' ? (
              <div
                key={i}
                className="map-road"
                style={{
                  left: px(r.x1),
                  top: pz(r.z - r.width / 2),
                  width: pw(r.x2 - r.x1),
                  height: ph(r.width),
                }}
              />
            ) : (
              <div
                key={i}
                className="map-road"
                style={{
                  left: px(r.x - r.width / 2),
                  top: pz(r.z1),
                  width: pw(r.width),
                  height: ph(r.z2 - r.z1),
                }}
              />
            ),
          )}

          {BUILDINGS.map((b) => (
            <div
              key={b.id}
              className="map-block"
              style={{
                left: px(b.x - b.halfW),
                top: pz(b.z - b.halfD),
                width: pw(b.halfW * 2),
                height: ph(b.halfD * 2),
                background: b.location ? 'rgba(242,160,189,0.22)' : undefined,
              }}
            />
          ))}

          {LOCATIONS.map((l) => (
            <span
              key={l.id}
              className="map-pin"
              style={{ left: px(l.x), top: pz(l.z), opacity: isOpen(l.id, hour) ? 1 : 0.42 }}
              title={`${l.name}${isOpen(l.id, hour) ? '' : ' (closed)'} — ${l.description}`}
            >
              {l.mapIcon}
            </span>
          ))}

          {npcs.map((n) => {
            const c = getCharacter(n.id);
            return (
              <span
                key={n.id}
                className="map-pin npc"
                style={{ left: px(n.x), top: pz(n.z), background: c.themeColor, opacity: n.inside ? 0.55 : 1 }}
                title={`${c.name}${n.inside ? ' (indoors)' : ''}`}
              >
                {c.name.charAt(0)}
              </span>
            );
          })}

          <span
            className="map-pin player"
            style={{ left: px(state.player.x), top: pz(state.player.z) }}
            title="You"
          >
            📍
          </span>
        </div>

        <div className="map-legend">
          <span className="chip">📍 You</span>
          {CHARACTERS.filter((c) => c.id !== state.playerId).map((c) => (
            <span key={c.id} className="chip">
              <span
                style={{ width: 9, height: 9, borderRadius: 9, background: c.themeColor, display: 'inline-block' }}
                aria-hidden
              />
              {c.name}
            </span>
          ))}
        </div>

        <p className="muted tiny" style={{ marginBottom: 0 }}>
          Faded pins are closed at this hour. Faded neighbours are indoors. There is no teleporting from this
          screen — use a bicycle rack if you want to skip the walk.
        </p>
      </Panel>
    </div>
  );
}
