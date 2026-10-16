'use strict';

const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { currentLocale } = require('../i18n');
const { setSessionIcon } = require('../sessions');
const { tintIcon } = require('./tint');

// A fixed palette rather than a free color picker: these stay distinct
// from each other at a glance and readable over WhatsApp Web's own
// header in both its light and dark themes. Validated against on set, so
// nothing else ever gets interpolated into the injected CSS below.
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

// The native title bar is drawn by the window manager (GNOME/Mutter) and
// apps can't color it, so the color goes on a strip overlaid on the top
// edge of the page instead. pointer-events: none keeps whatever
// WhatsApp draws underneath clickable.
function stripCss(color) {
  return `html::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: ${color};
    z-index: 2147483647;
    pointer-events: none;
  }`;
}

let mainWindow = null;
let tray = null;
let config = null;
let insertedKey = null;

async function applyColor(color) {
  const contents = mainWindow.webContents;
  if (insertedKey) {
    const key = insertedKey;
    insertedKey = null;
    await contents.removeInsertedCSS(key).catch(() => {});
  }
  if (color) insertedKey = await contents.insertCSS(stripCss(color));
}

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
  // insertCSS only lasts for the current document, so it has to be
  // re-applied after every load (WhatsApp's own reloads, deep links,
  // View > Reload).
  win.webContents.on('dom-ready', () => {
    insertedKey = null;
    applyColor(readColor()).catch(() => {});
  });
}

ipcMain.handle('session-color:get', () => ({ color: readColor(), palette: PALETTE }));
ipcMain.handle('session-color:set', async (_event, color) => {
  const value = PALETTE.includes(color) ? color : null;
  writeColor(value);
  if (mainWindow) {
    applyIcon(value);
    await applyColor(value);
  }
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

module.exports = { registerSessionColor, openSessionColorDialog };
