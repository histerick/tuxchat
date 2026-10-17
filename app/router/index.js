"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { extractDeepLinkArg, parseDeepLink } = require("../deepLinks/translate");
const {
  getRememberedHandler,
  setRememberedHandler,
} = require("../deepLinks/state");
const {
  listAllSessions,
  getActiveSessionId,
  setSessionHideInLinkPicker,
} = require("../sessions");
const { currentLocale } = require("../i18n");

let currentPickerWin = null;
let currentOnChosen = null;
let currentUrl = null;
let isStandalone = false;
let ipcRegistered = false;

function ensureIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle(
    "picker:choose",
    (_event, { desktopId, remember, message, autoSend }) => {
      if (remember) {
        setRememberedHandler(desktopId);
      }
      const { recordSessionLinkUsage } = require("../sessions");
      recordSessionLinkUsage(desktopId);

      const cb = currentOnChosen;
      const url = currentUrl;
      if (currentPickerWin && !currentPickerWin.isDestroyed()) {
        currentPickerWin.close();
      }
      if (typeof cb === "function") {
        cb(desktopId, url, { message, autoSend });
      }
      return { ok: true };
    },
  );

  ipcMain.handle("picker:toggle-hide", (_event, { desktopId, hide }) => {
    setSessionHideInLinkPicker(desktopId, hide);
    return { ok: true };
  });

  ipcMain.on("picker:cancel", () => {
    if (currentPickerWin && !currentPickerWin.isDestroyed()) {
      currentPickerWin.close();
    }
  });
}

function openPickerModal(parentWin, whatsappUrl, onChosen) {
  if (currentPickerWin && !currentPickerWin.isDestroyed()) {
    currentOnChosen = onChosen;
    currentUrl = whatsappUrl;
    currentPickerWin.focus();
    return currentPickerWin;
  }

  ensureIpcHandlers();
  currentOnChosen = onChosen;
  currentUrl = whatsappUrl;

  const parent =
    parentWin ||
    BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w.isVisible(),
    );

  const sessions = listAllSessions();
  const remembered = getRememberedHandler();

  let defaultSelected = null;
  if (remembered && sessions.some((s) => s.desktopId === remembered)) {
    defaultSelected = remembered;
  } else if (typeof getActiveSessionId === "function") {
    defaultSelected = getActiveSessionId();
  } else if (sessions.length > 0) {
    defaultSelected = sessions[0].desktopId;
  }

  const parsed = parseDeepLink(whatsappUrl);
  const phone = parsed?.phone || "";
  const text = parsed?.text || "";

  const mWidth = 440;
  const mHeight = 540;
  const winOptions = {
    width: mWidth,
    height: mHeight,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    backgroundColor: "#202c33",
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "picker-preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  };

  if (parent && !parent.isDestroyed()) {
    const {
      width: pWidth,
      height: pHeight,
      x: pX,
      y: pY,
    } = parent.getContentBounds();
    winOptions.x = Math.round(pX + (pWidth - mWidth) / 2);
    winOptions.y = Math.round(pY + (pHeight - mHeight) / 2);
    winOptions.parent = parent;
    winOptions.modal = true;
    winOptions.frame = false;
  } else {
    winOptions.center = true;
    winOptions.frame = false;
  }

  const win = new BrowserWindow(winOptions);
  win.setMenuBarVisibility(false);
  currentPickerWin = win;

  win.loadFile(path.join(__dirname, "picker.html"), {
    query: { locale: currentLocale() },
  });

  win.once("ready-to-show", () => {
    if (win && !win.isDestroyed()) {
      if (process.platform === "win32") {
        win.setAlwaysOnTop(true);
        win.show();
        win.focus();
        win.setAlwaysOnTop(false);
      } else {
        win.show();
        win.focus();
      }
    }
  });

  win.webContents.once("did-finish-load", () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("picker:init", sessions, {
        defaultSelectedId: defaultSelected,
        phone,
        text,
      });
    }
  });

  win.on("closed", () => {
    currentPickerWin = null;
    currentOnChosen = null;
    currentUrl = null;
    if (parent && !parent.isDestroyed()) {
      parent.focus();
    }
    if (isStandalone) {
      app.quit();
    }
  });

  return win;
}

function handleWhatsAppLink(whatsappUrl, parentWin) {
  if (!whatsappUrl) return;

  const win =
    parentWin ||
    BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w.isVisible(),
    );

  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    if (process.platform === "win32") {
      win.setAlwaysOnTop(true);
      win.focus();
      win.setAlwaysOnTop(false);
    } else {
      win.focus();
    }
  }

  openPickerModal(win, whatsappUrl, (chosenDesktopId, originalUrl, extra) => {
    const { sendWhatsAppMessageToSession } = require("../mainWindow");
    const parsed = parseDeepLink(whatsappUrl);
    const phone = parsed?.phone || "";
    const text =
      extra && typeof extra.message === "string"
        ? extra.message
        : parsed?.text || "";
    const autoSend = extra ? Boolean(extra.autoSend) : false;
    sendWhatsAppMessageToSession(chosenDesktopId, phone, text, autoSend);
  });
}

function run(argv) {
  const whatsappUrl = extractDeepLinkArg(argv);
  if (!whatsappUrl) {
    app.quit();
    return;
  }
  isStandalone = true;
  const { forwardToSession } = require("../deepLinks/forward");
  openPickerModal(null, whatsappUrl, (desktopId, originalUrl, extra) => {
    let finalUrl = whatsappUrl;
    if (extra && (typeof extra.message === "string" || extra.autoSend)) {
      const parsed = parseDeepLink(whatsappUrl);
      const params = new URLSearchParams();
      if (parsed?.phone) params.set("phone", parsed.phone);
      const msg =
        typeof extra.message === "string" ? extra.message : parsed?.text || "";
      if (msg) params.set("text", msg);
      if (extra.autoSend) params.set("autosend", "1");
      finalUrl = `whatsapp://send?${params.toString()}`;
    }
    forwardToSession(desktopId, finalUrl);
  });
}

module.exports = {
  run,
  openPickerModal,
  handleWhatsAppLink,
};
