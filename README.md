# Nate-O-Vision Space Academy

Nate-O-Vision Space Academy is a game-first desktop app for Windows/Surface that turns vision-skill practice into short space missions. The first playable world, Orbit Tracker, uses a high-performance Canvas loop and works with touch, Surface Pen, mouse, and trackpad through Pointer Events.

The app is designed as a private family tool. It is not a diagnostic product, a dyslexia treatment, or a replacement for professional eye care.

## Current Status

- Electron + React + TypeScript + Vite app shell
- Surface-friendly star map game UI
- Animated mission-card artwork with audio briefings for each game
- Local persistence through Electron storage with browser fallback for development
- Orbit Tracker world with touch/pen/mouse beam-lock gameplay, shield energy, meteors, and lock-on effects
- Level progression, stars, rank, cosmetics, unlocks, and mission summaries
- Grown-up dashboard with progress metrics and JSON export
- Test Lab unlock control for inspecting mission cards without grinding progression
- Unit, component, and Playwright end-to-end test coverage
- Windows installer configuration through Electron Builder

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Windows 10/11 for the target installed app

## Quick Start

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173`.

To run the Electron desktop shell during development:

```powershell
npm run dev:electron
```

## Verification

Run the full quality gate:

```powershell
npm run verify
```

Individual checks:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Build Installer

```powershell
npm run build:electron
```

Installer artifacts are written outside the OneDrive-backed workspace by default:

```text
%LOCALAPPDATA%\NateOVisionBuild\release
```

Override this with `NATE_OVISION_RELEASE_DIR` when building in CI or a dedicated release workspace.

## Project Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Testing Strategy](docs/TESTING.md)
- [Release and Installation](docs/RELEASE.md)
- [Support Runbook](docs/SUPPORT.md)
- [Product Plan](VISION_THERAPY_SOFTWARE_PLAN.md)

## Development Principles

- Game first: the child experience should feel like a polished casual game.
- Therapy alignment under the hood: mechanics and metrics map to the clinical report without making the game feel clinical.
- Local first: no cloud dependency in the MVP.
- Surface ready: every game must work with touch, pen, and mouse.
- Supportable at scale: automated tests, typed domain logic, documented release steps, and exportable data.
