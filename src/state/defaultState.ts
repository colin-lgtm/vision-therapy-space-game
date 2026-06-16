import type { AcademyState, WorldId, WorldProgress } from '@/domain/types';

const enabledWorlds: WorldId[] = ['orbit-tracker', 'star-jumper', 'focus-portal', 'dual-signal'];

function progress(worldId: WorldId): WorldProgress {
  return {
    worldId,
    level: worldId === 'orbit-tracker' ? 1 : 0,
    stars: 0,
    bestScore: 0,
    plays: 0,
  };
}

export function createDefaultState(): AcademyState {
  return {
    profile: {
      nickname: 'Nate',
      avatar: 'rocket',
      rank: 'Launch Recruit',
      totalStars: 0,
      streakDays: 0,
      unlockedWorlds: ['orbit-tracker'],
      unlockedCosmetics: ['Starter Ship'],
    },
    missionPlan: {
      maxFuelSeconds: 15 * 60,
      enabledWorlds,
      difficultyCaps: {
        'orbit-tracker': 30,
        'star-jumper': 30,
        'focus-portal': 30,
        'dual-signal': 30,
      },
    },
    progress: {
      'orbit-tracker': progress('orbit-tracker'),
      'star-jumper': progress('star-jumper'),
      'focus-portal': progress('focus-portal'),
      'dual-signal': progress('dual-signal'),
    },
    sessions: [],
    missionRuns: [],
    events: [],
  };
}
