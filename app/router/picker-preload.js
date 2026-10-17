"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("linkPicker", {
  onInit: (callback) =>
    ipcRenderer.on("picker:init", (_event, sessions, options) =>
      callback(sessions, options),
    ),
  choose: (desktopId, remember, message, autoSend) =>
    ipcRenderer.invoke("picker:choose", {
      desktopId,
      remember,
      message,
      autoSend,
    }),
  toggleHide: (desktopId, hide) =>
    ipcRenderer.invoke("picker:toggle-hide", { desktopId, hide }),
  cancel: () => ipcRenderer.send("picker:cancel"),
});
