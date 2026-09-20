'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('renameSessionDialog', {
  getCurrent: () => ipcRenderer.invoke('sessions:current'),
  rename: (newName) => ipcRenderer.invoke('sessions:rename', newName),
});
