"use strict";

const { BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("node:path");
const { currentLocale } = require("../i18n");
const { setSessionIcon } = require("../sessions");
const { tintIcon } = require("./tint");
const titlebar = require("../mainWindow/titlebar");

// A fixed palette rather than a free color picker: these stay distinct
// from each other at a glance, and the title bar's dark/light shades of
// each were checked for text contrast (see mainWindow/titlebar.js).
// Anything else sent over IPC is rejected on set.
const PALETTE = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#00acc1",
  "#1e88e5",
  "#8e24aa",
  "#d81b60",
];

let mainWindow = null;
let tray = null;
let config = null;

// Window icon (Alt-Tab), tray icon and, for extra sessions, the dock
// icon all take the session color, so the account is recognizable even
// before the window is open.
function applyIcon(color, { updateDock = true } = {}) {
  if (!config || !config.appIcon) return;
  const image = color
    ? tintIcon(config.appIcon, color)
    : nativeImage.createFromPath(config.appIcon);
  if (image.isEmpty()) return;
  if (mainWindow) mainWindow.setIcon(image);
  if (tray) tray.setImage(image);
  // The .desktop/PNG pair persists on disk, so startup only needs the
  // in-process icons above.
  if (!updateDock) return;
  try {
    setSessionIcon(
      config.wmClass,
      color && color.slice(1),
      color ? image.toPNG() : null,
    );
  } catch (err) {
    console.error("No se pudo actualizar el icono de la sesión:", err);
  }
}

function registerSessionColor(win, trayIcon, appConfig) {
  mainWindow = win;
  tray = trayIcon;
  config = appConfig;
  try {
    const { getSessionColor } = require("../sessions");
    const color = getSessionColor("tuxchat");
    if (color) applyIcon(color, { updateDock: false });
  } catch {
    // Failed to read session color
  }
}

// Called before the main window exists, so the title bar is created in
// the session color instead of flashing the neutral one first.
function initSessionColor() {
  try {
    const { getSessionColor } = require("../sessions");
    titlebar.setColor(getSessionColor("tuxchat"));
  } catch {
    //
  }
}

function normalizeHexColor(color) {
  if (typeof color !== "string") return null;
  const clean = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return null;
}

ipcMain.handle("session-color:get", (_event, targetDesktopId) => {
  const { getSessionColor, getActiveSessionId } = require("../sessions");
  const desktopId = targetDesktopId || getActiveSessionId() || "tuxchat";
  return { desktopId, color: getSessionColor(desktopId), palette: PALETTE };
});

ipcMain.handle("session-color:set", (_event, payload) => {
  const { setSessionColor, getActiveSessionId } = require("../sessions");
  let desktopId;
  let color;
  if (typeof payload === "object" && payload !== null) {
    desktopId = payload.desktopId || getActiveSessionId() || "tuxchat";
    color = payload.color;
  } else {
    desktopId = getActiveSessionId() || "tuxchat";
    color = payload;
  }
  const value = normalizeHexColor(color);
  setSessionColor(desktopId, value);
  if (desktopId === "tuxchat" && mainWindow) {
    applyIcon(value);
  }
  return { ok: true, desktopId, color: value };
});

let colorWin = null;

ipcMain.on("session-color:close", () => {
  if (colorWin && !colorWin.isDestroyed()) {
    colorWin.close();
    colorWin = null;
  }
});

function openSessionColorDialog(targetDesktopId) {
  if (colorWin && !colorWin.isDestroyed()) {
    colorWin.focus();
    return colorWin;
  }

  const { getActiveSessionId } = require("../sessions");
  const desktopId = targetDesktopId || getActiveSessionId() || "tuxchat";
  const parent =
    mainWindow ||
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
  const mWidth = 440;
  const mHeight = 350;
  const mX = Math.round(pX + (pWidth - mWidth) / 2);
  const mY = Math.round(pY + (pHeight - mHeight) / 2);

  colorWin = new BrowserWindow({
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
      preload: path.join(__dirname, "dialog-preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  colorWin.loadFile(path.join(__dirname, "dialog.html"), {
    query: { locale: currentLocale(), desktopId },
  });

  colorWin.once("ready-to-show", () => {
    if (colorWin && !colorWin.isDestroyed()) {
      colorWin.show();
      colorWin.focus();
    }
  });

  colorWin.on("closed", () => {
    colorWin = null;
    if (parent && !parent.isDestroyed()) {
      parent.focus();
    }
  });

  return colorWin;
}

module.exports = {
  initSessionColor,
  registerSessionColor,
  openSessionColorDialog,
};
