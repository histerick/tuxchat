'use strict';

const { Menu, app, ipcMain } = require('electron');
const { openAddSessionDialog, openDeleteSessionDialog, openRenameSessionDialog, canRenameSelf } = require('../sessions');
const { openSettingsDialog } = require('../deepLinks');
const { openSessionColorDialog } = require('../sessionColor');
const { getWhatsAppContents } = require('../mainWindow');
const { t } = require('../i18n');

function quit() {
  app.isQuitting = true;
  app.quit();
}

// Explicit actions instead of Electron's menu roles: a role acts on the
// focused window's own webContents, which is now the title bar, not
// WhatsApp Web (see mainWindow/).
function zoom(delta) {
  const contents = getWhatsAppContents();
  contents.setZoomLevel(delta === 0 ? 0 : contents.getZoomLevel() + delta);
}

function buildTemplate(win) {
  return {
    file: [{ label: t('menu.quit'), accelerator: 'CmdOrCtrl+Q', click: quit }],
    sessions: [
      { label: t('menu.addSession'), click: () => openAddSessionDialog() },
      { label: t('menu.renameSession'), enabled: canRenameSelf(), click: () => openRenameSessionDialog() },
      { label: t('menu.deleteSession'), click: () => openDeleteSessionDialog() },
      { label: t('menu.sessionColor'), click: () => openSessionColorDialog() },
      { type: 'separator' },
      { label: t('menu.whatsappLinks'), click: () => openSettingsDialog() },
    ],
    view: [
      { label: t('menu.reload'), accelerator: 'CmdOrCtrl+R', click: () => getWhatsAppContents().reload() },
      {
        label: t('menu.toggleDevTools'),
        accelerator: 'CmdOrCtrl+Shift+I',
        click: () => getWhatsAppContents().toggleDevTools(),
      },
      { type: 'separator' },
      { label: t('menu.resetZoom'), accelerator: 'CmdOrCtrl+0', click: () => zoom(0) },
      { label: t('menu.zoomIn'), accelerator: 'CmdOrCtrl+Plus', click: () => zoom(0.5) },
      { label: t('menu.zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => zoom(-0.5) },
      { type: 'separator' },
      { label: t('menu.fullscreen'), accelerator: 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
    ],
  };
}

// A frameless window has no native menu bar, so its accelerators never
// fire on their own: matched here instead, on both the title bar and
// WhatsApp. preventDefault keeps the page from also acting on the key.
function shortcutFor(input) {
  const ctrl = input.control || input.meta;
  const key = input.key.toLowerCase();
  if (input.key === 'F11') return 'fullscreen';
  if (input.key === 'F5') return 'reload';
  if (!ctrl || input.alt) return null;
  if (key === 'q' && !input.shift) return 'quit';
  if (key === 'r' && !input.shift) return 'reload';
  if (key === 'i' && input.shift) return 'devtools';
  if (key === '0') return 'resetZoom';
  if (key === '=' || key === '+') return 'zoomIn';
  if (key === '-') return 'zoomOut';
  return null;
}

function handleShortcuts(win, contents) {
  const actions = {
    quit,
    reload: () => getWhatsAppContents().reload(),
    devtools: () => getWhatsAppContents().toggleDevTools(),
    resetZoom: () => zoom(0),
    zoomIn: () => zoom(0.5),
    zoomOut: () => zoom(-0.5),
    fullscreen: () => win.setFullScreen(!win.isFullScreen()),
  };
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const action = shortcutFor(input);
    if (!action) return;
    event.preventDefault();
    actions[action]();
  });
}

function buildMenu(win) {
  // No application menu at all: Electron would otherwise install its
  // default one, whose own Ctrl+R/zoom accelerators target the title bar.
  Menu.setApplicationMenu(null);

  handleShortcuts(win, win.webContents);
  handleShortcuts(win, getWhatsAppContents());

  // Rebuilt on every click so items like "Rename session..." reflect the
  // current state (it's disabled for the main session).
  ipcMain.on('titlebar:menu', (_event, id, x, y) => {
    const items = buildTemplate(win)[id];
    if (!items) return;
    // registerAccelerator: false — shown as a hint only; handleShortcuts
    // above is what actually runs them.
    const menu = Menu.buildFromTemplate(items.map((item) => ({ ...item, registerAccelerator: false })));
    menu.popup({ window: win, x, y });
  });
}

module.exports = { buildMenu };
