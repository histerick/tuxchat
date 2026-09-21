'use strict';

// Main-process strings only (menus, tray, session validation/errors, the
// .desktop files this code writes to disk). Renderer dialogs have their
// own separate dictionary in renderer-strings.js — a plain page script
// can't require() this CommonJS module, and IPC can't carry the
// parametrized (function) entries below across the process boundary.
const es = {
  common: {
    cancel: 'Cancelar',
  },
  menu: {
    file: 'Archivo',
    quit: 'Salir',
    sessions: 'Sesiones',
    addSession: 'Añadir sesión...',
    renameSession: 'Renombrar sesión...',
    deleteSession: 'Eliminar sesión...',
    whatsappLinks: 'Enlaces de WhatsApp...',
    view: 'Ver',
  },
  tray: {
    show: 'Mostrar',
  },
  sessions: {
    mainLabel: 'TuxChat (principal)',
    desktopComment: (name) => `WhatsApp Web (sesión "${name}", proyecto TuxChat)`,
    errors: {
      emptyName: 'Escribí un nombre para la sesión.',
      newlineName: 'El nombre no puede tener saltos de línea.',
      tooLong: (max) => `Máximo ${max} caracteres.`,
      invalidSlug: 'Ese nombre no genera un identificador válido, probá con otro.',
      duplicate: (name) => `Ya existe una sesión "${name}".`,
      limitReached: (max) => `Límite de ${max} sesiones alcanzado.`,
      createFailed: (msg) => `No se pudo crear la sesión: ${msg}`,
      invalidSession: 'Sesión inválida.',
      notFound: 'Esa sesión ya no existe.',
      deleteFailed: (msg) => `No se pudo eliminar la sesión: ${msg}`,
      inUse: (name) => `Ya hay otra sesión llamada "${name}".`,
      renameFailed: (msg) => `No se pudo renombrar la sesión: ${msg}`,
      mainCantRename: 'La sesión principal no se puede renombrar desde acá.',
    },
  },
  router: {
    desktopName: 'TuxChat (enlaces)',
    desktopComment: 'Abre enlaces whatsapp:// con una sesión de TuxChat',
  },
};

const en = {
  common: {
    cancel: 'Cancel',
  },
  menu: {
    file: 'File',
    quit: 'Quit',
    sessions: 'Sessions',
    addSession: 'Add session...',
    renameSession: 'Rename session...',
    deleteSession: 'Delete session...',
    whatsappLinks: 'WhatsApp links...',
    view: 'View',
  },
  tray: {
    show: 'Show',
  },
  sessions: {
    mainLabel: 'TuxChat (main)',
    desktopComment: (name) => `WhatsApp Web (session "${name}", TuxChat project)`,
    errors: {
      emptyName: 'Type a name for the session.',
      newlineName: "The name can't contain line breaks.",
      tooLong: (max) => `Maximum ${max} characters.`,
      invalidSlug: "That name doesn't produce a valid identifier, try another one.",
      duplicate: (name) => `A session named "${name}" already exists.`,
      limitReached: (max) => `Limit of ${max} sessions reached.`,
      createFailed: (msg) => `Couldn't create the session: ${msg}`,
      invalidSession: 'Invalid session.',
      notFound: "That session doesn't exist anymore.",
      deleteFailed: (msg) => `Couldn't delete the session: ${msg}`,
      inUse: (name) => `There's already another session named "${name}".`,
      renameFailed: (msg) => `Couldn't rename the session: ${msg}`,
      mainCantRename: "The main session can't be renamed from here.",
    },
  },
  router: {
    desktopName: 'TuxChat (links)',
    desktopComment: 'Opens whatsapp:// links with a TuxChat session',
  },
};

module.exports = { es, en };
