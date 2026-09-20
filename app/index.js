'use strict';

const { app, BrowserWindow, session } = require('electron');
const { getConfig } = require('./config');
const { createMainWindow } = require('./mainWindow');
const { registerPermissionHandlers } = require('./permissions');
const { registerScreenSharing } = require('./screenSharing');
const { createTray } = require('./tray');
const { buildMenu } = require('./menus');
const { registerSelfContext } = require('./sessions');

const config = getConfig();

if (config.ozonePlatform) {
  app.commandLine.appendSwitch('ozone-platform', config.ozonePlatform);
}

app.setName(config.appName);

// Each profile is launched with its own --user-data-dir, so the lock is
// naturally scoped per profile rather than per machine.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.whenReady().then(() => {
    registerPermissionHandlers(session.defaultSession);
    registerScreenSharing(session.defaultSession);

    const mainWindow = createMainWindow(config);
    const tray = createTray(mainWindow, config);
    registerSelfContext(mainWindow, tray, config.profileName);
    buildMenu();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
