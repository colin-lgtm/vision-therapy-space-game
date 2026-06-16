export interface FocusPortalConfig {
  level: number;
  durationSeconds: number;
  options: number;
  approachMs: number;
  focusStart: number;
  focusEnd: number;
  decoyCount: number;
  glyphScale: number;
}

export interface FocusPortalScoreInput {
  accuracy: number;
  averageReactionMs: number;
  completedCycles: number;
  crashes: number;
  decoysSeen: number;
  misses: number;
}

export const focusPortalGlyphs = ['Z', '7', 'A', '5', 'K', '3', 'R', '9', 'M', '2', 'X', '6'];

export function focusPortalConfigForLevel(level: number): FocusPortalConfig {
  const clamped = Math.max(1, Math.min(30, Math.floor(level)));
  return {
    level: clamped,
    durationSeconds: 50 + Math.min(35, Math.floor(clamped / 4) * 5),
    options: Math.min(6, 3 + Math.floor((clamped - 1) / 6)),
    approachMs: Math.max(2300, 5600 - clamped * 95),
    focusStart: Math.max(0.34, 0.44 - clamped * 0.002),
    focusEnd: Math.min(0.84, 0.74 + clamped * 0.002),
    decoyCount: Math.min(7, 3 + Math.floor((clamped - 1) / 5)),
    glyphScale: Math.max(0.58, 1 - clamped * 0.012),
  };
}

export function calculateFocusPortalScore(input: FocusPortalScoreInput): number {
  const accuracyScore = Math.round(input.accuracy * 620);
  const speedScore = Math.max(0, 220 - Math.round(input.averageReactionMs / 18));
  const cycleScore = Math.min(130, input.completedCycles * 16);
  const decoyScore = Math.min(80, input.decoysSeen * 4);
  const missPenalty = Math.min(160, input.misses * 35);
  const crashPenalty = Math.min(180, input.crashes * 60);

  return Math.max(
    0,
    Math.min(
      1000,
      accuracyScore + speedScore + cycleScore + decoyScore - missPenalty - crashPenalty,
    ),
  );
}

export function buildFocusPortalOptions(
  target: string,
  optionCount: number,
  random: () => number = Math.random,
): string[] {
  const choices = focusPortalGlyphs.filter((glyph) => glyph !== target);
  const options = [target];

  while (options.length < Math.max(2, optionCount) && choices.length > 0) {
    const index = Math.floor(random() * choices.length);
    options.push(choices.splice(index, 1)[0]);
  }

  return shuffle(options, random);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
