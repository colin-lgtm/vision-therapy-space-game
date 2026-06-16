import { describe, expect, it } from 'vitest';
import { distance, orbitConfigForLevel, orbitWobbleForLevel, targetPosition } from '@/domain/orbit';

describe('orbit math', () => {
  it('keeps level configuration within playable bounds', () => {
    const first = orbitConfigForLevel(1);
    const high = orbitConfigForLevel(30);

    expect(first.targetRadius).toBeGreaterThan(high.targetRadius);
    expect(first.speed).toBeCloseTo(0.34);
    expect(high.targetRadius).toBeGreaterThanOrEqual(28);
    expect(high.durationSeconds).toBeLessThanOrEqual(120);
  });

  it('starts slowly and ramps target speed by about 10 to 20 percent per early level', () => {
    const first = orbitConfigForLevel(1);
    const second = orbitConfigForLevel(2);
    const fifth = orbitConfigForLevel(5);

    expect(second.speed / first.speed).toBeGreaterThanOrEqual(1.1);
    expect(second.speed / first.speed).toBeLessThanOrEqual(1.2);
    expect(fifth.speed).toBeGreaterThan(second.speed);
  });

  it('adds more advanced paths as levels increase', () => {
    expect(orbitConfigForLevel(1).path).toBe('circle');
    expect(orbitConfigForLevel(3).path).toBe('figure-eight');
    expect(orbitConfigForLevel(5).path).toBe('swoop');
    expect(orbitConfigForLevel(9).path).toBe('lissajous');
  });

  it('keeps the first path organic instead of a perfect circle', () => {
    const bounds = { width: 1000, height: 700, padding: 100 };
    const center = { x: bounds.width / 2, y: bounds.height / 2 };
    const samples = [0, 1, 2, 3, 4].map((time) => targetPosition('circle', time, bounds));
    const radii = samples.map((point) => Math.round(distance(point, center)));
    const uniqueRadii = new Set(radii);

    expect(uniqueRadii.size).toBeGreaterThan(2);
  });

  it('uses run seed and level wobble to vary the same path', () => {
    const bounds = { width: 1000, height: 700, padding: 100 };
    const first = targetPosition('circle', 2.4, bounds, {
      seed: 1,
      wobble: orbitWobbleForLevel(1),
    });
    const second = targetPosition('circle', 2.4, bounds, {
      seed: 44,
      wobble: orbitWobbleForLevel(1),
    });

    expect(Math.round(distance(first, second))).toBeGreaterThan(20);
  });

  it('generates target positions inside padded canvas bounds', () => {
    const bounds = { width: 1000, height: 700, padding: 100 };
    const paths = [
      'circle',
      'vertical',
      'figure-eight',
      'rectangle',
      'swoop',
      'spiral',
      'lissajous',
    ] as const;

    for (const path of paths) {
      for (let i = 0; i < 20; i += 1) {
        const point = targetPosition(path, i * 0.25, bounds);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(bounds.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(bounds.height);
      }
    }
  });

  it('measures euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
