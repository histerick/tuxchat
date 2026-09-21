// Plain browser-context globals, not a CommonJS module: loaded via
// <script src="../i18n/renderer-strings.js"> before each dialog's own
// script, since a sandboxed renderer can't require() local app files.
// Mirrors app/i18n/strings.js's locale policy but only covers dialog UI
// text (no parametrized entries — those stay server-side, resolved by
// the main process before an error string ever reaches a renderer).
window.TUXCHAT_STRINGS = {
  es: {
    addDialog: {
      windowTitle: 'Añadir sesión',
      heading: 'Nueva sesión aislada de TuxChat',
      count: (count, max) => `Sesiones configuradas: ${count}/${max}`,
      namePlaceholder: 'Ej: Personal, Trabajo, Familia',
      success: '¡Listo! Abriendo la sesión...',
      cancel: 'Cancelar',
      create: 'Crear',
    },
    deleteDialog: {
      windowTitle: 'Eliminar sesión',
      heading: 'Eliminar sesión',
      description:
        'Borra el inicio de sesión, la configuración y los datos guardados localmente para la sesión elegida, en esta computadora. No afecta tu cuenta de WhatsApp ni los archivos ya compartidos o descargados, y no puede deshacerse.',
      empty: 'No hay sesiones adicionales para eliminar.',
      select: 'Seleccionar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
    },
    renameDialog: {
      windowTitle: 'Renombrar sesión',
      heading: 'Renombrar sesión',
      hint: 'Máximo 25 caracteres.',
      cancel: 'Cancelar',
      confirm: 'Renombrar',
      mainCantRename: 'La sesión principal no se puede renombrar desde acá.',
    },
    linksSettingsDialog: {
      windowTitle: 'Enlaces de WhatsApp',
      heading: 'Enlaces de WhatsApp (whatsapp://)',
      description:
        'Elegí qué sesión abre los enlaces "whatsapp://" que lleguen desde otras apps. Si no guardás ninguna, se te va a preguntar cada vez que llegue un enlace (mientras exista más de una sesión).',
      savedSession: (name) => `Sesión guardada: ${name}`,
      noSavedSession: 'Sin sesión guardada: se pregunta cada vez que llega un enlace (si hay más de una sesión).',
      forget: 'Olvidar guardada',
      save: 'Guardar',
      close: 'Cerrar',
    },
    linkPicker: {
      windowTitle: 'Abrir enlace de WhatsApp',
      heading: '¿Con qué sesión abrís este chat?',
      remember: 'Recordar esta elección para los próximos enlaces',
      open: 'Abrir',
    },
    changelogDialog: {
      windowTitle: 'Novedades de TuxChat',
      heading: (version) => `TuxChat se actualizó a ${version}`,
      subheading: 'Esto es lo que cambió:',
      noNotes: 'No hay notas de esta versión.',
      close: 'Cerrar',
    },
  },
  en: {
    addDialog: {
      windowTitle: 'Add session',
      heading: 'New isolated TuxChat session',
      count: (count, max) => `Configured sessions: ${count}/${max}`,
      namePlaceholder: 'E.g.: Personal, Work, Family',
      success: 'Done! Opening the session...',
      cancel: 'Cancel',
      create: 'Create',
    },
    deleteDialog: {
      windowTitle: 'Delete session',
      heading: 'Delete session',
      description:
        "Erases the login, settings and locally saved data for the chosen session, on this computer. It doesn't affect your WhatsApp account or files already shared or downloaded, and it can't be undone.",
      empty: 'There are no extra sessions to delete.',
      select: 'Select',
      cancel: 'Cancel',
      delete: 'Delete',
    },
    renameDialog: {
      windowTitle: 'Rename session',
      heading: 'Rename session',
      hint: 'Maximum 25 characters.',
      cancel: 'Cancel',
      confirm: 'Rename',
      mainCantRename: "The main session can't be renamed from here.",
    },
    linksSettingsDialog: {
      windowTitle: 'WhatsApp links',
      heading: 'WhatsApp links (whatsapp://)',
      description:
        "Choose which session opens \"whatsapp://\" links coming from other apps. If you don't save one, you'll be asked every time a link arrives (as long as more than one session exists).",
      savedSession: (name) => `Saved session: ${name}`,
      noSavedSession: "No session saved: you'll be asked every time a link arrives (if there's more than one session).",
      forget: 'Forget saved',
      save: 'Save',
      close: 'Close',
    },
    linkPicker: {
      windowTitle: 'Open WhatsApp link',
      heading: 'Which session should open this chat?',
      remember: 'Remember this choice for future links',
      open: 'Open',
    },
    changelogDialog: {
      windowTitle: "What's new in TuxChat",
      heading: (version) => `TuxChat updated to ${version}`,
      subheading: "Here's what changed:",
      noNotes: 'No release notes for this version.',
      close: 'Close',
    },
  },
};
