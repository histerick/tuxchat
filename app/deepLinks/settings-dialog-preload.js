'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deepLinksDialog', {
  listSessions: () => ipcRenderer.invoke('deeplinks:list-sessions'),
  getHandler: () => ipcRenderer.invoke('deeplinks:get-handler'),
  setHandler: (desktopId) => ipcRenderer.invoke('deeplinks:set-handler', desktopId),
  clearHandler: () => ipcRenderer.invoke('deeplinks:clear-handler'),
});
