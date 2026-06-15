import { describe, expect, it } from 'vitest';
import { distance, orbitConfigForLevel, targetPosition } from '@/domain/orbit';

describe('orbit math', () => {
  it('keeps level configuration within playable bounds', () => {
    const first = orbitConfigForLevel(1);
    const high = orbitConfigForLevel(30);

    expect(first.targetRadius).toBeGreaterThan(high.targetRadius);
    expect(high.targetRadius).toBeGreaterThanOrEqual(28);
    expect(high.durationSeconds).toBeLessThanOrEqual(120);
  });

  it('adds more advanced paths as levels increase', () => {
    expect(orbitConfigForLevel(1).path).toBe('circle');
    expect(orbitConfigForLevel(3).path).toBe('figure-eight');
    expect(orbitConfigForLevel(5).path).toBe('swoop');
    expect(orbitConfigForLevel(9).path).toBe('lissajous');
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
