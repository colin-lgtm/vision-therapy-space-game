import { describe, expect, it } from 'vitest';
import {
  calculateDualSignalScore,
  dualSignalConfigForLevel,
  makeDualSignalRound,
} from '@/domain/dualSignal';

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

describe('dual signal decoder', () => {
  it('scales choices and signal timing by level', () => {
    const levelOne = dualSignalConfigForLevel(1);
    const advanced = dualSignalConfigForLevel(18);

    expect(levelOne.options).toBe(3);
    expect(advanced.options).toBeGreaterThan(levelOne.options);
    expect(advanced.signalMs).toBeLessThan(levelOne.signalMs);
    expect(advanced.decoyPairs).toBeGreaterThan(levelOne.decoyPairs);
  });

  it('builds a target pair with unique decoys', () => {
    const round = makeDualSignalRound(5, 2, seededRandom(6));

    expect(round.targetPair).toBe(`${round.left}${round.right}`);
    expect(round.options).toHaveLength(5);
    expect(round.options).toContain(round.targetPair);
    expect(new Set(round.options).size).toBe(round.options.length);
  });

  it('scores accurate decoding above weak attempts', () => {
    const strong = calculateDualSignalScore({
      accuracy: 0.95,
      averageReactionMs: 950,
      decodedPairs: 12,
      bestCombo: 6,
      shieldRemaining: 92,
      mistakes: 1,
    });
    const weak = calculateDualSignalScore({
      accuracy: 0.25,
      averageReactionMs: 3600,
      decodedPairs: 2,
      bestCombo: 1,
      shieldRemaining: 24,
      mistakes: 7,
    });

    expect(strong).toBeGreaterThan(850);
    expect(weak).toBeLessThan(360);
  });
});
