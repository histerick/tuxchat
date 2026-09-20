'use strict';

const { Tray, Menu, app } = require('electron');

function buildTrayMenu(mainWindow, appName) {
  return Menu.buildFromTemplate([
    // Not clickable: just labels which session this tray icon belongs to,
    // so it's visible without having to hover for the tooltip.
    { label: appName, enabled: false },
    { type: 'separator' },
    {
      label: 'Mostrar',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray(mainWindow, config) {
  const tray = new Tray(config.appIcon);
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
