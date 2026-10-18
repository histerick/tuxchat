'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aboutDialog', {
  info: () => ipcRenderer.invoke('about:info'),
  copyInfo: () => ipcRenderer.invoke('about:copy-info'),
  open: (name) => ipcRenderer.invoke('about:open', name),
  checkForUpdates: () => ipcRenderer.invoke('about:check-updates'),
});
