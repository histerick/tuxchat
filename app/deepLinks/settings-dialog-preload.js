"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deepLinksDialog", {
  listSessions: () => ipcRenderer.invoke("deeplinks:list-sessions"),
  getHandler: () => ipcRenderer.invoke("deeplinks:get-handler"),
  setHandler: (desktopId) =>
    ipcRenderer.invoke("deeplinks:set-handler", desktopId),
  clearHandler: () => ipcRenderer.invoke("deeplinks:clear-handler"),
  toggleHide: (desktopId, hide) =>
    ipcRenderer.invoke("deeplinks:toggle-hide", { desktopId, hide }),
  close: () => ipcRenderer.send("deeplinks:close"),
});
