# Contributing

## Development Workflow

1. Install dependencies with `npm install`.
2. Create a focused branch.
3. Make the change.
4. Add or update tests.
5. Run `npm run verify`.
6. Update docs when behavior changes.

## Code Standards

- TypeScript strict mode stays on.
- Prefer pure domain functions for scoring, timing, randomization, and progression.
- React components should stay focused on rendering and interaction.
- Game components emit mission results instead of mutating progression directly.
- Use Pointer Events for all game input.
- Avoid hard-coding clinical language in the child-facing game UI.

## Pull Request Expectations

Every PR should include:

- What changed.
- How it was tested.
- Screenshots or video for UI/game changes.
- Any data migration notes.
