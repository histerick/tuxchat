'use strict';

const { app, BrowserWindow, Menu, WebContentsView, clipboard, session, shell } = require('electron');
const path = require('node:path');
const { t } = require('../i18n');
const { isWhatsAppLink, translateToWebUrl } = require('../deepLinks/translate');
const titlebar = require('./titlebar');

// WhatsApp Web rejects Electron's default UA ("... Electron/44.4.3 ...")
// as an unsupported browser and asks to "update Chrome". This strips the
// Electron token and reports the real Chromium version underneath instead
// of a fake one, which is enough to pass the check.
const DESKTOP_CHROME_UA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

// Schemes safe to hand to the desktop (xdg-open). Anything else — file:,
// javascript:, blob:, custom app schemes — is dropped, since a chat
// message is untrusted input.
const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function openExternally(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!EXTERNAL_SCHEMES.has(parsed.protocol)) return;
  shell.openExternal(parsed.href).catch((err) => {
    console.error('No se pudo abrir el enlace en el navegador:', err);
  });
}

// WhatsApp links inside a chat (wa.me, api.whatsapp.com/send,
// whatsapp://) open that chat right here, in this same session. Sent to
// the browser like any other link, they bounced back as whatsapp:// to
// the router and its picker, opening the link a second time — found by
// Pedro Henrique (@pedruhb) in PR #1.
function openInSession(url) {
  const webUrl = isWhatsAppLink(url) && translateToWebUrl(url);
  if (!webUrl) return false;
  openChat(webUrl);
  return true;
}

// Links in chats (Zoom, Meet, anything with target="_blank") would
// otherwise open as a bare Electron popup sharing this session. Send them
// to the user's default browser instead — which, if it's already running,
// just gets a new tab in its existing window.
function routeExternalLinks(contents, appUrl) {
  const appOrigin = new URL(appUrl).origin;

  contents.setWindowOpenHandler(({ url }) => {
    if (!openInSession(url)) openExternally(url);
    return { action: 'deny' };
  });

  // Plain same-window navigations away from WhatsApp Web (a link without
  // target="_blank") would replace the whole app with the external page.
  contents.on('will-navigate', (event, url) => {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      return;
    }
    if (origin === appOrigin) return;
    event.preventDefault();
    if (!openInSession(url)) openExternally(url);
  });
}

// Electron ships no context menu at all, so right-clicking a link in a
// chat (a Zoom/Meet invite, say) did nothing. Copying it lets the user
// paste it wherever they want — another browser, a calendar, the Zoom
// app — instead of only ever opening it in the default browser.
function addLinkContextMenu(win, contents) {
  contents.on('context-menu', (_event, params) => {
    if (!params.linkURL) return;
    Menu.buildFromTemplate([
      { label: t('contextMenu.copyLink'), click: () => clipboard.writeText(params.linkURL) },
      { label: t('contextMenu.openLink'), click: () => openExternally(params.linkURL) },
    ]).popup({ window: win });
  });
}

let whatsappContents = null;

// Everything that talks to WhatsApp Web itself (deep links, reload, zoom,
// devtools) goes through this: the window's own webContents is now the
// title bar, not the page.
function getWhatsAppContents() {
  return whatsappContents;
}

// Opens a web.whatsapp.com/send URL (see deepLinks/translate) in this
// session. loadURL() reloads all of WhatsApp Web, which takes a while;
// clicking a link to it from inside the page lets WhatsApp's own router
// open the chat instead, as PR #1 proposed. If WhatsApp ever stops
// handling that click, it's just an ordinary same-origin navigation, so
// it still lands in the right chat, only with the full reload. The URL
// goes in through JSON.stringify, never pasted into the script by hand:
// its text comes from a link someone else wrote. While the page is
// still loading there's no router to click through yet.
function openChat(webUrl) {
  const contents = whatsappContents;
  if (!contents) return;
  if (contents.isLoading() || !contents.getURL().startsWith('https://web.whatsapp.com/')) {
    contents.loadURL(webUrl);
    return;
  }
  const script = `(() => {
    const link = document.createElement('a');
    link.href = ${JSON.stringify(webUrl)};
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  })();`;
  contents.executeJavaScript(script).catch(() => contents.loadURL(webUrl));
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
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: initial.bg, symbolColor: initial.fg, height: titlebar.HEIGHT },
    backgroundColor: initial.bg,
    webPreferences: {
      preload: path.join(__dirname, 'titlebar-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'titlebar.html'));

  // WhatsApp Web lives in its own view below the bar, in the default
  // session like before, so logins, permissions and screen sharing are
  // unaffected.
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '..', 'browser', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  whatsappContents = view.webContents;
  win.contentView.addChildView(view);

  // Fullscreen hands the whole screen to WhatsApp: the bar's job (title,
  // menus, window buttons) doesn't apply there.
  //
  // Sized from getBounds(), not getContentSize(): the window is frameless,
  // so both are the same, but under X11 minimizing fires a resize with a
  // shrunken size and the resize on restore arrives while getContentSize()
  // still reports that stale size, leaving WhatsApp short of the window's
  // right and bottom edges.
  const layout = () => {
    const { width, height } = win.getBounds();
    const top = win.isFullScreen() ? 0 : titlebar.HEIGHT;
    view.setBounds({ x: 0, y: top, width, height: height - top });
  };
  layout();
  win.on('resize', layout);
  win.on('enter-full-screen', layout);
  win.on('leave-full-screen', layout);

  // Keystrokes should land in WhatsApp, not in the bar, whenever the
  // window is brought forward.
  win.on('focus', () => view.webContents.focus());

  view.webContents.setUserAgent(DESKTOP_CHROME_UA);
  routeExternalLinks(view.webContents, config.url);
  addLinkContextMenu(win, view.webContents);
  view.webContents.loadURL(config.url);

  titlebar.attach(win, config.appName);

  // Electron syncs the window title to the loaded page's document.title by
  // default — now the bar's page — which would silently overwrite our
  // profile name and defeat the point of being able to tell sessions
  // apart in the dock hover preview / Alt-Tab. Keep our own title pinned.
  win.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Hide to tray instead of quitting: WhatsApp Web needs to stay loaded
  // in the background to keep receiving calls/messages, same as the
  // official desktop client's behavior.
  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

module.exports = { createMainWindow, getWhatsAppContents, openChat };
