"use strict";

// Main-process strings only (menus, tray, session validation/errors, the
// .desktop files this code writes to disk). Renderer dialogs have their
// own separate dictionary in renderer-strings.js — a plain page script
// can't require() this CommonJS module, and IPC can't carry the
// parametrized (function) entries below across the process boundary.
const es = {
  common: {
    cancel: "Cancelar",
  },
  menu: {
    file: "Archivo",
    language: "Idioma",
    quit: "Salir",
    sessions: "Sesiones",
    addSession: "Añadir sesión...",
    editSession: "Editar sesión...",
    renameSession: "Renombrar sesión...",
    deleteSession: "Eliminar sesión...",
    sessionColor: "Color de la sesión...",
    muteAudio: "Silenciar audio",
    unmuteAudio: "Reactivar audio",
    volume: "Volumen",
    silent: "Silencioso",
    whatsappLinks: "Enlaces de WhatsApp...",
    view: "Ver",
    reload: "Recargar",
    toggleDevTools: "Herramientas de desarrollo",
    resetZoom: "Tamaño real",
    zoomIn: "Ampliar",
    zoomOut: "Reducir",
    fullscreen: "Pantalla completa",
    about: "Acerca de",
    repository: "Repositorio",
    aboutApp: "Acerca de TuxChat",
  },
  tray: {
    show: "Mostrar",
  },
  contextMenu: {
    copyLink: "Copiar enlace",
    openLink: "Abrir en el navegador",
  },
  sessions: {
    mainLabel: "Principal",
    desktopComment: (name) =>
      `WhatsApp Web (sesión "${name}", proyecto TuxChat)`,
    errors: {
      emptyName: "Escribí un nombre para la sesión.",
      newlineName: "El nombre no puede tener saltos de línea.",
      tooLong: (max) => `Máximo ${max} caracteres.`,
      invalidSlug:
        "Ese nombre no genera un identificador válido, probá con otro.",
      duplicate: (name) => `Ya existe una sesión "${name}".`,
      limitReached: (max) => `Límite de ${max} sesiones alcanzado.`,
      createFailed: (msg) => `No se pudo crear la sesión: ${msg}`,
      invalidSession: "Sesión inválida.",
      notFound: "Esa sesión ya no existe.",
      deleteFailed: (msg) => `No se pudo eliminar la sesión: ${msg}`,
      inUse: (name) => `Ya hay otra sesión llamada "${name}".`,
      renameFailed: (msg) => `No se pudo renombrar la sesión: ${msg}`,
      mainCantRename: "La sesión principal no se puede renombrar desde acá.",
    },
  },
  router: {
    desktopName: "TuxChat (enlaces)",
    desktopComment: "Abre enlaces whatsapp:// con una sesión de TuxChat",
  },
};

const en = {
  common: {
    cancel: "Cancel",
  },
  menu: {
    file: "File",
    language: "Language",
    quit: "Quit",
    sessions: "Sessions",
    addSession: "Add session...",
    editSession: "Edit session...",
    renameSession: "Rename session...",
    deleteSession: "Delete session...",
    sessionColor: "Session color...",
    muteAudio: "Mute audio",
    unmuteAudio: "Unmute audio",
    volume: "Volume",
    silent: "Silent",
    whatsappLinks: "WhatsApp links...",
    view: "View",
    reload: "Reload",
    toggleDevTools: "Toggle Developer Tools",
    resetZoom: "Reset Size",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    fullscreen: "Toggle Full Screen",
    about: "About",
    repository: "Repository",
    aboutApp: "About TuxChat",
  },
  tray: {
    show: "Show",
  },
  contextMenu: {
    copyLink: "Copy link",
    openLink: "Open in browser",
  },
  sessions: {
    mainLabel: "Main",
    desktopComment: (name) =>
      `WhatsApp Web (session "${name}", TuxChat project)`,
    errors: {
      emptyName: "Type a name for the session.",
      newlineName: "The name can't contain line breaks.",
      tooLong: (max) => `Maximum ${max} characters.`,
      invalidSlug:
        "That name doesn't produce a valid identifier, try another one.",
      duplicate: (name) => `A session named "${name}" already exists.`,
      limitReached: (max) => `Limit of ${max} sessions reached.`,
      createFailed: (msg) => `Couldn't create the session: ${msg}`,
      invalidSession: "Invalid session.",
      notFound: "That session doesn't exist anymore.",
      deleteFailed: (msg) => `Couldn't delete the session: ${msg}`,
      inUse: (name) => `There's already another session named "${name}".`,
      renameFailed: (msg) => `Couldn't rename the session: ${msg}`,
      mainCantRename: "The main session can't be renamed from here.",
    },
  },
  router: {
    desktopName: "TuxChat (links)",
    desktopComment: "Opens whatsapp:// links with a TuxChat session",
  },
};

const pt = {
  common: {
    cancel: "Cancelar",
  },
  menu: {
    file: "Arquivo",
    language: "Idioma",
    quit: "Sair",
    sessions: "Sessões",
    addSession: "Adicionar sessão...",
    editSession: "Editar sessão...",
    renameSession: "Renomear sessão...",
    deleteSession: "Excluir sessão...",
    sessionColor: "Cor da sessão...",
    muteAudio: "Mutar áudio",
    unmuteAudio: "Desmutar áudio",
    volume: "Volume",
    silent: "Silencioso",
    whatsappLinks: "Links do WhatsApp...",
    view: "Exibir",
    reload: "Recarregar",
    toggleDevTools: "Ferramentas do desenvolvedor",
    resetZoom: "Tamanho original",
    zoomIn: "Aumentar zoom",
    zoomOut: "Diminuir zoom",
    fullscreen: "Tela cheia",
    about: "Sobre",
    repository: "Repositório",
    aboutApp: "Sobre o TuxChat",
  },
  tray: {
    show: "Exibir",
  },
  contextMenu: {
    copyLink: "Copiar link",
    openLink: "Abrir no navegador",
  },
  sessions: {
    mainLabel: "Principal",
    desktopComment: (name) =>
      `WhatsApp Web (sessão "${name}", projeto TuxChat)`,
    errors: {
      emptyName: "Digite um nome para a sessão.",
      newlineName: "O nome não pode conter quebras de linha.",
      tooLong: (max) => `Máximo de ${max} caracteres.`,
      invalidSlug: "Esse nome não produz um identificador válido, tente outro.",
      duplicate: (name) => `Já existe uma sessão chamada "${name}".`,
      limitReached: (max) => `Limite de ${max} sessões atingido.`,
      createFailed: (msg) => `Não foi possível criar a sessão: ${msg}`,
      invalidSession: "Sessão inválida.",
      notFound: "Essa sessão não existe mais.",
      deleteFailed: (msg) => `Não foi possível excluir a sessão: ${msg}`,
      inUse: (name) => `Já existe outra sessão chamada "${name}".`,
      renameFailed: (msg) => `Não foi possível renomear a sessão: ${msg}`,
      mainCantRename: "A sessão principal não pode ser renomeada por aqui.",
    },
  },
  router: {
    desktopName: "TuxChat (links)",
    desktopComment: "Abre links whatsapp:// com uma sessão do TuxChat",
  },
};

module.exports = { es, en, pt };
