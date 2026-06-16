export interface DualSignalConfig {
  level: number;
  durationSeconds: number;
  options: number;
  signalMs: number;
  decoyPairs: number;
}

export interface DualSignalRound {
  left: string;
  right: string;
  targetPair: string;
  options: string[];
}

export interface DualSignalScoreInput {
  accuracy: number;
  averageReactionMs: number;
  decodedPairs: number;
  bestCombo: number;
  shieldRemaining: number;
  mistakes: number;
}

export const leftSignals = ['A', 'K', 'R', 'M', 'X', 'T', 'V', 'N'];
export const rightSignals = ['3', '5', '7', '9', '2', '6', '4', '8'];

export function dualSignalConfigForLevel(level: number): DualSignalConfig {
  const clamped = Math.max(1, Math.min(30, Math.floor(level)));
  return {
    level: clamped,
    durationSeconds: 50 + Math.min(35, Math.floor(clamped / 4) * 5),
    options: Math.min(6, 3 + Math.floor((clamped - 1) / 6)),
    signalMs: Math.max(2200, 5200 - clamped * 85),
    decoyPairs: Math.min(5, 2 + Math.floor((clamped - 1) / 5)),
  };
}

export function makeDualSignalRound(
  optionCount: number,
  offset = 0,
  random: () => number = Math.random,
): DualSignalRound {
  const left = leftSignals[offset % leftSignals.length];
  const right = rightSignals[(offset * 3) % rightSignals.length];
  const targetPair = pairLabel(left, right);

  const decoys = [
    pairLabel(left, rightSignals[(offset * 3 + 1) % rightSignals.length]),
    pairLabel(leftSignals[(offset + 1) % leftSignals.length], right),
    pairLabel(
      leftSignals[(offset + 2) % leftSignals.length],
      rightSignals[(offset * 3 + 2) % rightSignals.length],
    ),
    pairLabel(right, left),
    pairLabel(
      leftSignals[(offset + 3) % leftSignals.length],
      rightSignals[(offset * 3 + 4) % rightSignals.length],
    ),
  ].filter((pair) => pair !== targetPair);

  const options = [targetPair];
  while (options.length < Math.max(2, optionCount) && decoys.length > 0) {
    const index = Math.floor(random() * decoys.length);
    const [choice] = decoys.splice(index, 1);
    if (!options.includes(choice)) options.push(choice);
  }

  return {
    left,
    right,
    targetPair,
    options: shuffle(options, random),
  };
}

export function calculateDualSignalScore(input: DualSignalScoreInput): number {
  const accuracyScore = Math.round(input.accuracy * 560);
  const speedScore =
    input.decodedPairs > 0 ? Math.max(0, 200 - Math.round(input.averageReactionMs / 18)) : 0;
  const decodeScore = Math.min(150, input.decodedPairs * 18);
  const comboScore = Math.min(110, input.bestCombo * 18);
  const shieldScore = Math.round(input.shieldRemaining * 1.2);
  const penalty = Math.min(190, input.mistakes * 38);

  return Math.max(
    0,
    Math.min(1000, accuracyScore + speedScore + decodeScore + comboScore + shieldScore - penalty),
  );
}

function pairLabel(left: string, right: string): string {
  return `${left}${right}`;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
