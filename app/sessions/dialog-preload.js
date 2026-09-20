'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionDialog', {
  getStatus: () => ipcRenderer.invoke('sessions:status'),
  create: (name) => ipcRenderer.invoke('sessions:create', name),
});
