"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("titlebar", {
  get: () => ipcRenderer.invoke("titlebar:get"),
  onState: (callback) =>
    ipcRenderer.on("titlebar:state", (_event, data) => callback(data)),
  openMenu: (id, x, y) => ipcRenderer.send("titlebar:menu", id, x, y),
});

contextBridge.exposeInMainWorld("sessionsSidebar", {
  list: () => ipcRenderer.invoke("sessions:list-all"),
  current: () => ipcRenderer.invoke("sessions:current"),
  switch: (desktopId) => ipcRenderer.invoke("sessions:switch", desktopId),
  reorder: (orderedIds) => ipcRenderer.invoke("sessions:reorder", orderedIds),
  openAdd: () => ipcRenderer.invoke("sessions:open-add"),
  openEdit: (desktopId) => ipcRenderer.invoke("sessions:open-edit", desktopId),
  openDelete: (desktopId) =>
    ipcRenderer.invoke("sessions:open-delete", desktopId),
  showContextMenu: (desktopId) =>
    ipcRenderer.send("sessions:context-menu", desktopId),
  onChanged: (callback) => ipcRenderer.on("sessions:changed", () => callback()),
  onActiveChanged: (callback) =>
    ipcRenderer.on("sessions:active-changed", (_event, id) => callback(id)),
  onFullscreen: (callback) =>
    ipcRenderer.on("window:fullscreen", (_event, isFullscreen) =>
      callback(isFullscreen),
    ),
});
