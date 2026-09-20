'use strict';

const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

// WhatsApp Web rejects Electron's default UA ("... Electron/44.4.3 ...")
// as an unsupported browser and asks to "update Chrome". This strips the
// Electron token and reports the real Chromium version underneath instead
// of a fake one, which is enough to pass the check.
const DESKTOP_CHROME_UA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

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
  win.loadURL(config.url);

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
