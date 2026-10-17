"use strict";

const {
  app,
  BrowserWindow,
  Menu,
  WebContentsView,
  clipboard,
  session,
  shell,
} = require("electron");
const path = require("node:path");
const { t } = require("../i18n");
const titlebar = require("./titlebar");
const { registerPermissionHandlers } = require("../permissions");
const { registerScreenSharing } = require("../screenSharing");

// WhatsApp Web rejects Electron's default UA ("... Electron/44.4.3 ...")
// as an unsupported browser and asks to "update Chrome". This strips the
// Electron token and reports the real Chromium version underneath instead
// of a fake one, which is enough to pass the check.
const DESKTOP_CHROME_UA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

// Schemes safe to hand to the desktop (xdg-open). Anything else — file:,
// javascript:, blob:, custom app schemes — is dropped, since a chat
// message is untrusted input.
const EXTERNAL_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
const SIDEBAR_WIDTH = 68;

function openExternally(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!EXTERNAL_SCHEMES.has(parsed.protocol)) return;
  shell.openExternal(parsed.href).catch((err) => {
    console.error("No se pudo abrir el enlace en el navegador:", err);
  });
}

function routeExternalLinks(contents, appUrl) {
  const appOrigin = new URL(appUrl).origin;

  contents.setWindowOpenHandler(({ url }) => {
    const { extractDeepLinkArg } = require("../deepLinks/translate");
    const deepLink = extractDeepLinkArg([url]);
    if (deepLink) {
      const { handleWhatsAppLink } = require("../router");
      handleWhatsAppLink(deepLink, currentMainWindow);
      return { action: "deny" };
    }
    openExternally(url);
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      return;
    }
    if (origin === appOrigin) return;
    event.preventDefault();

    openExternally(url);
  });
}

function addLinkContextMenu(win, contents) {
  contents.on("context-menu", (_event, params) => {
    if (!params.linkURL) return;
    Menu.buildFromTemplate([
      {
        label: t("contextMenu.copyLink"),
        click: () => clipboard.writeText(params.linkURL),
      },
      {
        label: t("contextMenu.openLink"),
        click: () => openExternally(params.linkURL),
      },
    ]).popup({ window: win });
  });
}

let currentMainWindow = null;
let currentConfig = null;
let activeSessionId = "tuxchat";
const sessionViews = new Map(); // desktopId -> WebContentsView

function getWhatsAppContents() {
  const view = sessionViews.get(activeSessionId);
  return view ? view.webContents : null;
}

function getActiveSessionId() {
  return activeSessionId;
}

function updateLayout() {
  if (!currentMainWindow || currentMainWindow.isDestroyed()) return;
  // Use getContentBounds() for exact client coordinates inside win.contentView
  const { width, height } = currentMainWindow.getContentBounds();
  const top = currentMainWindow.isFullScreen() ? 0 : titlebar.HEIGHT;
  const viewWidth = Math.max(0, width - SIDEBAR_WIDTH);
  const viewHeight = Math.max(0, height - top);

  for (const [id, sView] of sessionViews.entries()) {
    if (id === activeSessionId) {
      sView.setBounds({
        x: 0,
        y: top,
        width: viewWidth,
        height: viewHeight,
      });
    } else {
      // Park inactive views off-screen to keep connection & background audio/notifications alive
      sView.setBounds({
        x: -10000,
        y: -10000,
        width: 100,
        height: 100,
      });
    }
  }
}

function getOrCreateSessionView(desktopId) {
  if (sessionViews.has(desktopId)) {
    return sessionViews.get(desktopId);
  }

  let partitionSession;
  if (desktopId === "tuxchat") {
    partitionSession = session.defaultSession;
  } else {
    partitionSession = session.fromPartition(`persist:${desktopId}`, {
      cache: true,
    });
  }

  partitionSession.setUserAgent(DESKTOP_CHROME_UA);
  registerPermissionHandlers(partitionSession);
  registerScreenSharing(partitionSession);

  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "..", "browser", "preload.js"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      session: partitionSession,
    },
  });

  try {
    const { getSessionMuted } = require("../sessions");
    view.webContents.setAudioMuted(getSessionMuted(desktopId));
  } catch {
    // Sessions module not yet available
  }

  view.webContents.setUserAgent(DESKTOP_CHROME_UA);
  routeExternalLinks(view.webContents, currentConfig.url);
  addLinkContextMenu(currentMainWindow, view.webContents);

  view.webContents.on("did-finish-load", () => {
    updateLayout();
    try {
      const { getSessionMuted, getSessionVolume } = require("../sessions");
      view.webContents.setAudioMuted(getSessionMuted(desktopId));
      applyVolumeToWebContents(view.webContents, getSessionVolume(desktopId));
    } catch {
      // Sessions module not yet available
    }
    view.webContents
      .executeJavaScript(
        `
      if (typeof window.abrirChatComMensagem !== 'function') {
        window.abrirChatComMensagem = function(numero, mensagem = "") {
          let numeroLimpo = String(numero).replace(/\\D/g, '');
          if ((numeroLimpo.length === 10 || numeroLimpo.length === 11) && !numeroLimpo.startsWith('55')) {
            numeroLimpo = '55' + numeroLimpo;
          }
          const mensagemCodificada = encodeURIComponent(mensagem || '');
          const linkInvisivel = document.createElement('a');
          linkInvisivel.setAttribute('href', \`https://web.whatsapp.com/send?phone=\${numeroLimpo}&text=\${mensagemCodificada}\`);
          linkInvisivel.setAttribute('style', 'display:none;');
          document.body.appendChild(linkInvisivel);
          linkInvisivel.click();
          document.body.removeChild(linkInvisivel);
          console.log(\`%c[Sucesso] Abrindo chat para \${numeroLimpo} com mensagem pré-definida.\`, "color: #25D366; font-weight: bold;");
        };
      }
    `,
      )
      .catch(() => {});
  });

  view.webContents.loadURL(currentConfig.url);
  if (desktopId !== activeSessionId) {
    view.setBounds({
      x: -10000,
      y: -10000,
      width: 100,
      height: 100,
    });
  }
  currentMainWindow.contentView.addChildView(view);
  sessionViews.set(desktopId, view);

  return view;
}

