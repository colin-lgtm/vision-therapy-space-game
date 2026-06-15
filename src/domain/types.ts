export type WorldId = 'orbit-tracker' | 'star-jumper' | 'focus-portal' | 'dual-signal';

export type InputKind = 'touch' | 'pen' | 'mouse' | 'unknown';

export type MissionStatus = 'completed' | 'quit' | 'fuel-empty';

export interface PlayerProfile {
  nickname: string;
  avatar: string;
  rank: string;
  totalStars: number;
  streakDays: number;
  unlockedWorlds: WorldId[];
  unlockedCosmetics: string[];
}

export interface MissionPlan {
  maxFuelSeconds: number;
  enabledWorlds: WorldId[];
  difficultyCaps: Record<WorldId, number>;
}

export interface WorldProgress {
  worldId: WorldId;
  level: number;
  stars: number;
  bestScore: number;
  plays: number;
  lastPlayedAt?: string;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt: string;
  activeSeconds: number;
  worldsPlayed: WorldId[];
  starsEarned: number;
  endReason: MissionStatus;
}

export interface MissionRunRecord {
  id: string;
  sessionId: string;
  worldId: WorldId;
  level: number;
  inputKind: InputKind;
  startedAt: string;
  endedAt: string;
  status: MissionStatus;
  starsEarned: number;
  score: number;
  metrics: Record<string, number | string | boolean>;
}

export interface AcademyEvent {
  id: string;
  at: string;
  type: string;
  payload: Record<string, number | string | boolean>;
}

export interface AcademyState {
  profile: PlayerProfile;
  missionPlan: MissionPlan;
  progress: Record<WorldId, WorldProgress>;
  sessions: SessionRecord[];
  missionRuns: MissionRunRecord[];
  events: AcademyEvent[];
}

export interface MissionResult {
  worldId: WorldId;
  level: number;
  inputKind: InputKind;
  status: MissionStatus;
  score: number;
  activeSeconds: number;
  metrics: Record<string, number | string | boolean>;
}
