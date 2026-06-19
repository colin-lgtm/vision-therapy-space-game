import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('auto-update packaging config', () => {
  it('publishes packaged updates to the GitHub release feed', () => {
    const builderConfig = readFileSync(resolve('electron-builder.yml'), 'utf8');
    const mainProcess = readFileSync(resolve('electron/main.cjs'), 'utf8');

    expect(builderConfig).toContain('provider: github');
    expect(builderConfig).toContain('owner: colin-lgtm');
    expect(builderConfig).toContain('repo: vision-therapy-space-game');
    expect(mainProcess).toContain('autoUpdater.checkForUpdates()');
    expect(mainProcess).toContain("ipcMain.handle('updater:check'");
    expect(mainProcess).toContain('setTimeout(() =>');
    expect(mainProcess).not.toContain('window.setTimeout');
  });
});
