'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('titlebar', {
  get: () => ipcRenderer.invoke('titlebar:get'),
  onState: (callback) => ipcRenderer.on('titlebar:state', (_event, data) => callback(data)),
  openMenu: (id, x, y) => ipcRenderer.send('titlebar:menu', id, x, y),
});
