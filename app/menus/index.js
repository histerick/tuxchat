'use strict';

const { Menu, app } = require('electron');
const { openAddSessionDialog, openDeleteSessionDialog, openRenameSessionDialog, canRenameSelf } = require('../sessions');

function buildMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Sesiones',
      submenu: [
        {
          label: 'Añadir sesión...',
          click: () => openAddSessionDialog(),
        },
        {
          label: 'Renombrar sesión...',
          enabled: canRenameSelf(),
          click: () => openRenameSessionDialog(),
        },
        {
          label: 'Eliminar sesión...',
          click: () => openDeleteSessionDialog(),
        },
      ],
    },
    {
      label: 'Ver',
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
