/// <reference types="vite/client" />

import type { PersistedAcademyState } from './domain/storage';

declare global {
  interface Window {
    nateAcademy?: {
      load: () => Promise<PersistedAcademyState | null>;
      save: (value: PersistedAcademyState) => Promise<boolean>;
      clear: () => Promise<boolean>;
    };
  }
}
