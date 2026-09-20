'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenPicker', {
  onSources: (callback) => ipcRenderer.on('screen-picker:sources', (_event, sources) => callback(sources)),
  select: (sourceId) => ipcRenderer.send('screen-picker:selected', sourceId),
});
