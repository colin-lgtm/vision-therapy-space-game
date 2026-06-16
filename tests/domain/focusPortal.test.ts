import { describe, expect, it } from 'vitest';
import {
  buildFocusPortalOptions,
  calculateFocusPortalScore,
  focusPortalConfigForLevel,
} from '@/domain/focusPortal';

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

describe('focus portal', () => {
  it('scales option count, approach speed, and decoys by level', () => {
    const levelOne = focusPortalConfigForLevel(1);
    const advanced = focusPortalConfigForLevel(18);

    expect(levelOne.options).toBe(3);
    expect(advanced.options).toBeGreaterThan(levelOne.options);
    expect(advanced.approachMs).toBeLessThan(levelOne.approachMs);
    expect(advanced.decoyCount).toBeGreaterThan(levelOne.decoyCount);
    expect(advanced.focusStart).toBeLessThan(levelOne.focusStart);
    expect(advanced.focusEnd).toBeGreaterThan(levelOne.focusEnd);
    expect(advanced.glyphScale).toBeLessThan(levelOne.glyphScale);
  });

  it('builds one target option plus unique distractors', () => {
    const options = buildFocusPortalOptions('Z', 5, seededRandom(8));

    expect(options).toHaveLength(5);
    expect(options).toContain('Z');
    expect(new Set(options).size).toBe(options.length);
  });

  it('scores accurate complete rounds above weak attempts', () => {
    const strong = calculateFocusPortalScore({
      accuracy: 1,
      averageReactionMs: 900,
      completedCycles: 7,
      crashes: 0,
      decoysSeen: 18,
      misses: 0,
    });
    const weak = calculateFocusPortalScore({
      accuracy: 0.25,
      averageReactionMs: 4200,
      completedCycles: 1,
      crashes: 2,
      decoysSeen: 2,
      misses: 4,
    });

    expect(strong).toBeGreaterThan(850);
    expect(weak).toBeLessThan(420);
  });
});
