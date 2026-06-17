import { describe, expect, it } from 'vitest';
import { makeStarField } from '@/domain/starfield';

describe('starfield', () => {
  it('spreads stars across the full canvas instead of a tight band', () => {
    const stars = makeStarField(120, 1200, 800, 7);
    const columns = new Set(stars.map((star) => Math.floor(star.x / 200)));
    const rows = new Set(stars.map((star) => Math.floor(star.y / 160)));

    expect(stars).toHaveLength(120);
    expect(columns.size).toBeGreaterThanOrEqual(5);
    expect(rows.size).toBeGreaterThanOrEqual(5);
    expect(stars.some((star) => star.y < 120)).toBe(true);
    expect(stars.some((star) => star.y > 680)).toBe(true);
  });
});
