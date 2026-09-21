'use strict';

const { Menu, app } = require('electron');
const { openAddSessionDialog, openDeleteSessionDialog, openRenameSessionDialog, canRenameSelf } = require('../sessions');
const { openSettingsDialog } = require('../deepLinks');
const { t } = require('../i18n');

function buildMenu() {
  const template = [
    {
      label: t('menu.file'),
      submenu: [
        {
          label: t('menu.quit'),
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: t('menu.sessions'),
      submenu: [
        {
          label: t('menu.addSession'),
          click: () => openAddSessionDialog(),
        },
        {
          label: t('menu.renameSession'),
          enabled: canRenameSelf(),
          click: () => openRenameSessionDialog(),
        },
        {
          label: t('menu.deleteSession'),
          click: () => openDeleteSessionDialog(),
        },
        { type: 'separator' },
        {
          label: t('menu.whatsappLinks'),
          click: () => openSettingsDialog(),
        },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = { buildMenu };