function applyVolumeToWebContents(webContents, volumePercent) {
  const fraction = Math.max(0, Math.min(1, (Number(volumePercent) || 0) / 100));
  webContents
    .executeJavaScript(
      `
    (() => {
      window.__tuxchatInstanceVolume = ${fraction};
      document.querySelectorAll('audio, video').forEach((el) => {
        try { el.volume = ${fraction}; } catch (_) {}
      });
      if (!window.__tuxchatAudioHooked) {
        window.__tuxchatAudioHooked = true;
        const origPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function(...args) {
          if (typeof window.__tuxchatInstanceVolume === 'number') {
            try { this.volume = window.__tuxchatInstanceVolume; } catch (_) {}
          }
          return origPlay.apply(this, args);
        };
      }
    })()
  `,
    )
    .catch(() => {});
}

function setAudioMutedForSession(desktopId, muted) {
  const view = sessionViews.get(desktopId);
  if (view && !view.webContents.isDestroyed()) {
    view.webContents.setAudioMuted(Boolean(muted));
  }
}

function setVolumeForSession(desktopId, volumePercent) {
  const view = sessionViews.get(desktopId);
  if (view && !view.webContents.isDestroyed()) {
    applyVolumeToWebContents(view.webContents, volumePercent);
  }
}

function switchSessionTab(desktopId) {
  if (!currentMainWindow || currentMainWindow.isDestroyed())
    return { ok: false };
  const targetId = desktopId || "tuxchat";
  activeSessionId = targetId;

  const targetView = getOrCreateSessionView(targetId);
  updateLayout();
  targetView.webContents.focus();

  try {
    const { getSessionColor, listAllSessions } = require("../sessions");
    const color = getSessionColor(targetId);
    titlebar.setColor(color);
    const sessions = listAllSessions();
    const active = sessions.find((s) => s.desktopId === targetId);
    if (active) {
      let name = active.profileName || "";
      const m = /^TuxChat\s*\((.+)\)$/i.exec(name);
      if (m) name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
      const title = name ? `TuxChat - ${name}` : "TuxChat";
      titlebar.setTitle(title);
    }
  } catch {
    // Session color lookup error
  }

  try {
    currentMainWindow.webContents.send("sessions:active-changed", targetId);
  } catch {
    // Window may be closing
  }

  return { ok: true, desktopId: targetId };
}

function removeSessionTab(desktopId) {
  if (sessionViews.has(desktopId)) {
    const sView = sessionViews.get(desktopId);
    try {
      if (currentMainWindow && !currentMainWindow.isDestroyed()) {
        currentMainWindow.contentView.removeChildView(sView);
      }
      sView.webContents.close();
    } catch (e) {
      console.error("Error closing session view:", e);
    }
    sessionViews.delete(desktopId);
  }
  if (activeSessionId === desktopId) {
    switchSessionTab("tuxchat");
  }
}

