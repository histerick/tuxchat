'use strict';

const { app, BrowserWindow, clipboard, ipcMain, shell } = require('electron');
const path = require('node:path');
const { currentLocale } = require('../i18n');
const { canCheckForUpdates, checkForUpdatesNow } = require('../updater');

const REPO_URL = 'https://github.com/histerick/tuxchat';

// The dialog asks for these by name, never by URL: whatever reaches the
// main process from a renderer is treated as untrusted, so it can't make
// shell.openExternal() open anything outside this fixed list.
const LINKS = {
  repo: REPO_URL,
  issues: `${REPO_URL}/issues`,
  releases: `${REPO_URL}/releases`,
  license: `${REPO_URL}/blob/master/LICENSE`,
  website: 'https://ericksalamanca.com',
  pedruhb: 'https://github.com/pedruhb',
};

// XDG_SESSION_TYPE is what the desktop reports; the ozone platform is
// what this process actually renders with. They differ on NVIDIA under
// Wayland, where app/index.js forces XWayland — worth knowing in a bug
// report.
function displayServer() {
  const session = process.env.XDG_SESSION_TYPE || 'unknown';
  const ozone = app.commandLine.getSwitchValue('ozone-platform');
  const forcedX11 = ozone === 'x11' || process.argv.includes('--ozone-platform=x11');
  return forcedX11 && session === 'wayland' ? 'wayland (XWayland)' : session;
}

function technicalInfo() {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: `${process.platform} ${process.arch}`,
    displayServer: displayServer(),
  };
}

// Plain text in English regardless of the UI language: it's meant to be
// pasted into a GitHub issue.
function technicalInfoText() {
  const info = technicalInfo();
  return [
    `TuxChat ${info.version}`,
    `Electron ${info.electron}`,
    `Chrome ${info.chrome}`,
    `Node ${info.node}`,
    `Platform: ${info.platform}`,
    `Display server: ${info.displayServer}`,
  ].join('\n');
}

ipcMain.handle('about:info', () => ({ ...technicalInfo(), canCheckForUpdates: canCheckForUpdates() }));
ipcMain.handle('about:copy-info', () => {
  clipboard.writeText(technicalInfoText());
  return { ok: true };
});
ipcMain.handle('about:open', (_event, name) => {
  if (!Object.hasOwn(LINKS, name)) return { ok: false };
  shell.openExternal(LINKS[name]).catch((err) => {
    console.error('No se pudo abrir el enlace en el navegador:', err);
  });
  return { ok: true };
});
// The .deb (apt owns it), dev runs and extra sessions have no updater
// running (see updater/), so for them checking means the Releases page.
ipcMain.handle('about:check-updates', async () => {
  if (!canCheckForUpdates()) {
    shell.openExternal(LINKS.releases).catch((err) => {
      console.error('No se pudo abrir el enlace en el navegador:', err);
    });
    return { status: 'releases' };
  }
  return checkForUpdatesNow();
});

let aboutWindow = null;

function openAboutDialog(parent) {
  // One About at a time: a second click just brings the open one back.
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return aboutWindow;
  }

  aboutWindow = new BrowserWindow({
    parent,
    modal: true,
    width: 440,
    height: 720,
    useContentSize: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  aboutWindow.setMenuBarVisibility(false);
  aboutWindow.loadFile(path.join(__dirname, 'dialog.html'), { query: { locale: currentLocale() } });
  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
  return aboutWindow;
}

module.exports = { openAboutDialog };
