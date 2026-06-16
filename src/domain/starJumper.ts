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
