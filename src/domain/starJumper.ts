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
  timeouts: number;
  decoyHits: number;
}

export function starJumperConfigForLevel(level: number): StarJumperLevelConfig {
  const clamped = Math.max(1, Math.min(30, level));
  return {
    level: clamped,
    durationSeconds: Math.min(90, 42 + clamped * 2),
    gateLifetimeMs: Math.max(950, 2350 - clamped * 45),
    decoys: Math.min(5, 1 + Math.floor(clamped / 4)),
    targetRadius: Math.max(34, 58 - clamped * 0.7),
  };
}

export function calculateStarJumperScore(input: StarJumperScoreInput): number {
  const accuracyScore = Math.round(input.hitRate * 650);
  const reactionScore = Math.max(0, 230 - Math.round(input.averageReactionMs / 8));
  const comboScore = Math.min(160, input.bestCombo * 18);
  const penalty = input.timeouts * 35 + input.decoyHits * 45;

  return Math.max(0, Math.min(1000, accuracyScore + reactionScore + comboScore - penalty));
}