function createMainWindow(config) {
  session.defaultSession.setUserAgent(DESKTOP_CHROME_UA);

  // GNOME draws the native title bar and menu bar and apps can't color
  // them, so the window is frameless and draws its own bar (titlebar.html)
  // in the session color. The minimize/maximize/close buttons are still
  // Electron's own (titleBarOverlay), recolored to match.
  const initial = titlebar.currentColors();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: config.appName,
    icon: config.appIcon,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: initial.bg,
      symbolColor: initial.fg,
      height: titlebar.HEIGHT,
    },
    backgroundColor: initial.bg,
    webPreferences: {
      preload: path.join(__dirname, "titlebar-preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, "titlebar.html"));

  currentMainWindow = win;
  currentConfig = config;
  activeSessionId = "tuxchat";

  // Initialize main session view first
  getOrCreateSessionView("tuxchat");

  // Preload all registered sessions on startup so WhatsApp Web is immediately loaded for all accounts
  try {
    const { listAllSessions } = require("../sessions");
    const sessions = listAllSessions();
    for (const s of sessions) {
      if (s && s.desktopId && s.desktopId !== "tuxchat") {
        getOrCreateSessionView(s.desktopId);
      }
    }
  } catch (err) {
    console.error("Error preloading sessions:", err);
  }

  updateLayout();

  // Handle all resize and maximize events on Windows & Linux
  win.on("resize", updateLayout);
  win.on("maximize", updateLayout);
  win.on("unmaximize", updateLayout);
  win.on("restore", updateLayout);
  win.on("resized", updateLayout);

  win.on("enter-full-screen", () => {
    updateLayout();
    win.webContents.send("window:fullscreen", true);
  });
  win.on("leave-full-screen", () => {
    updateLayout();
    win.webContents.send("window:fullscreen", false);
  });

  win.on("focus", () => {
    const active = sessionViews.get(activeSessionId);
    if (active) active.webContents.focus();
  });

  try {
    const { listAllSessions } = require("../sessions");
    const all = listAllSessions();
    const mainS = all.find((s) => s.desktopId === "tuxchat") || all[0];
    let mainName = mainS && mainS.profileName ? mainS.profileName : "";
    const m = /^TuxChat\s*\((.+)\)$/i.exec(mainName);
    if (m) mainName = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const initialTitle = mainName ? `TuxChat - ${mainName}` : config.appName;
    titlebar.attach(win, initialTitle);
  } catch {
    titlebar.attach(win, config.appName);
  }

  win.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function getMainWindow() {
  return currentMainWindow;
}

function sendWhatsAppMessageToSession(desktopId, phone, text, autoSend = false) {
  const targetId = desktopId || "tuxchat";
  switchSessionTab(targetId);

  const view = getOrCreateSessionView(targetId);
  if (!view || !view.webContents) return;

  if (currentMainWindow && !currentMainWindow.isDestroyed()) {
    if (currentMainWindow.isMinimized()) currentMainWindow.restore();
    currentMainWindow.show();
    currentMainWindow.focus();
  }

  if (!phone) return;

  const cleanPhone = String(phone).replace(/\D/g, "");
  const fullPhone =
    (cleanPhone.length === 10 || cleanPhone.length === 11) &&
    !cleanPhone.startsWith("55")
      ? `55${cleanPhone}`
      : cleanPhone;
  const encodedText = encodeURIComponent(text || "");
  const targetWebUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  const shouldAutoSend = Boolean(autoSend && text && text.trim().length > 0);

  const jsCode = `
    (function() {
      try {
        const linkInvisivel = document.createElement('a');
        linkInvisivel.setAttribute('href', ${JSON.stringify(targetWebUrl)});
        linkInvisivel.setAttribute('style', 'display:none;');
        document.body.appendChild(linkInvisivel);
        linkInvisivel.click();
        document.body.removeChild(linkInvisivel);
      } catch (e) {
        console.error("Erro ao despachar chat no WhatsApp Web:", e);
      }

      if (${shouldAutoSend}) {
        let attempts = 0;
        const maxAttempts = 60;
        const checkInterval = setInterval(() => {
          attempts++;
          try {
            const sendIcon = document.querySelector(
              'footer span[data-icon="send"], footer span[data-icon="send-light"], footer span[data-icon="wds-ic-send-filled"], span[data-icon="send"]'
            );
            const sendBtn = sendIcon ? sendIcon.closest('button') : null;
            if (sendBtn) {
              sendBtn.click();
              clearInterval(checkInterval);
              return;
            }

            const ariaBtn = document.querySelector(
              'footer button[aria-label="Enviar"], footer button[aria-label="Send"], footer button[aria-label="enviar"], footer button[data-tab="11"]'
            );
            if (ariaBtn) {
              ariaBtn.click();
              clearInterval(checkInterval);
              return;
            }

            const chatInput = document.querySelector(
              'footer div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]'
            );
            if (chatInput && chatInput.textContent && chatInput.textContent.trim().length > 0) {
              chatInput.focus();
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
              });
              chatInput.dispatchEvent(enterEvent);
              clearInterval(checkInterval);
              return;
            }
          } catch (err) {
            console.error("Erro no auto-send do TuxChat:", err);
          }

          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
          }
        }, 300);
      }
    })();
  `;

  if (view.webContents.isLoading()) {
    view.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        if (!view.webContents.isDestroyed()) {
          view.webContents.executeJavaScript(jsCode).catch(() => {});
        }
      }, 700);
    });
  } else {
    view.webContents.executeJavaScript(jsCode).catch(() => {});
  }
}

module.exports = {
  createMainWindow,
  getMainWindow,
  getWhatsAppContents,
  switchSessionTab,
  removeSessionTab,
  getActiveSessionId,
  updateLayout,
  setAudioMutedForSession,
  setVolumeForSession,
  sendWhatsAppMessageToSession,
  getLoadedSessionIds: () => Array.from(sessionViews.keys()),
};
