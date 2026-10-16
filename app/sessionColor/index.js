'use strict';

const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { currentLocale } = require('../i18n');
const { setSessionIcon } = require('../sessions');
const { tintIcon } = require('./tint');
const titlebar = require('../mainWindow/titlebar');

// A fixed palette rather than a free color picker: these stay distinct
// from each other at a glance, and the title bar's dark/light shades of
// each were checked for text contrast (see mainWindow/titlebar.js).
// Anything else sent over IPC is rejected on set.
const PALETTE = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#8e24aa', '#d81b60'];

// Per profile, not shared like deep-links.json: each session picks its
// own color, and keeping it under its own --user-data-dir means deleting
// the session (which wipes that dir) takes the color with it.
function prefsFile() {
  return path.join(app.getPath('userData'), 'tuxchat-session.json');
}

function readColor() {
  try {
    const { color } = JSON.parse(fs.readFileSync(prefsFile(), 'utf8'));
    return PALETTE.includes(color) ? color : null;
  } catch {
    return null;
  }
}

function writeColor(color) {
  fs.writeFileSync(prefsFile(), JSON.stringify({ color }));
}

let mainWindow = null;
let tray = null;
let config = null;

// Window icon (Alt-Tab), tray icon and, for extra sessions, the dock
// icon all take the session color, so the account is recognizable even
// before the window is open.
function applyIcon(color, { updateDock = true } = {}) {
  const image = color ? tintIcon(config.appIcon, color) : nativeImage.createFromPath(config.appIcon);
  if (image.isEmpty()) return;
  mainWindow.setIcon(image);
  tray.setImage(image);
  // The .desktop/PNG pair persists on disk, so startup only needs the
  // in-process icons above.
  if (!updateDock) return;
  try {
    setSessionIcon(config.wmClass, color && color.slice(1), color ? image.toPNG() : null);
  } catch (err) {
    console.error('No se pudo actualizar el icono de la sesión:', err);
  }
}

function registerSessionColor(win, trayIcon, appConfig) {
  mainWindow = win;
  tray = trayIcon;
  config = appConfig;
  const color = readColor();
  if (color) applyIcon(color, { updateDock: false });
}

// Called before the main window exists, so the title bar is created in
// the session color instead of flashing the neutral one first.
function initSessionColor() {
  titlebar.setColor(readColor());
}

ipcMain.handle('session-color:get', () => ({ color: readColor(), palette: PALETTE }));
ipcMain.handle('session-color:set', (_event, color) => {
  const value = PALETTE.includes(color) ? color : null;
  writeColor(value);
  titlebar.setColor(value);
  if (mainWindow) applyIcon(value);
  return { ok: true, color: value };
});

function openSessionColorDialog() {
  const win = new BrowserWindow({
    width: 400,
    height: 260,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'dialog.html'), { query: { locale: currentLocale() } });
  return win;
}

module.exports = { initSessionColor, registerSessionColor, openSessionColorDialog };
