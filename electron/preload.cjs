const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nateAcademy', {
  load: () => ipcRenderer.invoke('academy:load'),
  save: (value) => ipcRenderer.invoke('academy:save', value),
  clear: () => ipcRenderer.invoke('academy:clear'),
  updates: {
    info: () => ipcRenderer.invoke('updater:info'),
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
});
