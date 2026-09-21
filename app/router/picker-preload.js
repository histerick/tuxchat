'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('linkPicker', {
  onInit: (callback) => ipcRenderer.on('picker:init', (_event, sessions) => callback(sessions)),
  choose: (desktopId, remember) => ipcRenderer.invoke('picker:choose', { desktopId, remember }),
});
