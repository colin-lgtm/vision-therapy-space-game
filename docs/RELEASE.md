# Release And Installation

## Versioning

Use semantic versioning:

- Patch: bug fixes and content tweaks.
- Minor: new worlds, dashboard features, or export improvements.
- Major: persistence schema changes that require migration or breaking installer behavior.

Update `package.json` before building a release.

## Build A Windows Installer

```powershell
npm install
npm run verify
npm run build:electron
```

Artifacts are written outside the OneDrive-backed workspace by default:

```text
%LOCALAPPDATA%\NateOVisionBuild\release
```

This avoids Windows/OneDrive file-locking failures during Electron Builder's unpack and rename steps.

To override the output directory:

```powershell
$env:NATE_OVISION_RELEASE_DIR = "C:\builds\nate-o-vision\release"
npm run build:electron
```

## Installer Notes

The current Electron Builder configuration creates an NSIS installer:

- User-level install by default.
- Install directory can be changed.
- Output name: `Nate-O-Vision-Space-Academy-${version}.exe`
- Packaged installs check GitHub Releases for updates after launch.

## GitHub Auto-Updates

Auto-update uses the public GitHub Releases feed at `colin-lgtm/vision-therapy-space-game`. Do not embed private GitHub tokens in the app.

For each release:

1. Update `package.json` to the next version.
2. Run `npm run verify`.
3. Run `npm run test:e2e`.
4. Run `npm run build:electron`.
5. Create or update a GitHub Release tag matching the version, for example `v0.1.1`.
6. Upload all update artifacts from `%LOCALAPPDATA%\NateOVisionBuild\release`:
   - `Nate-O-Vision-Space-Academy-${version}.exe`
   - `Nate-O-Vision-Space-Academy-${version}.exe.blockmap`
   - `latest.yml`

Existing installed apps will check that release feed, download newer versions, and prompt for restart once the update is ready.

## Distribution At Scale

For broad deployment across many computers:

1. Add code signing certificates.
2. Add an auto-update channel.
3. Add crash/error reporting with privacy review.
4. Add persistence schema migrations.
5. Add installer smoke tests on clean Windows virtual machines.
6. Create an enterprise deployment package if schools or clinics install centrally.

## Pre-Release Checklist

- `npm run verify` passes.
- `npm run test:e2e` passes.
- Manual Surface QA passes.
- Installer builds.
- Fresh install launches.
- Upgrade install preserves local data.
- Export file opens and contains expected metrics.
- Release notes are updated.
