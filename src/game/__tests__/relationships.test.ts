import { describe, expect, it } from 'vitest';
import {
  applyRelationship,
  fightAftermath,
  giftReaction,
  giftScore,
  newRelationship,
  standing,
  tierFor,
} from '@/game/systems/relationships';

describe('relationships', () => {
  it('maps scores to tiers', () => {
    expect(tierFor(-100)).toBe('hostile');
    expect(tierFor(-30)).toBe('rival');
    expect(tierFor(0)).toBe('stranger');
    expect(tierFor(20)).toBe('acquaintance');
    expect(tierFor(50)).toBe('friend');
    expect(tierFor(70)).toBe('closeFriend');
    expect(tierFor(95)).toBe('bestFriend');
  });

  it('applies diminishing returns within one day', () => {
    let rel = newRelationship();
    rel = applyRelationship(rel, 1, { score: 10 });
    const firstGain = rel.score;
    const before = rel.score;
    rel = applyRelationship(rel, 1, { score: 10 });
    const secondGain = rel.score - before;
    expect(secondGain).toBeLessThan(firstGain);
  });

  it('resets diminishing returns on a new day', () => {
    let rel = newRelationship();
    rel = applyRelationship(rel, 1, { score: 10 });
    rel = applyRelationship(rel, 1, { score: 10 });
    const before = rel.score;
    rel = applyRelationship(rel, 2, { score: 10 });
    expect(rel.score - before).toBeCloseTo(10, 5);
  });

  it('applies insults at full strength', () => {
    let rel = newRelationship();
    rel = applyRelationship(rel, 1, { score: 5 });
    const before = rel.score;
    rel = applyRelationship(rel, 1, { score: -8 });
    expect(rel.score - before).toBe(-8);
  });

  it('clamps to the -100..100 range', () => {
    let rel = newRelationship();
    for (let i = 0; i < 200; i++) rel = applyRelationship(rel, i, { score: 20, ignoreDiminish: true });
    expect(rel.score).toBe(100);
    for (let i = 0; i < 400; i++) rel = applyRelationship(rel, i, { score: -20, ignoreDiminish: true });
    expect(rel.score).toBe(-100);
  });

  it('scores gifts by taste', () => {
    expect(giftReaction('robin', 'melonpan')).toBe('loved');
    expect(giftReaction('robin', 'canned_coffee')).toBe('liked');
    expect(giftReaction('robin', 'empty_can')).toBe('disliked');
    expect(giftScore('robin', 'melonpan')).toBeGreaterThan(giftScore('robin', 'canned_coffee'));
    expect(giftScore('robin', 'empty_can')).toBeLessThan(0);
  });

  it('gives competitive characters respect for a loss', () => {
    const leonidas = fightAftermath('leonidas', true);
    const lenni = fightAftermath('lenni', true);
    expect(leonidas.respect).toBeGreaterThan(lenni.respect);
  });

  it('blends score and respect into standing', () => {
    const rel = { ...newRelationship(), score: 50, respect: 100 };
    expect(standing(rel)).toBeCloseTo(60, 5);
  });

  it('keeps a bounded history log', () => {
    let rel = newRelationship();
    for (let i = 0; i < 20; i++) rel = applyRelationship(rel, i, { score: 1, note: `note ${i}` });
    expect(rel.history.length).toBeLessThanOrEqual(8);
    expect(rel.history[0]).toBe('note 19');
  });
});
