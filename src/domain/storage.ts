import type { AcademyState } from './types';

export type PersistedAcademyState = AcademyState;

const browserStorageKey = 'nate-o-vision-space-academy';

export async function loadPersistedState(): Promise<PersistedAcademyState | null> {
  if (window.nateAcademy) {
    return window.nateAcademy.load();
  }

  const value = window.localStorage.getItem(browserStorageKey);
  return value ? (JSON.parse(value) as PersistedAcademyState) : null;
}

export async function savePersistedState(state: PersistedAcademyState): Promise<void> {
  if (window.nateAcademy) {
    await window.nateAcademy.save(state);
    return;
  }

  window.localStorage.setItem(browserStorageKey, JSON.stringify(state));
}

export async function clearPersistedState(): Promise<void> {
  if (window.nateAcademy) {
    await window.nateAcademy.clear();
    return;
  }

  window.localStorage.removeItem(browserStorageKey);
}
