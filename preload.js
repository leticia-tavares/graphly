// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme)
});
