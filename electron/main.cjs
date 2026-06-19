const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let store = null;

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

function setupAutoUpdates() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', async () => {
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
    console.warn('Auto-update check failed:', error);
  });

  window.setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
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
