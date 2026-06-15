const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');

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
