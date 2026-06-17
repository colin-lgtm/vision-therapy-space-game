import { describe, expect, it } from 'vitest';
import {
  buildStarJumperRound,
  calculateStarJumperScore,
  starJumperConfigForLevel,
} from '@/domain/starJumper';

describe('star jumper math', () => {
  it('increases difficulty while keeping gates playable', () => {
    const first = starJumperConfigForLevel(1);
    const high = starJumperConfigForLevel(30);

    expect(first.gateLifetimeMs).toBeGreaterThan(high.gateLifetimeMs);
    expect(high.gateLifetimeMs).toBeGreaterThanOrEqual(950);
    expect(first.decoys).toBe(0);
    expect(high.decoys).toBeGreaterThan(first.decoys);
    expect(high.targetRadius).toBeGreaterThanOrEqual(34);
  });

  it('keeps the level one destination gate open twice as long for beginner pacing', () => {
    const first = starJumperConfigForLevel(1);
    const second = starJumperConfigForLevel(2);

    expect(first.gateLifetimeMs).toBe(4610);
    expect(first.gateLifetimeMs).toBeGreaterThan(second.gateLifetimeMs);
  });

  it('starts level one with only an origin and red target gate', () => {
    const config = starJumperConfigForLevel(1);
    const round = buildStarJumperRound(
      config,
      { width: 1000, height: 700 },
      { x: 250, y: 300 },
      10,
      seededRandom(),
    );

    expect(round.gates).toHaveLength(2);
    expect(round.gates.map((gate) => gate.kind)).toEqual(['origin', 'target']);
    expect(round.origin).toEqual({ x: 250, y: 300 });
    expect(round.gates[0]).toMatchObject({ kind: 'origin', x: 250, y: 300 });
    expect(round.gates[1].kind).toBe('target');
  });

  it('adds decoys only after early levels', () => {
    const config = starJumperConfigForLevel(10);
    const round = buildStarJumperRound(
      config,
      { width: 1000, height: 700 },
      { x: 250, y: 300 },
      0,
      seededRandom(),
    );

    expect(config.decoys).toBeGreaterThan(0);
    expect(round.gates.filter((gate) => gate.kind === 'decoy')).toHaveLength(config.decoys);
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

function seededRandom() {
  let seed = 12345;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
