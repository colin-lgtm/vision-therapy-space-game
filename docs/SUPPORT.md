# Support Runbook

## Common Tasks

### Reset Local Data

Use the `Reset Local Data` button in the grown-up dashboard.

This clears local progress on the current computer only.

### Export Progress

Use the `Export JSON` button in the grown-up dashboard.

The export includes:

- profile summary
- world progress
- sessions
- mission runs
- mission metrics

### Check Input Type

The dashboard shows the latest recorded input type:

- touch
- pen
- mouse
- unknown

If Surface Pen is not detected as pen, check Windows pen settings and browser/Electron pointer event support.

### Unlock Mission Cards For Testing

Use `Unlock Cards` on the star map or `Unlock Cards For Testing` in the grown-up dashboard.

This reveals the roadmap cards so adults can inspect the visuals and audio briefings. It does not make unfinished worlds playable.

## Troubleshooting

### App Opens To A Blank Screen

1. Restart the app.
2. Reset local data from the dashboard if reachable.
3. Reinstall the app.
4. If developing, run `npm run verify`.

### Orbit Tracker Feels Laggy

1. Close other heavy apps.
2. Keep the app window at normal Surface resolution.
3. Check whether Windows battery saver is enabled.
4. In development, use production build for performance testing.

### Export Does Not Download

1. Try again from the dashboard.
2. Confirm Windows did not block downloads.
3. Check browser/Electron console logs in development.

## Support Data To Collect

When investigating an issue, collect:

- app version
- Windows version
- device model
- input type used
- screenshot or video if visual
- exported JSON if progress data is relevant
- steps to reproduce

Do not collect unnecessary personal information.
