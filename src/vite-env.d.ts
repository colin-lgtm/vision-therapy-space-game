/// <reference types="vite/client" />

import type { PersistedAcademyState } from './domain/storage';

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'current'
  | 'error'
  | 'unavailable';

export interface UpdateStatus {
  state: UpdateState;
  message: string;
  version?: string;
  availableVersion?: string;
  progress?: number;
  detail?: string;
  source?: string;
  updateInfo?: unknown;
}

declare global {
  interface Window {
    nateAcademy?: {
      load: () => Promise<PersistedAcademyState | null>;
      save: (value: PersistedAcademyState) => Promise<boolean>;
      clear: () => Promise<boolean>;
      updates?: {
        info: () => Promise<UpdateStatus>;
        check: () => Promise<UpdateStatus>;
        install: () => Promise<boolean>;
        onStatus: (callback: (status: UpdateStatus) => void) => () => void;
      };
    };
  }
}
