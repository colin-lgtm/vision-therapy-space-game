import type { Point } from './orbit';

export interface StarJumperLevelConfig {
  level: number;
  durationSeconds: number;
  gateLifetimeMs: number;
  decoys: number;
  targetRadius: number;
}

export interface StarJumperScoreInput {
  hitRate: number;
  averageReactionMs: number;
  bestCombo: number;
  hits: number;
  timeouts: number;
  decoyHits: number;
}

export type StarJumperGateKind = 'origin' | 'target' | 'decoy';

export interface StarJumperGate {
  id: number;
  x: number;
  y: number;
  radius: number;
  kind: StarJumperGateKind;
  phase: number;
}

export interface StarJumperBounds {
  width: number;
  height: number;
}

export interface StarJumperRound {
  gates: StarJumperGate[];
  origin: Point;
  target: Point;
  nextGateId: number;
}

export function starJumperConfigForLevel(level: number): StarJumperLevelConfig {
  const clamped = Math.max(1, Math.min(30, level));
  const baseGateLifetimeMs = Math.max(950, 2350 - clamped * 45);
  return {
    level: clamped,
    durationSeconds: Math.min(90, 42 + clamped * 2),
    gateLifetimeMs: clamped === 1 ? baseGateLifetimeMs * 2 : baseGateLifetimeMs,
    decoys: Math.min(5, Math.floor(Math.max(0, clamped - 2) / 4)),
    targetRadius: Math.max(34, 58 - clamped * 0.7),
  };
}

export function buildStarJumperRound(
  config: StarJumperLevelConfig,
  bounds: StarJumperBounds,
  origin: Point | null,
  nextGateId: number,
  random = Math.random,
): StarJumperRound {
  const padding = Math.max(76, config.targetRadius + 22);
  const currentStar = origin ?? {
    x: randomBetween(padding, bounds.width - padding, random),
    y: randomBetween(padding + 10, bounds.height - padding, random),
  };

  const originGate: StarJumperGate = {
    id: nextGateId,
    x: currentStar.x,
    y: currentStar.y,
    radius: config.targetRadius * 0.9,
    kind: 'origin',
    phase: random() * Math.PI * 2,
  };
  let gateId = nextGateId + 1;

  const target: StarJumperGate = {
    id: gateId,
    x: randomBetween(padding, bounds.width - padding, random),
    y: randomBetween(padding + 10, bounds.height - padding, random),
    radius: config.targetRadius,
    kind: 'target',
    phase: random() * Math.PI * 2,
  };
  gateId += 1;

  let targetGuard = 0;
  while (pointDistance(originGate, target) < config.targetRadius * 3.3 && targetGuard < 80) {
    targetGuard += 1;
    target.x = randomBetween(padding, bounds.width - padding, random);
    target.y = randomBetween(padding + 10, bounds.height - padding, random);
  }

  const gates = [originGate, target];
  let guard = 0;
  while (gates.length < config.decoys + 2 && guard < 120) {
    guard += 1;
    const candidate: StarJumperGate = {
      id: gateId,
      x: randomBetween(padding, bounds.width - padding, random),
      y: randomBetween(padding + 10, bounds.height - padding, random),
      radius: config.targetRadius * randomBetween(0.78, 0.95, random),
      kind: 'decoy',
      phase: random() * Math.PI * 2,
    };
    if (gates.every((gate) => pointDistance(gate, candidate) > config.targetRadius * 2.5)) {
      gates.push(candidate);
      gateId += 1;
    }
  }

  return {
    gates,
    origin: { x: originGate.x, y: originGate.y },
    target: { x: target.x, y: target.y },
    nextGateId: gateId,
  };
}

export function calculateStarJumperScore(input: StarJumperScoreInput): number {
  const accuracyScore = Math.round(input.hitRate * 560);
  const jumpScore = Math.min(220, input.hits * 18);
  const reactionScore =
    input.hits > 0 ? Math.max(0, 190 - Math.round(input.averageReactionMs / 11)) : 0;
  const comboScore = Math.min(190, input.bestCombo * 22);
  const penalty = input.timeouts * 24 + input.decoyHits * 36;

  return Math.max(
    0,
    Math.min(1000, accuracyScore + jumpScore + reactionScore + comboScore - penalty),
  );
}

function randomBetween(min: number, max: number, random: () => number): number {
  return min + random() * (max - min);
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
