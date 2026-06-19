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

export interface OrbitMotionOptions {
  seed?: number;
  wobble?: number;
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

export interface OrbitThreatConfig {
  level: number;
  activeSeconds: number;
  spawnIntervalMs: number;
  maxThreats: number;
  meteorSpeedMin: number;
  meteorSpeedMax: number;
  alienSpeed: number;
  alienChance: number;
  boltSpeed: number;
  boltIntervalMs: number;
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
    speed: Math.min(1.85, Number((0.42 * 1.16 ** (clamped - 1)).toFixed(3))),
    path: paths[Math.floor((clamped - 1) / 2) % paths.length],
    durationSeconds: Math.min(120, 55 + clamped * 3),
  };
}

export function orbitThreatConfigForLevel(level: number, activeSeconds = 0): OrbitThreatConfig {
  const clamped = Math.max(1, Math.min(30, Math.floor(level)));
  const runPressure = Math.min(1, Math.max(0, activeSeconds) / 60);

  return {
    level: clamped,
    activeSeconds,
    spawnIntervalMs: Math.max(420, Math.round(1080 - clamped * 18 - runPressure * 260)),
    maxThreats: Math.min(18, 5 + Math.floor(clamped / 2) + Math.floor(runPressure * 5)),
    meteorSpeedMin: Number((1.0 + clamped * 0.025 + runPressure * 0.28).toFixed(3)),
    meteorSpeedMax: Number((1.72 + clamped * 0.04 + runPressure * 0.44).toFixed(3)),
    alienSpeed: Number((0.64 + clamped * 0.02 + runPressure * 0.22).toFixed(3)),
    alienChance: Number(Math.min(0.5, 0.12 + clamped * 0.018 + runPressure * 0.1).toFixed(3)),
    boltSpeed: Number((4.8 + clamped * 0.055 + runPressure * 0.75).toFixed(3)),
    boltIntervalMs: Math.max(540, Math.round(1420 - clamped * 32 - runPressure * 260)),
  };
}

export function targetPosition(
  path: OrbitPath,
  elapsedSeconds: number,
  bounds: OrbitBounds,
  options: OrbitMotionOptions = {},
): Point {
  const usableWidth = Math.max(1, bounds.width - bounds.padding * 2);
  const usableHeight = Math.max(1, bounds.height - bounds.padding * 2);
  const centerX = bounds.padding + usableWidth / 2;
  const centerY = bounds.padding + usableHeight / 2;
  const radiusX = usableWidth * 0.36;
  const radiusY = usableHeight * 0.32;
  const t = elapsedSeconds;

  if (path === 'vertical') {
    return withOrganicDrift(
      {
        x: centerX + Math.sin(t * 0.45) * radiusX * 0.25,
        y: centerY + Math.sin(t) * radiusY,
      },
      bounds,
      t,
      options,
    );
  }

  if (path === 'figure-eight') {
    return withOrganicDrift(
      {
        x: centerX + Math.sin(t) * radiusX,
        y: centerY + Math.sin(t * 2) * radiusY * 0.58,
      },
      bounds,
      t,
      options,
    );
  }

  if (path === 'swoop') {
    return withOrganicDrift(
      {
        x: centerX + Math.sin(t * 0.9) * radiusX + Math.sin(t * 2.1) * radiusX * 0.14,
        y: centerY + Math.cos(t * 1.35) * radiusY * 0.68,
      },
      bounds,
      t,
      options,
    );
  }

  if (path === 'spiral') {
    const pulse = 0.55 + Math.sin(t * 0.72) * 0.28;
    return withOrganicDrift(
      {
        x: centerX + Math.cos(t * 1.2) * radiusX * pulse,
        y: centerY + Math.sin(t * 1.45) * radiusY * pulse,
      },
      bounds,
      t,
      options,
    );
  }

  if (path === 'lissajous') {
    return withOrganicDrift(
      {
        x: centerX + Math.sin(t * 1.35 + Math.PI / 4) * radiusX * 0.92,
        y: centerY + Math.sin(t * 1.95) * radiusY * 0.76,
      },
      bounds,
      t,
      options,
    );
  }

  if (path === 'rectangle') {
    const phase = ((t / (Math.PI * 2)) % 1) * 4;
    let point: Point;
    if (phase < 1) point = { x: centerX - radiusX + phase * 2 * radiusX, y: centerY - radiusY };
    else if (phase < 2)
      point = { x: centerX + radiusX, y: centerY - radiusY + (phase - 1) * 2 * radiusY };
    else if (phase < 3)
      point = { x: centerX + radiusX - (phase - 2) * 2 * radiusX, y: centerY + radiusY };
    else point = { x: centerX - radiusX, y: centerY + radiusY - (phase - 3) * 2 * radiusY };
    return withOrganicDrift(point, bounds, t, options);
  }

  const circlePulse = 0.86 + Math.sin(t * 0.73 + (options.seed ?? 0)) * 0.11;
  return withOrganicDrift(
    {
      x: centerX + Math.cos(t * 0.92 + Math.sin(t * 0.31) * 0.28) * radiusX * circlePulse,
      y: centerY + Math.sin(t * 1.08 + Math.cos(t * 0.37) * 0.24) * radiusY * circlePulse,
    },
    bounds,
    t,
    options,
  );
}

function withOrganicDrift(
  point: Point,
  bounds: OrbitBounds,
  elapsedSeconds: number,
  options: OrbitMotionOptions,
): Point {
  const wobble = options.wobble ?? 0;
  if (wobble <= 0) return point;

  const seed = options.seed ?? 0;
  const amplitude = Math.min(bounds.width, bounds.height) * 0.055 * wobble;
  const driftX =
    Math.sin(elapsedSeconds * 0.83 + seed) * amplitude +
    Math.sin(elapsedSeconds * 1.71 + seed * 1.37) * amplitude * 0.48;
  const driftY =
    Math.cos(elapsedSeconds * 0.67 + seed * 0.71) * amplitude +
    Math.sin(elapsedSeconds * 1.43 + seed * 2.11) * amplitude * 0.42;

  return clampToBounds(
    {
      x: point.x + driftX,
      y: point.y + driftY,
    },
    bounds,
  );
}

function clampToBounds(point: Point, bounds: OrbitBounds): Point {
  return {
    x: Math.min(bounds.width, Math.max(0, point.x)),
    y: Math.min(bounds.height, Math.max(0, point.y)),
  };
}

export function orbitWobbleForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(30, level));
  return Math.min(1.65, 0.55 + clamped * 0.045);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
