/*
 This file is responsible for intermediaanting the communication between the main process and the renderer process
 It is used to expose the ipcRenderer object to the renderer process
*/

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  // data set
  saveDataset: (data) => ipcRenderer.send('save-dataset', data),
  loadDataset: () => ipcRenderer.invoke('load-dataset')
});
