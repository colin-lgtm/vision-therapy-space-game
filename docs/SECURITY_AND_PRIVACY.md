# Security And Privacy

## Current Privacy Posture

The MVP is local-first:

- No cloud account.
- No network API.
- No analytics SDK.
- No remote telemetry.
- Progress is stored on the local machine.

## Data Stored

The app stores:

- player nickname
- stars, ranks, and unlocks
- mission sessions
- mission metrics
- input type

Do not store unnecessary medical details in the app.

## Export Files

Progress exports are user-initiated JSON files. Treat exports as private records because they may reveal health-related practice history.

## Future Work Before Broad Distribution

- Add encryption or OS-protected storage for sensitive settings.
- Add signed installers.
- Add automated dependency scanning.
- Add privacy review before any telemetry, sync, or cloud backup.
- Add a public vulnerability reporting process if distributed outside private use.
