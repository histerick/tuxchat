'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createMainWindow(config) {
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
