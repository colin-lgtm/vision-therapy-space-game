import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { createDefaultState } from './defaultState';
import { loadPersistedState, savePersistedState } from '@/domain/storage';
import {
  nextLevelForProgress,
  rankForStars,
  starsForScore,
  unlockCosmetics,
} from '@/domain/progression';
import type {
  AcademyEvent,
  AcademyState,
  MissionResult,
  MissionRunRecord,
  SessionRecord,
} from '@/domain/types';

interface AcademyStore extends AcademyState {
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  saveNow: () => Promise<void>;
  recordMissionResult: (result: MissionResult) => Promise<void>;
  logEvent: (event: Omit<AcademyEvent, 'id' | 'at'>) => Promise<void>;
  unlockAllForTesting: () => Promise<void>;
}

function todayIso(): string {
  return new Date().toISOString();
}

function applyMissionResult(state: AcademyState, result: MissionResult): AcademyState {
  const now = todayIso();
  const sessionId = nanoid();
  const runId = nanoid();
  const starsEarned = starsForScore(result.score);
  const currentProgress = state.progress[result.worldId];
  const nextLevel = nextLevelForProgress(currentProgress, result);
  const worldStars = currentProgress.stars + starsEarned;
  const totalStars = state.profile.totalStars + starsEarned;

  const session: SessionRecord = {
    id: sessionId,
    startedAt: new Date(Date.now() - result.activeSeconds * 1000).toISOString(),
    endedAt: now,
    activeSeconds: result.activeSeconds,
    worldsPlayed: [result.worldId],
    starsEarned,
    endReason: result.status,
  };

  const missionRun: MissionRunRecord = {
    id: runId,
    sessionId,
    worldId: result.worldId,
    level: result.level,
    inputKind: result.inputKind,
    startedAt: session.startedAt,
    endedAt: now,
    status: result.status,
    starsEarned,
    score: result.score,
    metrics: result.metrics,
  };

  const unlockedWorlds = [...state.profile.unlockedWorlds];
  if (totalStars >= 6 && !unlockedWorlds.includes('star-jumper'))
    unlockedWorlds.push('star-jumper');
  if (totalStars >= 12 && !unlockedWorlds.includes('focus-portal'))
    unlockedWorlds.push('focus-portal');
  if (totalStars >= 18 && !unlockedWorlds.includes('dual-signal'))
    unlockedWorlds.push('dual-signal');

  return {
    ...state,
    profile: {
      ...state.profile,
      totalStars,
      rank: rankForStars(totalStars),
      unlockedWorlds,
      unlockedCosmetics: unlockCosmetics(totalStars),
    },
    progress: {
      ...state.progress,
      [result.worldId]: {
        ...currentProgress,
        level: nextLevel,
        stars: worldStars,
        bestScore: Math.max(currentProgress.bestScore, result.score),
        plays: currentProgress.plays + 1,
        lastPlayedAt: now,
      },
    },
    sessions: [session, ...state.sessions].slice(0, 500),
    missionRuns: [missionRun, ...state.missionRuns].slice(0, 2000),
    events: [
      {
        id: nanoid(),
        at: now,
        type: 'mission.completed',
        payload: {
          worldId: result.worldId,
          level: result.level,
          score: result.score,
          starsEarned,
          inputKind: result.inputKind,
        },
      },
      ...state.events,
    ].slice(0, 5000),
  };
}

function toPersistableState(state: AcademyStore): AcademyState {
  return {
    profile: state.profile,
    missionPlan: state.missionPlan,
    progress: state.progress,
    sessions: state.sessions,
    missionRuns: state.missionRuns,
    events: state.events,
  };
}

export const useAcademyStore = create<AcademyStore>((set, get) => ({
  ...createDefaultState(),
  hasHydrated: false,
  hydrate: async () => {
    const persisted = await loadPersistedState();
    set({ ...(persisted ?? createDefaultState()), hasHydrated: true });
  },
  saveNow: async () => {
    await savePersistedState(toPersistableState(get()));
  },
  recordMissionResult: async (result) => {
    const nextState = applyMissionResult(get(), result);
    set(nextState);
    await savePersistedState(nextState);
  },
  logEvent: async (event) => {
    const nextState = {
      ...get(),
      events: [{ id: nanoid(), at: todayIso(), ...event }, ...get().events].slice(0, 5000),
    };
    set(nextState);
    await savePersistedState(toPersistableState(nextState));
  },
  unlockAllForTesting: async () => {
    const nextState: AcademyState = {
      ...toPersistableState(get()),
      profile: {
        ...get().profile,
        totalStars: Math.max(get().profile.totalStars, 30),
        rank: rankForStars(Math.max(get().profile.totalStars, 30)),
        unlockedWorlds: ['orbit-tracker', 'star-jumper', 'focus-portal', 'dual-signal'],
        unlockedCosmetics: unlockCosmetics(Math.max(get().profile.totalStars, 30)),
      },
      events: [
        {
          id: nanoid(),
          at: todayIso(),
          type: 'testing.unlockAll',
          payload: { totalStars: 30 },
        },
        ...get().events,
      ].slice(0, 5000),
    };
    set(nextState);
    await savePersistedState(nextState);
  },
}));

export function missionAccuracyLabel(score: number): string {
  if (score >= 850) return 'Legendary lock';
  if (score >= 650) return 'Strong lock';
  if (score >= 420) return 'Good start';
  return 'Training run';
}

export function summarizeRecentInput(runs: MissionRunRecord[]): string {
  const latest = runs[0]?.inputKind;
  if (!latest || latest === 'unknown') return 'No input yet';
  return latest === 'touch' ? 'Touch' : latest === 'pen' ? 'Surface Pen' : 'Mouse';
}
