import { describe, expect, it } from 'vitest';
import { calculateDualSignalScore } from '@/domain/dualSignal';
import { calculateFocusPortalScore } from '@/domain/focusPortal';
import { calculateOrbitScore, starsForScore } from '@/domain/progression';
import { calculateStarJumperScore } from '@/domain/starJumper';

describe('cross-game scoring audit', () => {
  it('keeps every score inside the shared 0-1000 range', () => {
    const scores = [
      calculateOrbitScore(1, 0),
      calculateOrbitScore(0, 999),
      calculateStarJumperScore({
        hitRate: 1,
        averageReactionMs: 150,
        bestCombo: 40,
        hits: 60,
        timeouts: 0,
        decoyHits: 0,
      }),
      calculateFocusPortalScore({
        accuracy: 1,
        averageReactionMs: 100,
        completedCycles: 60,
        crashes: 0,
        decoysSeen: 60,
        quickStops: 60,
        quickBonusPoints: 400,
        misses: 0,
      }),
      calculateDualSignalScore({
        accuracy: 1,
        averageReactionMs: 100,
        decodedPairs: 60,
        bestCombo: 60,
        shieldRemaining: 100,
        mistakes: 0,
      }),
    ];

    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1000);
    }
  });

  it('uses one consistent star band across all games', () => {
    expect(starsForScore(419)).toBe(0);
    expect(starsForScore(420)).toBe(1);
    expect(starsForScore(649)).toBe(1);
    expect(starsForScore(650)).toBe(2);
    expect(starsForScore(849)).toBe(2);
    expect(starsForScore(850)).toBe(3);
  });

  it('awards three-star scores for strong play examples in every game', () => {
    const strongScores = [
      calculateOrbitScore(0.97, 8),
      calculateStarJumperScore({
        hitRate: 0.96,
        averageReactionMs: 420,
        bestCombo: 12,
        hits: 18,
        timeouts: 0,
        decoyHits: 0,
      }),
      calculateFocusPortalScore({
        accuracy: 0.94,
        averageReactionMs: 620,
        completedCycles: 12,
        crashes: 0,
        decoysSeen: 16,
        quickStops: 8,
        quickBonusPoints: 90,
        misses: 1,
      }),
      calculateDualSignalScore({
        accuracy: 0.95,
        averageReactionMs: 560,
        decodedPairs: 14,
        bestCombo: 9,
        shieldRemaining: 92,
        mistakes: 0,
      }),
    ];

    for (const score of strongScores) {
      expect(score).toBeGreaterThanOrEqual(850);
      expect(starsForScore(score)).toBe(3);
    }
  });

  it('keeps weak play examples below the one-star threshold in every game', () => {
    const weakScores = [
      calculateOrbitScore(0.24, 120),
      calculateStarJumperScore({
        hitRate: 0.18,
        averageReactionMs: 1900,
        bestCombo: 1,
        hits: 1,
        timeouts: 6,
        decoyHits: 5,
      }),
      calculateFocusPortalScore({
        accuracy: 0.2,
        averageReactionMs: 2400,
        completedCycles: 1,
        crashes: 3,
        decoysSeen: 2,
        quickStops: 0,
        quickBonusPoints: 0,
        misses: 6,
      }),
      calculateDualSignalScore({
        accuracy: 0.22,
        averageReactionMs: 2500,
        decodedPairs: 1,
        bestCombo: 1,
        shieldRemaining: 18,
        mistakes: 7,
      }),
    ];

    for (const score of weakScores) {
      expect(score).toBeLessThan(420);
      expect(starsForScore(score)).toBe(0);
    }
  });
});
