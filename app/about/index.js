"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

let aboutWin = null;

ipcMain.on("about:close", () => {
  if (aboutWin && !aboutWin.isDestroyed()) {
    aboutWin.close();
    aboutWin = null;
  }
});

ipcMain.handle("about:get-info", () => {
  return {
    name: "TuxChat",
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    homepage: "https://github.com/histerick/tuxchat",
  };
});

ipcMain.on("about:open-link", (_event, url) => {
  if (url && (url.startsWith("https://") || url.startsWith("http://"))) {
    shell.openExternal(url);
  }
});

function openAboutModal(parentWin) {
  if (aboutWin && !aboutWin.isDestroyed()) {
    aboutWin.focus();
    return aboutWin;
  }

  const parent =
    parentWin ||
    BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w.isVisible(),
    );
  if (!parent) return null;

  const {
    width: pWidth,
    height: pHeight,
    x: pX,
    y: pY,
  } = parent.getContentBounds();
  const mWidth = 430;
  const mHeight = 360;
  const mX = Math.round(pX + (pWidth - mWidth) / 2);
  const mY = Math.round(pY + (pHeight - mHeight) / 2);

  aboutWin = new BrowserWindow({
    width: mWidth,
    height: mHeight,
    x: mX,
    y: mY,
    parent,
    modal: true,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    show: false,
    backgroundColor: "#202c33",
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "modal-preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  const { currentLocale } = require("../i18n");
  aboutWin.loadFile(path.join(__dirname, "modal.html"), {
    query: { locale: currentLocale() },
  });

  aboutWin.once("ready-to-show", () => {
    if (aboutWin && !aboutWin.isDestroyed()) {
      aboutWin.show();
      aboutWin.focus();
    }
  });

  aboutWin.on("closed", () => {
    aboutWin = null;
    if (parent && !parent.isDestroyed()) {
      parent.focus();
    }
  });

  return aboutWin;
}

module.exports = { openAboutModal };
