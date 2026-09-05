import { useState } from 'react';
import { CHARACTERS, getCharacter } from '@/data/characters';
import { getItem } from '@/data/items';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { Avatar, Bar, Panel } from '../common/widgets';
import { standing, tierMeta } from '@/game/systems/relationships';
import { requireLocation } from '@/data/locations';
import { hourOf } from '@/game/systems/timeSystem';

export default function SocialPanel() {
  const state = useGameStore((s) => s.state);
  const close = useUiStore((s) => s.closePanel);
  const [open, setOpen] = useState<string | null>(null);
  if (!state) return null;

  const others = CHARACTERS.filter((c) => c.id !== state.playerId);
  const detail = open ? getCharacter(open) : null;
  const hour = hourOf(state.time);

  return (
    <div className="overlay">
      <Panel title={detail ? detail.name : 'The neighbours'} icon="💬" onClose={close}>
        {!detail && (
          <div className="scroll-list">
            {others.map((c) => {
              const rel = state.relationships[c.id];
              const score = rel?.score ?? 0;
              const meta = tierMeta(score);
              return (
                <button key={c.id} className="relationship-row" onClick={() => setOpen(c.id)}>
                  <Avatar name={c.name} color={c.themeColor} />
                  <span style={{ minWidth: 0 }}>
                    <span className="row spread" style={{ gap: '0.6rem' }}>
                      <strong>{c.name}</strong>
                      <span className="tiny" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </span>
                    <span style={{ display: 'block', marginTop: '0.28rem' }}>
                      <Bar value={score + 100} max={200} color={meta.color} />
                    </span>
                  </span>
                  <span className="mono muted tiny">{Math.round(score)}</span>
                </button>
              );
            })}
          </div>
        )}

        {detail && (
          <>
            <button className="btn small ghost" onClick={() => setOpen(null)} style={{ marginBottom: '0.9rem' }}>
              ← All neighbours
            </button>

            {(() => {
              const rel = state.relationships[detail.id];
              const meta = tierMeta(rel?.score ?? 0);
              const npc = state.npcs[detail.id];
              const block = detail.schedule.find((b) =>
                b.from <= b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to,
              );
              return (
                <>
                  <div className="row" style={{ gap: '0.8rem', marginBottom: '0.9rem' }}>
                    <Avatar name={detail.name} color={detail.themeColor} />
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{detail.name}</div>
                      <div className="muted tiny">{detail.tagline}</div>
                    </div>
                    <span className="chip" style={{ color: meta.color, borderColor: meta.color }}>
                      {meta.label}
                    </span>
                  </div>

                  <p style={{ marginTop: 0, lineHeight: 1.6 }}>{detail.bio}</p>

                  <div className="trait-list">
                    {detail.personality.traits.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="section-title">Standing</div>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span>Friendship</span>
                      <Bar value={(rel?.score ?? 0) + 100} max={200} color={meta.color} />
                      <span className="value">{Math.round(rel?.score ?? 0)}</span>
                    </div>
                    <div className="stat-row">
                      <span>Respect</span>
                      <Bar value={(rel?.respect ?? 0) + 100} max={200} color="var(--gold)" />
                      <span className="value">{Math.round(rel?.respect ?? 0)}</span>
                    </div>
                    <div className="stat-row">
                      <span>Overall</span>
                      <Bar value={standing(rel ?? { score: 0, respect: 0, interactionsToday: 0, lastInteractionDay: -1, giftPreferenceKnown: false, history: [] }) + 100} max={200} color="var(--teal)" />
                      <span className="value">
                        {Math.round(
                          standing(
                            rel ?? {
                              score: 0,
                              respect: 0,
                              interactionsToday: 0,
                              lastInteractionDay: -1,
                              giftPreferenceKnown: false,
                              history: [],
                            },
                          ),
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="section-title">Where they are</div>
                  <dl className="kv">
                    <dt>Right now</dt>
                    <dd>
                      {block ? `${block.activity} at ${requireLocation(block.location).name}` : 'somewhere about'}
                    </dd>
                    <dt>Lives at</dt>
                    <dd>{requireLocation(detail.home).name}</dd>
                    <dt>Works as</dt>
                    <dd>{detail.job.replace(/_/g, ' ')}</dd>
                    {npc && (
                      <>
                        <dt>Their mood</dt>
                        <dd>{Math.round(npc.mood)}</dd>
                        <dt>Fights with you</dt>
                        <dd>
                          {npc.losses}W / {npc.wins}L
                        </dd>
                      </>
                    )}
                  </dl>

                  <div className="section-title">Gift preferences</div>
                  {rel?.giftPreferenceKnown ? (
                    <div className="col">
                      <div>
                        <span className="muted tiny">Loves</span>
                        <div className="trait-list">
                          {detail.preferences.loved.map((id) => (
                            <span key={id} className="chip">
                              {getItem(id)?.icon} {getItem(id)?.name ?? id}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="muted tiny">Likes</span>
                        <div className="trait-list">
                          {detail.preferences.liked.map((id) => (
                            <span key={id} className="chip">
                              {getItem(id)?.icon} {getItem(id)?.name ?? id}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="muted tiny">Would rather you did not</span>
                        <div className="trait-list">
                          {detail.preferences.disliked.map((id) => (
                            <span key={id} className="chip">
                              {getItem(id)?.icon} {getItem(id)?.name ?? id}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">
                      You do not know what {detail.name} likes yet. Give them something and watch the reaction.
                    </p>
                  )}

                  {rel && rel.history.length > 0 && (
                    <>
                      <div className="section-title">Recently</div>
                      <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.7 }}>
                        {rel.history.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Panel>
    </div>
  );
}
