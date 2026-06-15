export type OrbitPath =
  | 'circle'
  | 'vertical'
  | 'figure-eight'
  | 'rectangle'
  | 'swoop'
  | 'spiral'
  | 'lissajous';

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
  const paths: OrbitPath[] = [
    'circle',
    'figure-eight',
    'swoop',
    'vertical',
    'lissajous',
    'rectangle',
    'spiral',
  ];
  return {
    level: clamped,
    targetRadius: Math.max(28, 56 - clamped * 0.8),
    speed: 0.62 + clamped * 0.06,
    path: paths[Math.floor((clamped - 1) / 2) % paths.length],
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

  if (path === 'vertical') {
    return {
      x: centerX + Math.sin(t * 0.45) * radiusX * 0.25,
      y: centerY + Math.sin(t) * radiusY,
    };
  }

  if (path === 'figure-eight') {
    return {
      x: centerX + Math.sin(t) * radiusX,
      y: centerY + Math.sin(t * 2) * radiusY * 0.58,
    };
  }

  if (path === 'swoop') {
    return {
      x: centerX + Math.sin(t * 0.9) * radiusX + Math.sin(t * 2.1) * radiusX * 0.14,
      y: centerY + Math.cos(t * 1.35) * radiusY * 0.68,
    };
  }

  if (path === 'spiral') {
    const pulse = 0.55 + Math.sin(t * 0.72) * 0.28;
    return {
      x: centerX + Math.cos(t * 1.2) * radiusX * pulse,
      y: centerY + Math.sin(t * 1.45) * radiusY * pulse,
    };
  }

  if (path === 'lissajous') {
    return {
      x: centerX + Math.sin(t * 1.35 + Math.PI / 4) * radiusX * 0.92,
      y: centerY + Math.sin(t * 1.95) * radiusY * 0.76,
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
