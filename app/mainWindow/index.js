'use strict';

const { app, BrowserWindow, session, shell } = require('electron');
const path = require('node:path');

// WhatsApp Web rejects Electron's default UA ("... Electron/44.4.3 ...")
// as an unsupported browser and asks to "update Chrome". This strips the
// Electron token and reports the real Chromium version underneath instead
// of a fake one, which is enough to pass the check.
const DESKTOP_CHROME_UA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

// Schemes safe to hand to the desktop (xdg-open). Anything else — file:,
// javascript:, blob:, custom app schemes — is dropped, since a chat
// message is untrusted input.
const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function openExternally(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!EXTERNAL_SCHEMES.has(parsed.protocol)) return;
  shell.openExternal(parsed.href).catch((err) => {
    console.error('No se pudo abrir el enlace en el navegador:', err);
  });
}

// Links in chats (Zoom, Meet, anything with target="_blank") would
// otherwise open as a bare Electron popup sharing this session. Send them
// to the user's default browser instead — which, if it's already running,
// just gets a new tab in its existing window.
function routeExternalLinks(win, appUrl) {
  const appOrigin = new URL(appUrl).origin;

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: 'deny' };
  });

  // Plain same-window navigations away from WhatsApp Web (a link without
  // target="_blank") would replace the whole app with the external page.
  win.webContents.on('will-navigate', (event, url) => {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      return;
    }
    if (origin === appOrigin) return;
    event.preventDefault();
    openExternally(url);
  });
}

function createMainWindow(config) {
  session.defaultSession.setUserAgent(DESKTOP_CHROME_UA);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: config.appName,
    icon: config.appIcon,
    webPreferences: {
      preload: path.join(__dirname, '..', 'browser', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  win.webContents.setUserAgent(DESKTOP_CHROME_UA);
  routeExternalLinks(win, config.url);
  win.loadURL(config.url);

  // Electron syncs the window title to the loaded page's document.title by
  // default, and WhatsApp Web sets its own ("WhatsApp", or "(3) WhatsApp"
  // for the unread badge) — which would silently overwrite our profile
  // name and defeat the point of being able to tell sessions apart in the
  // dock hover preview / Alt-Tab. Keep our own title pinned instead.
  win.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Hide to tray instead of quitting: WhatsApp Web needs to stay loaded
  // in the background to keep receiving calls/messages, same as the
  // official desktop client's behavior.
  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

module.exports = { createMainWindow };
