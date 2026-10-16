'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionColorDialog', {
  get: () => ipcRenderer.invoke('session-color:get'),
  set: (color) => ipcRenderer.invoke('session-color:set', color),
});
