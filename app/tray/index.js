'use strict';

const { Tray, Menu, app, nativeImage } = require('electron');
const fs = require('node:fs');
const { t } = require('../i18n');

function buildTrayMenu(mainWindow, appName) {
  return Menu.buildFromTemplate([
    // Not clickable: just labels which session this tray icon belongs to,
    // so it's visible without having to hover for the tooltip.
    { label: appName, enabled: false },
    { type: 'separator' },
    {
      label: t('tray.show'),
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: t('menu.quit'),
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray(mainWindow, config) {
  // new Tray() throws synchronously if the icon file doesn't exist, which
  // — since this runs inside app.whenReady().then() — turns into an
  // unhandled promise rejection that silently aborts everything *after*
  // it in that callback (menu setup, session self-context registration)
  // with no visible error to the user. A missing icon should mean "no
  // tray icon", not "half the app failed to start" — fall back instead.
  const icon = fs.existsSync(config.appIcon) ? config.appIcon : nativeImage.createEmpty();
  const tray = new Tray(icon);
  tray.setToolTip(config.appName);
  tray.setContextMenu(buildTrayMenu(mainWindow, config.appName));

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

// Called after a rename so the tray reflects the new name without needing
// a restart: the tooltip and the (non-clickable) name row in the menu.
function updateTrayName(tray, mainWindow, appName) {
  tray.setToolTip(appName);
  tray.setContextMenu(buildTrayMenu(mainWindow, appName));
}

module.exports = { createTray, updateTrayName };
