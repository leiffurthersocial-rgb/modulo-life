import { useEffect, useMemo, useState } from 'react';
import { getCharacter } from '@/data/characters';
import { getItem } from '@/data/items';
import { useGameStore } from '@/stores/useGameStore';
import { useUiStore } from '@/stores/useUiStore';
import { selectDialogue } from '@/game/systems/dialogueSelect';
import { giftReaction, giftScore, standing, tierMeta } from '@/game/systems/relationships';
import { canTurnIn, computeProgress, objectiveText, offerableQuests, questProgress } from '@/game/systems/questSystem';
import { QUESTS } from '@/data/quests';
import { formatMoney } from '@/game/systems/economy';
import { timeOfDay } from '@/game/systems/timeSystem';
import { isWeekend } from '@/game/systems/timeSystem';
import { getGame } from '../gameRef';
import { audio } from '@/game/audio/AudioManager';
import type { DialogueTopic } from '@/data/dialogue';
import { getInterior } from '@/data/interiors';
import { clamp } from '@/game/systems/rng';

type Mode = 'menu' | 'gift' | 'trade' | 'quest';

export default function DialoguePanel() {
  const npcId = useUiStore((s) => s.dialogueNpc);
  const ui = useUiStore();
  const state = useGameStore((s) => s.state);
  const store = useGameStore();
  const [line, setLine] = useState('');
  const [mode, setMode] = useState<Mode>('menu');
  const [pendingQuest, setPendingQuest] = useState<string | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const npc = npcId ? getCharacter(npcId) : null;

  const context = useMemo(() => {
    if (!state || !npcId) return null;
    const agent = getGame()?.currentInterior;
    return {
      speaker: npcId,
      topic: 'greet' as DialogueTopic,
      score: state.relationships[npcId]?.score ?? 0,
      time: timeOfDay(state.time),
      weather: state.weather,
      location: agent ? getInterior(agent)?.location : undefined,
      playerMood: state.needs.mood,
      npcEnergy: state.npcs[npcId]?.energy ?? 80,
      playerStats: state.stats,
      flags: state.flags,
      weekend: isWeekend(state.time),
    };
  }, [state, npcId]);

  useEffect(() => {
    if (!context || !npcId) return;
    setLine(selectDialogue({ ...context, topic: 'greet' }));
    setMode('menu');
    setAsked(new Set());
    store.patch((s) => {
      const talked = s.counters.talkedToday.includes(npcId) ? s.counters.talkedToday : [...s.counters.talkedToday, npcId];
      s.counters = { ...s.counters, conversations: s.counters.conversations + 1, talkedToday: talked };
    });
    // Talking to four different people is a quest objective.
    const active = QUESTS.filter((q) => q.objective.kind === 'talk' && questProgress(useGameStore.getState().state!, q.id).status === 'active');
    for (const q of active) {
      const s = useGameStore.getState().state!;
      store.patch((g) => {
        g.quests = { ...g.quests, [q.id]: { ...g.quests[q.id], progress: s.counters.talkedToday.length } };
      });
    }
    store.relationship(npcId, { score: 1, note: undefined, countsAsInteraction: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId]);

  if (!npc || !state || !context || !npcId) return null;

  const rel = state.relationships[npcId];
  const meta = tierMeta(rel?.score ?? 0);
  const npcRuntime = state.npcs[npcId];

  const close = () => {
    getGame()?.setLockedTo(null);
    ui.closePanel();
    audio.play('cancel');
  };

  const say = (topic: DialogueTopic) => setLine(selectDialogue({ ...context, topic }));

  const once = (key: string) => {
    setAsked((prev) => new Set(prev).add(key));
  };

  /* -------------------------------------------------------- conversation */

  const askDay = () => {
    say('askDay');
    once('askDay');
    store.relationship(npcId, { score: 3, note: `Asked ${npc.name} about their day.` });
    store.grantStatXp({ social: 4, charisma: 2 });
    audio.play('ui');
  };

  const compliment = () => {
    const charisma = state.stats.charisma;
    const success = Math.random() * 100 < 45 + charisma * 0.5;
    if (success) {
      say('compliment');
      store.relationship(npcId, { score: 5, note: `Complimented ${npc.name}.` });
      store.grantStatXp({ charisma: 6, social: 3 });
      audio.play('confirm');
    } else {
      setLine(`${npc.name} raises an eyebrow. "You are laying it on a bit thick."`);
      store.relationship(npcId, { score: -2 });
      audio.play('error');
    }
    once('compliment');
  };

  const joke = () => {
    const chance = 35 + state.stats.social * 0.4 + npc.personality.mischief * 25;
    if (Math.random() * 100 < chance) {
      say('joke');
      store.relationship(npcId, { score: 4, note: `Made ${npc.name} laugh.` });
      store.grantStatXp({ social: 5, charisma: 4 });
      audio.play('confirm');
    } else {
      setLine(`"...Right." ${npc.name} does not laugh. Somewhere, a crow.`);
      store.relationship(npcId, { score: -1 });
      audio.play('error');
    }
    once('joke');
  };

  const rumour = () => {
    say('rumor');
    once('rumor');
    store.relationship(npcId, { score: 2 });
    audio.play('ui');
  };

  /* --------------------------------------------------------------- gifts */

  const giveGift = (itemId: string) => {
    const def = getItem(itemId);
    if (!def || !store.take(itemId, 1)) return;
    const reaction = giftReaction(npcId, itemId);
    const points = giftScore(npcId, itemId);
    store.relationship(npcId, {
      score: points,
      ignoreDiminish: true,
      note: `Gave ${npc.name} a ${def.name}.`,
    });
    store.discoverGiftPreference(npcId);
    store.grantStatXp({ charisma: 4, social: 4 });
    say(
      reaction === 'loved'
        ? 'giftLoved'
        : reaction === 'liked'
          ? 'giftLiked'
          : reaction === 'disliked'
            ? 'giftDisliked'
            : 'giftNeutral',
    );
    audio.play(reaction === 'disliked' ? 'error' : 'confirm');
    setMode('menu');

    // Delivery quests complete themselves the moment the item changes hands.
    for (const q of QUESTS) {
      if (q.giver !== npcId) continue;
      if (questProgress(state, q.id).status !== 'active') continue;
      if (q.objective.kind === 'deliver' && q.objective.target === itemId) {
        setPendingQuest(q.id);
        setMode('quest');
      }
    }
  };

  /* --------------------------------------------------------------- trade */

  const tradeMultiplier = clamp(0.6 + standing(rel ?? { score: 0, respect: 0, interactionsToday: 0, lastInteractionDay: 0, giftPreferenceKnown: false, history: [] }) / 220, 0.5, 1.2);

  const sellTo = (itemId: string) => {
    const def = getItem(itemId);
    if (!def) return;
    const price = Math.max(1, Math.round(def.sellValue * tradeMultiplier));
    if ((npcRuntime?.money ?? 0) < price) {
      setLine(`"I would, but I am short this week." ${npc.name} shrugs.`);
      audio.play('error');
      return;
    }
    if (!store.take(itemId, 1)) return;
    store.addMoney(price, `${npc.name} bought your ${def.name}`);
    store.patch((s) => {
      const n = s.npcs[npcId];
      if (n) s.npcs = { ...s.npcs, [npcId]: { ...n, money: n.money - price, inventory: [...n.inventory, { itemId, qty: 1 }] } };
    });
    store.relationship(npcId, { score: 2 });
    audio.play('coin');
  };

  /* -------------------------------------------------------------- quests */

  const offerable = offerableQuests(state, npcId);
  const activeWithThem = QUESTS.filter((q) => q.giver === npcId && questProgress(state, q.id).status === 'active');
  const turnInReady = activeWithThem.find((q) => canTurnIn(state, q));

  const acceptQuest = (id: string) => {
    store.startQuest(id);
    const q = QUESTS.find((x) => x.id === id)!;
    setLine(q.dialogue.accepted);
    setMode('menu');
    setPendingQuest(null);
    audio.play('confirm');
  };

  const turnIn = (id: string) => {
    const q = QUESTS.find((x) => x.id === id);
    if (!q) return;
    if (q.objective.kind === 'deliver' || q.objective.kind === 'collect') {
      if (!store.take(q.objective.target, q.objective.count)) return;
    }
    store.completeQuest(id);
    if (q.rewards.money) store.addMoney(q.rewards.money, 'Reward');
    if (q.rewards.relationship)
      store.relationship(npcId, { score: q.rewards.relationship, ignoreDiminish: true, note: `Finished "${q.title}".` });
    if (q.rewards.statXp) store.grantStatXp(q.rewards.statXp);
    for (const item of q.rewards.items ?? []) store.give(item.itemId, item.qty);
    setLine(q.dialogue.complete);
    setMode('menu');
    setPendingQuest(null);
    audio.play('win');
  };

  /* ------------------------------------------------------------ conflict */

  const challenge = () => {
    const p = npc.personality;
    const energy = npcRuntime?.energy ?? 80;
    const chance =
      p.aggression * 70 + (standing(rel ?? { score: 0, respect: 0, interactionsToday: 0, lastInteractionDay: 0, giftPreferenceKnown: false, history: [] }) > 30 ? 15 : 0) + (energy > 40 ? 15 : -25);
    if (Math.random() * 100 < chance) {
      say('challengeAccept');
      audio.play('heavy');
      window.setTimeout(() => {
        ui.openCombat(npcId);
      }, 900);
    } else {
      say('challengeDecline');
      store.relationship(npcId, { score: -1 });
      audio.play('cancel');
    }
    once('challenge');
  };

  const playGame = () => {
    audio.play('dice');
    ui.openMinigame('dice', { vs: npcId });
  };

  /* ---------------------------------------------------------------- view */

  const giftable = state.inventory.filter((s) => {
    const def = getItem(s.itemId);
    return def && def.category !== 'furniture';
  });

  return (
    <div className="overlay bottom">
      <div className="dialogue">
        <div className="dialogue-head">
          <span className="dialogue-portrait" style={{ background: npc.themeColor }} aria-hidden>
            {npc.name.charAt(0)}
          </span>
          <div className="grow">
            <strong>{npc.name}</strong>
            <div className="tiny" style={{ color: meta.color }}>
              {meta.label} · {Math.round(rel?.score ?? 0)}
              {turnInReady && <span style={{ color: 'var(--gold)' }}> · has something for you</span>}
            </div>
          </div>
          <button className="close-x" onClick={close} aria-label="End conversation">
            ✕
          </button>
        </div>

        <div className="dialogue-text">{line}</div>

        {mode === 'menu' && (
          <div className="dialogue-actions">
            <button className="btn small" onClick={askDay} disabled={asked.has('askDay')}>
              Ask about their day
            </button>
            <button className="btn small" onClick={compliment} disabled={asked.has('compliment')}>
              Compliment
            </button>
            <button className="btn small" onClick={joke} disabled={asked.has('joke')}>
              Tell a joke
            </button>
            <button className="btn small" onClick={rumour} disabled={asked.has('rumor')}>
              Any news?
            </button>
            <button className="btn small" onClick={() => setMode('gift')} disabled={giftable.length === 0}>
              Give a gift
            </button>
            <button className="btn small" onClick={() => setMode('trade')}>
              Trade
            </button>
            <button className="btn small" onClick={playGame}>
              Play dice
            </button>
            <button className="btn small danger" onClick={challenge} disabled={asked.has('challenge')}>
              Challenge to a match
            </button>
            {turnInReady && (
              <button className="btn small primary" onClick={() => turnIn(turnInReady.id)}>
                Hand over: {turnInReady.title}
              </button>
            )}
            {!turnInReady && offerable.length > 0 && (
              <button
                className="btn small primary"
                onClick={() => {
                  setPendingQuest(offerable[0].id);
                  setLine(offerable[0].dialogue.offer);
                  setMode('quest');
                  audio.play('ui');
                }}
              >
                Need anything?
              </button>
            )}
            {!turnInReady && activeWithThem.length > 0 && (
              <button
                className="btn small"
                onClick={() => {
                  setLine(activeWithThem[0].dialogue.progress);
                  audio.play('ui');
                }}
              >
                About that favour…
              </button>
            )}
            <button className="btn small ghost" onClick={close}>
              Goodbye
            </button>
          </div>
        )}

        {mode === 'gift' && (
          <div style={{ padding: '0 1.15rem 1.05rem' }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Give what?
            </div>
            <div className="grid-3" style={{ maxHeight: '34vh', overflowY: 'auto' }}>
              {giftable.map((slot) => {
                const def = getItem(slot.itemId)!;
                const known = rel?.giftPreferenceKnown;
                const reaction = giftReaction(npcId, slot.itemId);
                return (
                  <button key={slot.itemId} className="item-card" onClick={() => giveGift(slot.itemId)}>
                    <span className="icon" aria-hidden>
                      {def.icon}
                    </span>
                    <span className="meta">
                      <span className="title">
                        <span>{def.name}</span>
                        <span className="muted mono">×{slot.qty}</span>
                      </span>
                      {known && (
                        <span
                          className="desc"
                          style={{
                            color:
                              reaction === 'loved'
                                ? 'var(--gold)'
                                : reaction === 'liked'
                                  ? 'var(--good)'
                                  : reaction === 'disliked'
                                    ? 'var(--danger)'
                                    : 'var(--muted)',
                          }}
                        >
                          {reaction === 'loved'
                            ? 'They love this'
                            : reaction === 'liked'
                              ? 'They like this'
                              : reaction === 'disliked'
                                ? 'They dislike this'
                                : 'They would accept it'}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <button className="btn small ghost" style={{ marginTop: '0.6rem' }} onClick={() => setMode('menu')}>
              Never mind
            </button>
          </div>
        )}

        {mode === 'trade' && (
          <div style={{ padding: '0 1.15rem 1.05rem' }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              {npc.name} has {formatMoney(npcRuntime?.money ?? 0)} and pays {Math.round(tradeMultiplier * 100)}% of
              shop value
            </div>
            <div className="grid-3" style={{ maxHeight: '34vh', overflowY: 'auto' }}>
              {state.inventory.map((slot) => {
                const def = getItem(slot.itemId)!;
                const price = Math.max(1, Math.round(def.sellValue * tradeMultiplier));
                return (
                  <button key={slot.itemId} className="item-card" onClick={() => sellTo(slot.itemId)}>
                    <span className="icon" aria-hidden>
                      {def.icon}
                    </span>
                    <span className="meta">
                      <span className="title">
                        <span>{def.name}</span>
                        <span className="price">{formatMoney(price)}</span>
                      </span>
                      <span className="desc">You have {slot.qty}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button className="btn small ghost" style={{ marginTop: '0.6rem' }} onClick={() => setMode('menu')}>
              Done trading
            </button>
          </div>
        )}

        {mode === 'quest' && pendingQuest && (
          <div style={{ padding: '0 1.15rem 1.05rem' }}>
            {(() => {
              const q = QUESTS.find((x) => x.id === pendingQuest)!;
              const isActive = questProgress(state, q.id).status === 'active';
              return (
                <>
                  <div className="callout">
                    <strong>{q.title}</strong>
                    <div style={{ marginTop: '0.3rem' }}>{objectiveText(q, computeProgress(state, q))}</div>
                    <div className="muted tiny" style={{ marginTop: '0.3rem' }}>
                      Reward: {q.rewards.money ? formatMoney(q.rewards.money) : '—'}
                      {q.rewards.relationship ? ` and warmer relations` : ''}
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: '0.7rem', gap: '0.45rem' }}>
                    {isActive ? (
                      <button
                        className="btn small primary"
                        disabled={!canTurnIn(state, q)}
                        onClick={() => turnIn(q.id)}
                      >
                        Hand it over
                      </button>
                    ) : (
                      <button className="btn small primary" onClick={() => acceptQuest(q.id)}>
                        I will do it
                      </button>
                    )}
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setMode('menu');
                        setPendingQuest(null);
                      }}
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
