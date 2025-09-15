/*
 This file is responsible for intermedianting the communication 
 between the main process and the renderer process.
 It is used to expose the ipcRenderer object to the renderer process
*/

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose protected methods that to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {

  getPath: (relative) => ipcRenderer.invoke('get-path', relative),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  exportFile: (fileName) => ipcRenderer.invoke('export-file', fileName),

  // path methodss
  getPath: (name) => path.join(__dirname, name),

  // fs methods
  readText: async (path) => fs.promises.readFile(path, 'utf8'),

  readFile: (path) => fs.readFileSync(path, 'utf8'),  // síncrono
  readFileAsync: (path) => fs.promises.readFile(path, 'utf8'), // assíncrono

  // select file 
  selectFile: () => ipcRenderer.invoke('select-file'),

  // navigate 
  navigate: (page) => ipcRenderer.send('navigate', page),

  //theme
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  // diallgs messages
  showDialog: (message) => ipcRenderer.invoke('show-dialog', message),

  // data set
  saveDataset: (data) => ipcRenderer.send('save-dataset', data),
  loadDataset: () => ipcRenderer.invoke('load-dataset')
});

// Expose Python API
const api = {
  run: (scriptPath, args=[]) => ipcRenderer.invoke('python:run', scriptPath, args),
  detect: (params) => ipcRenderer.invoke('python:detect', params),
  onLog: (cb) => ipcRenderer.on('python:log', (event, data) => cb?.(data)),

};

contextBridge.exposeInMainWorld('pythonAPI', api); 
