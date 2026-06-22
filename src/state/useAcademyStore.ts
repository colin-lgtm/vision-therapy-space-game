import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { createDefaultState, enabledWorlds } from './defaultState';
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
  WorldId,
} from '@/domain/types';

interface AcademyStore extends AcademyState {
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  saveNow: () => Promise<void>;
  recordMissionResult: (result: MissionResult) => Promise<void>;
  logEvent: (event: Omit<AcademyEvent, 'id' | 'at'>) => Promise<void>;
  unlockAllForTesting: () => Promise<void>;
  lockGamesForTesting: () => Promise<void>;
  resetLevelsForTesting: () => Promise<void>;
  maxLevelsForTesting: () => Promise<void>;
  setWorldLevelForTesting: (worldId: WorldId, level: number) => Promise<void>;
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

function normalizeState(state: AcademyState): AcademyState {
  const defaults = createDefaultState();
  return {
    ...defaults,
    ...state,
    profile: {
      ...defaults.profile,
      ...state.profile,
      unlockedWorlds: [...enabledWorlds],
    },
    missionPlan: {
      ...defaults.missionPlan,
      ...state.missionPlan,
      enabledWorlds: [...enabledWorlds],
      difficultyCaps: {
        ...defaults.missionPlan.difficultyCaps,
        ...state.missionPlan?.difficultyCaps,
      },
    },
    progress: enabledWorlds.reduce<AcademyState['progress']>(
      (progress, worldId) => ({
        ...progress,
        [worldId]: {
          ...defaults.progress[worldId],
          ...state.progress?.[worldId],
          level: Math.max(1, state.progress?.[worldId]?.level ?? 1),
        },
      }),
      defaults.progress,
    ),
    sessions: state.sessions ?? [],
    missionRuns: state.missionRuns ?? [],
    events: state.events ?? [],
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
    const nextState = normalizeState(persisted ?? createDefaultState());
    set({ ...nextState, hasHydrated: true });
    if (persisted) await savePersistedState(nextState);
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
        unlockedWorlds: [...enabledWorlds],
        unlockedCosmetics: unlockCosmetics(Math.max(get().profile.totalStars, 30)),
      },
      progress: enabledWorlds.reduce<AcademyState['progress']>(
        (progress, worldId) => ({
          ...progress,
          [worldId]: {
            ...get().progress[worldId],
            level: Math.max(1, get().progress[worldId].level),
          },
        }),
        get().progress,
      ),
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
  lockGamesForTesting: async () => {
    const nextState: AcademyState = {
      ...toPersistableState(get()),
      profile: {
        ...get().profile,
        unlockedWorlds: ['orbit-tracker'],
      },
      events: [
        {
          id: nanoid(),
          at: todayIso(),
          type: 'testing.lockGames',
          payload: { unlockedWorlds: 1 },
        },
        ...get().events,
      ].slice(0, 5000),
    };
    set(nextState);
    await savePersistedState(nextState);
  },
  resetLevelsForTesting: async () => {
    const nextState: AcademyState = {
      ...toPersistableState(get()),
      progress: enabledWorlds.reduce<AcademyState['progress']>(
        (progress, worldId) => ({
          ...progress,
          [worldId]: {
            ...get().progress[worldId],
            level: 1,
          },
        }),
        get().progress,
      ),
      events: [
        {
          id: nanoid(),
          at: todayIso(),
          type: 'testing.resetLevels',
          payload: { level: 1 },
        },
        ...get().events,
      ].slice(0, 5000),
    };
    set(nextState);
    await savePersistedState(nextState);
  },
  maxLevelsForTesting: async () => {
    const nextState: AcademyState = {
      ...toPersistableState(get()),
      progress: enabledWorlds.reduce<AcademyState['progress']>(
        (progress, worldId) => ({
          ...progress,
          [worldId]: {
            ...get().progress[worldId],
            level: 30,
          },
        }),
        get().progress,
      ),
      events: [
        {
          id: nanoid(),
          at: todayIso(),
          type: 'testing.maxLevels',
          payload: { level: 30 },
        },
        ...get().events,
      ].slice(0, 5000),
    };
    set(nextState);
    await savePersistedState(nextState);
  },
  setWorldLevelForTesting: async (worldId, level) => {
    const safeLevel = Math.max(1, Math.min(30, Math.floor(level)));
    const nextState: AcademyState = {
      ...toPersistableState(get()),
      progress: {
        ...get().progress,
        [worldId]: {
          ...get().progress[worldId],
          level: safeLevel,
        },
      },
      events: [
        {
          id: nanoid(),
          at: todayIso(),
          type: 'testing.levelSelect',
          payload: { worldId, level: safeLevel },
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
