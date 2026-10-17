"use strict";

const { BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { listAllSessions } = require("../sessions");
const {
  getRememberedHandler,
  setRememberedHandler,
  clearRememberedHandler,
} = require("./state");
const { ensureRouterRegistered } = require("./router-install");
const {
  extractDeepLinkArg,
  translateToWebUrl,
  parseDeepLink,
} = require("./translate");
const { currentLocale } = require("../i18n");

ipcMain.handle("deeplinks:list-sessions", () => listAllSessions());
ipcMain.handle("deeplinks:get-handler", () => getRememberedHandler());
ipcMain.handle("deeplinks:set-handler", (_event, desktopId) => {
  setRememberedHandler(desktopId);
  return { ok: true };
});
ipcMain.handle("deeplinks:clear-handler", () => {
  clearRememberedHandler();
  return { ok: true };
});
ipcMain.handle("deeplinks:toggle-hide", (_event, { desktopId, hide }) => {
  const { setSessionHideInLinkPicker } = require("../sessions");
  setSessionHideInLinkPicker(desktopId, hide);
  return { ok: true };
});

let settingsWin = null;

ipcMain.on("deeplinks:close", () => {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.close();
    settingsWin = null;
  }
});

function openSettingsDialog() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return settingsWin;
  }

  const parent = BrowserWindow.getAllWindows().find(
    (w) => !w.isDestroyed() && w.isVisible(),
  );
  if (!parent) return null;

  const {
    width: pWidth,
    height: pHeight,
    x: pX,
    y: pY,
  } = parent.getContentBounds();
  const mWidth = 440;
  const mHeight = 425;
  const mX = Math.round(pX + (pWidth - mWidth) / 2);
  const mY = Math.round(pY + (pHeight - mHeight) / 2);

  settingsWin = new BrowserWindow({
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
      preload: path.join(__dirname, "settings-dialog-preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  settingsWin.loadFile(path.join(__dirname, "settings-dialog.html"), {
    query: { locale: currentLocale() },
  });

  settingsWin.once("ready-to-show", () => {
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.show();
      settingsWin.focus();
    }
  });

  settingsWin.on("closed", () => {
    settingsWin = null;
    if (parent && !parent.isDestroyed()) {
      parent.focus();
    }
  });

  return settingsWin;
}

module.exports = {
  openSettingsDialog,
  ensureRouterRegistered,
  extractDeepLinkArg,
  translateToWebUrl,
  parseDeepLink,
};
