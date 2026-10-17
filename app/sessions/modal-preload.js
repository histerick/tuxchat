"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("modalAPI", {
  list: () => ipcRenderer.invoke("sessions:list-all"),
  create: (data) => ipcRenderer.invoke("sessions:create", data),
  update: (data) => ipcRenderer.invoke("sessions:update", data),
  delete: (desktopId) => ipcRenderer.invoke("sessions:delete", desktopId),
  openDelete: (desktopId) =>
    ipcRenderer.invoke("sessions:open-delete", desktopId),
  resize: (height) => ipcRenderer.send("sessions:modal-resize", height),
  close: () => ipcRenderer.send("sessions:modal-close"),
});
