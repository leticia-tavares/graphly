/*
 This file is responsible for intermedianting the communication 
 between the main process and the renderer process.
 It is used to expose the ipcRenderer object to the renderer process
*/

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  showDialog: (message) => ipcRenderer.invoke('show-dialog', message),
  // data set
  saveDataset: (data) => ipcRenderer.send('save-dataset', data),
  loadDataset: () => ipcRenderer.invoke('load-dataset')
});
