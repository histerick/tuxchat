'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deleteSessionDialog', {
  listDeletable: () => ipcRenderer.invoke('sessions:list-deletable'),
  remove: (desktopId) => ipcRenderer.invoke('sessions:delete', desktopId),
});
