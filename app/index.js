'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app, BrowserWindow, session } = require('electron');
const { getConfig } = require('./config');
const { createMainWindow } = require('./mainWindow');
const { registerPermissionHandlers } = require('./permissions');
const { registerScreenSharing } = require('./screenSharing');
const { createTray } = require('./tray');
const { buildMenu } = require('./menus');
const { registerSelfContext } = require('./sessions');
const { ensureRouterRegistered, extractDeepLinkArg, translateToWebUrl } = require('./deepLinks');
const { initUpdater } = require('./updater');

function isWaylandSession() {
  return process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY);
}

function hasNvidiaGpu() {
  try {
    return fs.existsSync('/proc/driver/nvidia/version') || fs.existsSync('/sys/module/nvidia');
  } catch {
    return false;
  }
}

// NVIDIA's driver has repeatedly shown broken Wayland/GPU-sandbox behavior
// for Chromium apps here — confirmed independently on two machines: either
// a hard crash ("Aw, Snap"), or, worse, the process runs fine but never
// maps a window at all, with nothing in the log to say why. XWayland via
// --ozone-platform=x11 is the known-good workaround, but only NVIDIA needs
// it — AMD/Intel's open Mesa drivers have solid native Wayland support, so
// forcing everyone onto X11 would just degrade their experience for
// nothing. commandLine.appendSwitch() alone isn't reliable enough for this
// specific bug (confirmed on both machines: the switch reaches child
// processes fine, the window still never maps without a *real* CLI
// argument), so this re-execs with the flag as actual argv instead.
const needsX11Relaunch =
  process.platform === 'linux' &&
  isWaylandSession() &&
  hasNvidiaGpu() &&
  !process.argv.includes('--ozone-platform=x11');

if (needsX11Relaunch) {
  // Not app.relaunch(): tested and confirmed unreliable here — it never
  // actually re-executes (relaunch is apparently tied to the normal quit
  // lifecycle, which app.exit() explicitly skips, and app.quit() didn't
  // fare any better either). A plain detached child process does exactly
  // what's needed and is easy to reason about.
  const child = spawn(process.execPath, process.argv.slice(1).concat('--ozone-platform=x11'), {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  app.exit(0);
} else if (process.argv.includes('--tuxchat-deep-link-router')) {
  // A whatsapp:// link was handed to the router .desktop entry, not to a
  // real WhatsApp session — see deepLinks/router-install.js. This process
  // never opens the app's own window; it only decides which session
  // should get the link, forwards it there, and exits.
  //
  // Dedicated userData dir: without this, Electron falls back to its
  // default (derived from package.json's name, lowercase "tuxchat") and
  // creates a stray profile directory — confirmed happening live on
  // 2026-09-21. It must never point at a real session's own --user-data-dir
  // (main or extra), since that session's own process may be running and
  // actively using its profile's SQLite/LevelDB files concurrently.
  // Underscore, not hyphen — same reasoning as ROUTER_DESKTOP_ID: a real
  // session named "Router" would slugify to desktopId "tuxchat-router"
  // and its --user-data-dir would collide with this one otherwise.
  app.setPath('userData', path.join(app.getPath('home'), '.config', 'tuxchat_router'));
  app
    .whenReady()
    .then(() => require('./router').run(process.argv))
    .catch((err) => {
      console.error('Fallo el router de enlaces de TuxChat:', err);
      app.exit(1);
    });
} else {
  const config = getConfig();

  // A whatsapp:// link forwarded from the router (see deepLinks/forward.js)
  // arrives as a plain argv item, same on cold start as in second-instance
  // below. Pre-seeding config.url here means a cold-started session opens
  // straight into the right chat instead of the default inbox.
  const initialDeepLink = extractDeepLinkArg(process.argv);
  if (initialDeepLink) {
    const translated = translateToWebUrl(initialDeepLink);
    if (translated) config.url = translated;
  }

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
    app.on('second-instance', (_event, argv) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;

      const deepLink = extractDeepLinkArg(argv);
      if (deepLink) {
        const translated = translateToWebUrl(deepLink);
        if (translated) win.loadURL(translated);
      }

      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
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
      ensureRouterRegistered();
      initUpdater(config);
    }).catch((err) => {
      // Without this, a thrown error here becomes a silent unhandled
      // promise rejection — the window can still open (created earlier in
      // the chain) while menu/tray/session setup quietly never finishes,
      // with nothing in the UI hinting that anything went wrong. Exactly
      // what happened with the missing-icon bug this guards against.
      console.error('Fallo al inicializar TuxChat:', err);
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }
}
