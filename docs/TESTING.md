# Testing Strategy

## Goals

The test suite protects three things:

- Game mechanics remain stable as new worlds are added.
- Progression and local data do not corrupt.
- The app remains usable on desktop and Surface-like touch viewports.

## Test Layers

### Unit Tests

Location: `tests/domain/`

Current coverage:

- Orbit path math and level configuration.
- Score, stars, ranks, and level progression.

Run:

```powershell
npm run test
```

### Component Tests

Location: `tests/ui/`

Current coverage:

- App hydrates and renders the star map.
- Dashboard navigation works.
- Orbit Tracker can be launched.

Run:

```powershell
npm run test
```

### End-to-End Tests

Location: `tests/e2e/`

Current coverage:

- Star map launch flow.
- Dashboard availability.
- Desktop and Surface-touch viewports.

Run:

```powershell
npm run test:e2e
```

## Full Gate

Before any release:

```powershell
npm run verify
```

This runs formatting, linting, type checks, unit/component tests, and production build.

## Manual QA Checklist

Run this on the target Surface before giving the app to a child:

- App opens cleanly in full-screen or large-window mode.
- Star map fits the Surface screen without overlapping text.
- Orbit Tracker animation is smooth.
- Orbit Tracker shows meteors, alien ships, enemy shots, shield feedback, hull damage, and lock-on effects.
- Orbit Tracker only fires when the player taps or clicks while locked onto the beam.
- Letting enough meteors or alien shots hit the orbit destroys it and shows the restart choice.
- Touch drag keeps the beam attached to the finger.
- Surface Pen drag works and records as pen input.
- Mouse drag works and records as mouse input.
- Mission-card speaker buttons play or speak a briefing after a user tap.
- Mission-card speech uses the most natural installed English voice available on the device.
- Locked mission cards clearly show the star requirement.
- `Unlock Cards` in Test Lab unlocks the roadmap cards for inspection.
- Pause/resume does not count against active mission time incorrectly.
- End button returns to a mission summary.
- Dashboard shows the completed mission.
- JSON export downloads and contains the latest mission run.

## Regression Policy

Add a test whenever a bug is fixed. The test should fail before the fix and pass after the fix.

For each new game world, minimum test expectations:

- Pure math/scoring unit test.
- Component smoke test.
- Playwright launch flow.
- Manual Surface input check.
