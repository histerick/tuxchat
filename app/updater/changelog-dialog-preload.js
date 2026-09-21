'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('changelogDialog', {
  onNotes: (callback) => ipcRenderer.on('updater:notes', (_event, payload) => callback(payload)),
});
