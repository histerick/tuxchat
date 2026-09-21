'use strict';

const { BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { listAllSessions } = require('../sessions');
const { getRememberedHandler, setRememberedHandler, clearRememberedHandler } = require('./state');
const { ensureRouterRegistered } = require('./router-install');
const { extractDeepLinkArg, translateToWebUrl } = require('./translate');
const { currentLocale } = require('../i18n');

ipcMain.handle('deeplinks:list-sessions', () => listAllSessions());
ipcMain.handle('deeplinks:get-handler', () => getRememberedHandler());
ipcMain.handle('deeplinks:set-handler', (_event, desktopId) => {
  setRememberedHandler(desktopId);
  return { ok: true };
});
ipcMain.handle('deeplinks:clear-handler', () => {
  clearRememberedHandler();
  return { ok: true };
});

function openSettingsDialog() {
  const win = new BrowserWindow({
    width: 380,
    height: 380,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'settings-dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'settings-dialog.html'), { query: { locale: currentLocale() } });
  return win;
}

module.exports = {
  openSettingsDialog,
  ensureRouterRegistered,
  extractDeepLinkArg,
  translateToWebUrl,
};
