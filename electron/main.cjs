const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let store = null;
let updateStatus = {
  state: 'idle',
  message: 'Updates ready',
  version: app.getVersion(),
};

async function loadStore() {
  const { default: Store } = await import('electron-store');
  store = new Store({
    name: 'nate-o-vision-space-academy',
    defaults: {
      academyState: null,
    },
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#07111f',
    title: 'Nate-O-Vision Space Academy',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function publishUpdateStatus(nextStatus) {
  updateStatus = {
    ...updateStatus,
    ...nextStatus,
    version: app.getVersion(),
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', updateStatus);
  }
}

async function checkForUpdates(source = 'manual') {
  if (!app.isPackaged) {
    const status = {
      state: 'unavailable',
      message: 'Updates work in the installed app.',
      source,
    };
    publishUpdateStatus(status);
    return status;
  }

  publishUpdateStatus({
    state: 'checking',
    message: source === 'manual' ? 'Checking for updates...' : 'Checking in background...',
    source,
  });

  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      ...updateStatus,
      updateInfo: result?.updateInfo ?? null,
    };
  } catch (error) {
    const status = {
      state: 'error',
      message: 'Update check failed.',
      detail: error instanceof Error ? error.message : String(error),
      source,
    };
    publishUpdateStatus(status);
    return status;
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    publishUpdateStatus({
      state: 'checking',
      message: 'Checking for updates...',
    });
  });

  autoUpdater.on('update-available', (info) => {
    publishUpdateStatus({
      state: 'available',
      message: `Update ${info.version} found. Downloading...`,
      availableVersion: info.version,
    });
  });

  autoUpdater.on('update-not-available', () => {
    publishUpdateStatus({
      state: 'current',
      message: 'You are on the latest version.',
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    publishUpdateStatus({
      state: 'downloading',
      message: `Downloading update: ${Math.round(progress.percent)}%`,
      progress: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', async () => {
    publishUpdateStatus({
      state: 'ready',
      message: 'Update ready. Restart to install.',
    });

    const response = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'A new Nate-O-Vision update is ready.',
      detail: 'Restart the app now to install the update.',
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on('error', (error) => {
    publishUpdateStatus({
      state: 'error',
      message: 'Update check failed.',
      detail: error instanceof Error ? error.message : String(error),
    });
    console.warn('Auto-update check failed:', error);
  });

  setTimeout(() => {
    checkForUpdates('startup').catch((error) => {
      publishUpdateStatus({
        state: 'error',
        message: 'Update check failed.',
        detail: error instanceof Error ? error.message : String(error),
      });
      console.warn('Auto-update check failed:', error);
    });
  }, 4000);
}

app.whenReady().then(async () => {
  await loadStore();

  ipcMain.handle('academy:load', () => store.get('academyState'));
  ipcMain.handle('academy:save', (_event, value) => {
    store.set('academyState', value);
    return true;
  });
  ipcMain.handle('academy:clear', () => {
    store.set('academyState', null);
    return true;
  });
  ipcMain.handle('updater:info', () => updateStatus);
  ipcMain.handle('updater:check', () => checkForUpdates('manual'));
  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged || updateStatus.state !== 'ready') return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  });

  createWindow();
  setupAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
