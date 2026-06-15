export type OrbitPath = 'circle' | 'horizontal' | 'vertical' | 'figure-eight' | 'rectangle';

export interface OrbitBounds {
  width: number;
  height: number;
  padding: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface OrbitLevelConfig {
  level: number;
  targetRadius: number;
  speed: number;
  path: OrbitPath;
  durationSeconds: number;
}

export function orbitConfigForLevel(level: number): OrbitLevelConfig {
  const clamped = Math.max(1, Math.min(30, level));
  const paths: OrbitPath[] = ['horizontal', 'circle', 'vertical', 'figure-eight', 'rectangle'];
  return {
    level: clamped,
    targetRadius: Math.max(28, 56 - clamped * 0.8),
    speed: 0.55 + clamped * 0.055,
    path: paths[Math.floor((clamped - 1) / 3) % paths.length],
    durationSeconds: Math.min(120, 55 + clamped * 3),
  };
}

export function targetPosition(
  path: OrbitPath,
  elapsedSeconds: number,
  bounds: OrbitBounds,
): Point {
  const usableWidth = Math.max(1, bounds.width - bounds.padding * 2);
  const usableHeight = Math.max(1, bounds.height - bounds.padding * 2);
  const centerX = bounds.padding + usableWidth / 2;
  const centerY = bounds.padding + usableHeight / 2;
  const radiusX = usableWidth * 0.36;
  const radiusY = usableHeight * 0.32;
  const t = elapsedSeconds;

  if (path === 'horizontal') {
    return {
      x: centerX + Math.sin(t) * radiusX,
      y: centerY + Math.sin(t * 0.5) * radiusY * 0.25,
    };
  }

  if (path === 'vertical') {
    return {
      x: centerX + Math.sin(t * 0.45) * radiusX * 0.25,
      y: centerY + Math.sin(t) * radiusY,
    };
  }

  if (path === 'figure-eight') {
    return {
      x: centerX + Math.sin(t) * radiusX,
      y: centerY + Math.sin(t * 2) * radiusY * 0.52,
    };
  }

  if (path === 'rectangle') {
    const phase = ((t / (Math.PI * 2)) % 1) * 4;
    if (phase < 1) return { x: centerX - radiusX + phase * 2 * radiusX, y: centerY - radiusY };
    if (phase < 2)
      return { x: centerX + radiusX, y: centerY - radiusY + (phase - 1) * 2 * radiusY };
    if (phase < 3)
      return { x: centerX + radiusX - (phase - 2) * 2 * radiusX, y: centerY + radiusY };
    return { x: centerX - radiusX, y: centerY + radiusY - (phase - 3) * 2 * radiusY };
  }

  return {
    x: centerX + Math.cos(t) * radiusX,
    y: centerY + Math.sin(t) * radiusY,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
