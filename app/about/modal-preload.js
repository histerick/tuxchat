"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aboutAPI", {
  getInfo: () => ipcRenderer.invoke("about:get-info"),
  openLink: (url) => ipcRenderer.send("about:open-link", url),
  close: () => ipcRenderer.send("about:close"),
});
