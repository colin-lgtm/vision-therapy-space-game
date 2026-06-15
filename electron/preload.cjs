const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nateAcademy', {
  load: () => ipcRenderer.invoke('academy:load'),
  save: (value) => ipcRenderer.invoke('academy:save', value),
  clear: () => ipcRenderer.invoke('academy:clear'),
});
