'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { extractDeepLinkArg } = require('../deepLinks/translate');
const { forwardToSession } = require('../deepLinks/forward');
const { getRememberedHandler, setRememberedHandler } = require('../deepLinks/state');
const { listAllSessions } = require('../sessions');
const { currentLocale } = require('../i18n');

// Entry point for the standalone "router" process: a whatsapp:// link
// launches this (via tuxchat-router.desktop, see deepLinks/router-install)
// instead of a normal WhatsApp session, purely to decide *which* session
// should get it. It never shows the app's own window — just forwards and
// exits, or asks once via its own small picker when there's a real choice
// to make.
function run(argv) {
  const whatsappUrl = extractDeepLinkArg(argv);
  if (!whatsappUrl) {
    app.quit();
    return;
  }

  const sessions = listAllSessions();
  const remembered = getRememberedHandler();
  const rememberedStillExists = remembered && sessions.some((s) => s.desktopId === remembered);

  if (rememberedStillExists) {
    forwardAndQuit(remembered, whatsappUrl);
    return;
  }

  // Nothing to choose between: skip the picker entirely rather than
  // asking to confirm the only possible answer.
  if (sessions.length <= 1) {
    if (sessions[0]) forwardAndQuit(sessions[0].desktopId, whatsappUrl);
    else app.quit();
    return;
  }

  openPicker(sessions, whatsappUrl);
}

// Stays alive until forwardToSession has watched the launch, so a session
// that fails to start still gets logged (see deepLinks/forward.js).
function forwardAndQuit(desktopId, whatsappUrl) {
  return forwardToSession(desktopId, whatsappUrl).finally(() => app.quit());
}

function openPicker(sessions, whatsappUrl) {
  const win = new BrowserWindow({
    width: 380,
    height: 360,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'picker-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'picker.html'), { query: { locale: currentLocale() } });

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('picker:init', sessions);
  });

  // Closing without choosing (cancel) just drops the link — same as
  // dismissing Windows' own app picker without picking anything. After a
  // choice, forwardAndQuit quits instead, once the launch is watched.
  // Listening here also stops Electron's default quit-on-last-window.
  let forwarding = false;
  app.on('window-all-closed', () => {
    if (!forwarding) app.quit();
  });

  ipcMain.handleOnce('picker:choose', (_event, { desktopId, remember }) => {
    if (remember) setRememberedHandler(desktopId);
    forwarding = true;
    forwardAndQuit(desktopId, whatsappUrl);
    win.close();
    return { ok: true };
  });
}

module.exports = { run };
