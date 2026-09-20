'use strict';

const { BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('node:path');

// There is no OS-level picker to delegate to under X11 (confirmed by
// checking teams-for-linux's own ADR on this: useSystemPicker only works
// on Wayland/macOS/Windows, and even then not reliably on Linux). So we
// build a minimal picker window backed by desktopCapturer thumbnails.
function openPicker(sources) {
  return new Promise((resolve) => {
    const picker = new BrowserWindow({
      width: 640,
      height: 480,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'Compartir pantalla',
      webPreferences: {
        preload: path.join(__dirname, 'picker-preload.js'),
        contextIsolation: true,
        sandbox: true,
      },
    });

    let settled = false;
    const finish = (sourceId) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('screen-picker:selected', onSelected);
      if (!picker.isDestroyed()) picker.close();
      resolve(sourceId);
    };

    const onSelected = (event, sourceId) => {
      if (event.sender === picker.webContents) finish(sourceId);
    };

    ipcMain.on('screen-picker:selected', onSelected);
    picker.on('closed', () => finish(null));

    picker.loadFile(path.join(__dirname, 'picker.html')).then(() => {
      picker.webContents.send(
        'screen-picker:sources',
        sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }))
      );
    });
  });
}

function registerScreenSharing(targetSession) {
  targetSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 300, height: 180 },
    });

    const sourceId = await openPicker(sources);
    if (!sourceId) {
      callback({});
      return;
    }

    const chosen = sources.find((s) => s.id === sourceId);
    // Linux has no system audio loopback support in Electron; only video
    // is captured here. Documented as a known limitation, not a bug.
    callback({ video: chosen });
  });
}

module.exports = { registerScreenSharing };
