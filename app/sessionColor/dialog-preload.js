"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sessionColorDialog", {
  get: (desktopId) => ipcRenderer.invoke("session-color:get", desktopId),
  set: (payload) => ipcRenderer.invoke("session-color:set", payload),
  close: () => ipcRenderer.send("session-color:close"),
});
