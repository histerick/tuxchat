'use strict';

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { refreshDesktopCaches } = require('../sessions');
const { t } = require('../i18n');

// Distinct from every session's own tuxchat[-<slug>].desktop: this one
// isn't a WhatsApp window at all, just the thing the system hands
// whatsapp:// links to. NoDisplay keeps it out of app grids/search — it's
// not something a user launches on purpose.
//
// Underscore, not hyphen: sessions/index.js's DESKTOP_RE
// (^tuxchat(?:-(.+))?\.desktop$) treats anything named tuxchat-<slug> as
// a real session to list/delete. tuxchat-router.desktop collided with
// that and showed up as a bogus "router" session in every picker —
// confirmed live on 2026-09-21. Keeping the router out of the
// tuxchat-<slug> namespace entirely avoids relying on both files staying
// in sync by convention.
const ROUTER_DESKTOP_ID = 'tuxchat_router';

function routerExecLine() {
  const parts = [process.execPath];
  // Dev mode needs the app dir as an explicit argument, same reasoning as
  // buildLauncherScript() in sessions/index.js. A packaged build's own
  // executable already knows its app.
  if (!app.isPackaged) parts.push(app.getAppPath());
  parts.push('--tuxchat-deep-link-router', '%u');
  return parts.join(' ');
}

function buildRouterDesktopEntry() {
  return (
    [
      '[Desktop Entry]',
      'Version=1.0',
      'Terminal=false',
      'Type=Application',
      `Name=${t('router.desktopName')}`,
      `Comment=${t('router.desktopComment')}`,
      `Exec=${routerExecLine()}`,
      'Icon=tuxchat',
      'NoDisplay=true',
      'MimeType=x-scheme-handler/whatsapp;',
      'Categories=Network;InstantMessaging;',
    ].join('\n') + '\n'
  );
}

// Idempotent and cheap enough to call on every normal startup: keeps the
// router self-healing (survives the .desktop being deleted, an update
// changing process.execPath, etc.) without needing a separate install
// step. Best-effort only — a failure here means deep links silently don't
// work yet, not that the app fails to start.
function ensureRouterRegistered() {
  const applicationsDir = path.join(app.getPath('home'), '.local', 'share', 'applications');
  const desktopPath = path.join(applicationsDir, `${ROUTER_DESKTOP_ID}.desktop`);

  try {
    fs.mkdirSync(applicationsDir, { recursive: true });
    fs.writeFileSync(desktopPath, buildRouterDesktopEntry());
  } catch {
    return;
  }

  refreshDesktopCaches();
  execFile('xdg-mime', ['default', `${ROUTER_DESKTOP_ID}.desktop`, 'x-scheme-handler/whatsapp'], () => {});
}

module.exports = { ensureRouterRegistered, ROUTER_DESKTOP_ID };
