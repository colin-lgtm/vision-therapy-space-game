import type { MissionResult, WorldProgress } from './types';

export const maxWorldLevel = 30;

export function calculateOrbitScore(lockPercent: number, averageDistance: number): number {
  const lockScore = Math.round(lockPercent * 850);
  const distancePenalty = Math.min(250, Math.round(averageDistance * 3));
  return Math.max(0, Math.min(1000, lockScore + 150 - distancePenalty));
}

export function starsForScore(score: number): number {
  if (score >= 850) return 3;
  if (score >= 650) return 2;
  if (score >= 420) return 1;
  return 0;
}

export function nextLevelForProgress(progress: WorldProgress, result: MissionResult): number {
  if (result.status !== 'completed') return progress.level;
  const stars = starsForScore(result.score);
  if (stars < 2) return progress.level;
  return Math.min(maxWorldLevel, progress.level + 1);
}

export function rankForStars(totalStars: number): string {
  if (totalStars >= 240) return 'Galaxy Commander';
  if (totalStars >= 150) return 'Nebula Captain';
  if (totalStars >= 90) return 'Comet Pilot';
  if (totalStars >= 45) return 'Orbit Ranger';
  if (totalStars >= 15) return 'Star Cadet';
  return 'Launch Recruit';
}

export function unlockCosmetics(totalStars: number): string[] {
  const unlocks = ['Starter Ship'];
  if (totalStars >= 6) unlocks.push('Cyan Trail');
  if (totalStars >= 18) unlocks.push('Gold Comet Badge');
  if (totalStars >= 36) unlocks.push('Nebula Wings');
  if (totalStars >= 72) unlocks.push('Plasma Cockpit');
  if (totalStars >= 120) unlocks.push('Alien Co-Pilot');
  if (totalStars >= 180) unlocks.push('Galaxy Shield');
  if (totalStars >= 240) unlocks.push('Commander Trail');
  return unlocks;
}
