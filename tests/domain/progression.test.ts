import { describe, expect, it } from 'vitest';
import {
  calculateOrbitScore,
  nextLevelForProgress,
  rankForStars,
  starsForScore,
} from '@/domain/progression';
import type { MissionResult, WorldProgress } from '@/domain/types';

describe('progression', () => {
  it('awards stars based on score thresholds', () => {
    expect(starsForScore(900)).toBe(3);
    expect(starsForScore(700)).toBe(2);
    expect(starsForScore(450)).toBe(1);
    expect(starsForScore(200)).toBe(0);
  });

  it('calculates orbit score from beam lock and pointer distance', () => {
    expect(calculateOrbitScore(1, 4)).toBeGreaterThan(900);
    expect(calculateOrbitScore(0.7, 20)).toBeGreaterThan(650);
    expect(calculateOrbitScore(0.2, 100)).toBeLessThan(420);
  });

  it('advances one level only after a completed two-star result', () => {
    const progress: WorldProgress = {
      worldId: 'orbit-tracker',
      level: 3,
      stars: 8,
      bestScore: 760,
      plays: 4,
    };
    const result: MissionResult = {
      worldId: 'orbit-tracker',
      level: 3,
      inputKind: 'touch',
      status: 'completed',
      score: 700,
      activeSeconds: 60,
      metrics: {},
    };

    expect(nextLevelForProgress(progress, result)).toBe(4);
    expect(nextLevelForProgress(progress, { ...result, status: 'quit' })).toBe(3);
    expect(nextLevelForProgress(progress, { ...result, score: 300 })).toBe(3);
  });

  it('maps total stars to rank names', () => {
    expect(rankForStars(0)).toBe('Launch Recruit');
    expect(rankForStars(16)).toBe('Star Cadet');
    expect(rankForStars(250)).toBe('Galaxy Commander');
  });
});
