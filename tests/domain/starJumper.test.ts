import { describe, expect, it } from 'vitest';
import { calculateStarJumperScore, starJumperConfigForLevel } from '@/domain/starJumper';

describe('star jumper math', () => {
  it('increases difficulty while keeping gates playable', () => {
    const first = starJumperConfigForLevel(1);
    const high = starJumperConfigForLevel(30);

    expect(first.gateLifetimeMs).toBeGreaterThan(high.gateLifetimeMs);
    expect(high.gateLifetimeMs).toBeGreaterThanOrEqual(950);
    expect(high.decoys).toBeGreaterThan(first.decoys);
    expect(high.targetRadius).toBeGreaterThanOrEqual(34);
  });

  it('rewards accurate fast jumps and combo streaks', () => {
    const strong = calculateStarJumperScore({
      hitRate: 0.94,
      averageReactionMs: 720,
      bestCombo: 9,
      hits: 14,
      timeouts: 1,
      decoyHits: 0,
    });
    const weak = calculateStarJumperScore({
      hitRate: 0.42,
      averageReactionMs: 1900,
      bestCombo: 2,
      hits: 4,
      timeouts: 5,
      decoyHits: 4,
    });

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(650);
  });

  it('gives visible progress for partial successful play', () => {
    const score = calculateStarJumperScore({
      hitRate: 0.5,
      averageReactionMs: 1400,
      bestCombo: 3,
      hits: 5,
      timeouts: 4,
      decoyHits: 1,
    });

    expect(score).toBeGreaterThan(250);
  });
});
