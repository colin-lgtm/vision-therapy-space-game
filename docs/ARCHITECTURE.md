# Architecture

## Overview

Nate-O-Vision Space Academy is split into four layers:

1. Electron host
2. React application shell
3. Game/domain logic
4. Local persistence and export

This separation keeps game mechanics testable outside Electron and makes it possible to package the same React app for web-based QA during development.

## Runtime

Electron loads either:

- the Vite development server when `VITE_DEV_SERVER_URL` is present, or
- `dist/index.html` in production builds.

The Electron preload exposes a narrow `window.nateAcademy` API:

- `load()`
- `save(value)`
- `clear()`

The renderer never receives direct Node.js access.

## Source Map

- `electron/`
  - `main.cjs`: application window, lifecycle, and persistence handlers.
  - `preload.cjs`: safe storage bridge exposed to the renderer.
- `src/domain/`
  - Pure TypeScript logic for scoring, levels, orbit math, world definitions, audio helpers, and storage contracts.
- `src/state/`
  - Zustand store and default state.
- `src/ui/`
  - React app shell, screens, and game components.
- `tests/`
  - Unit, component, and end-to-end tests.

## Data Flow

1. React components read app state from `useAcademyStore`.
2. Game components emit `MissionResult` objects.
3. The store applies progression rules and appends session/run records.
4. The updated state is saved through the storage adapter.
5. The grown-up dashboard renders derived summaries and exports JSON.

## Persistence Model

The MVP stores a single structured state object locally:

- `profile`
- `missionPlan`
- `progress`
- `sessions`
- `missionRuns`
- `events`

In Electron, this uses `electron-store`. In browser development and tests, it falls back to `localStorage`.

Future scaling path:

- Version persisted records.
- Add schema migration functions.
- Move raw events to append-only files when event volume grows.
- Add signed export packages for clinician review.

## Game Input

All game input should use Pointer Events. This lets Surface touch, Surface Pen, mouse, and trackpad share one event pipeline.

Every mission run records `inputKind` so support and QA can detect device-specific problems.

## Audio And Briefings

The current build uses lightweight Web Audio effects and browser speech synthesis:

- Web Audio handles launch, lock, laser, hit, and warning effects.
- Speech synthesis reads mission briefings after a user taps the speaker button.
- Future produced audio files can replace these helpers without changing game progression logic.

## Game Progression

Progression is intentionally domain-owned:

- `src/domain/progression.ts` owns score-to-star thresholds, ranks, and unlocks.
- Game components only collect metrics and submit mission results.
- This keeps progression testable and prevents reward logic from being scattered through UI code.

## Adding A New World

1. Add the world to `src/domain/worlds.ts`.
2. Add default progress and difficulty caps in `src/state/defaultState.ts`.
3. Build a game component under `src/ui/games/`.
4. Emit a `MissionResult` on completion.
5. Add unit tests for scoring/math.
6. Add a Playwright launch/smoke test.
7. Add dashboard metrics if needed.
