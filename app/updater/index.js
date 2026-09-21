'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const { currentLocale } = require('../i18n');

// electron-updater's Linux auto-download/auto-install only works for the
// AppImage target (it replaces the running AppImage file in place). The
// .deb target has no such feed — apt owns that install, and pushing a
// second update mechanism on top of it would just race the package
// manager. Silently doing nothing for .deb is the honest behavior here;
// there's no half-working middle ground worth building.
function isAppImage() {
  return Boolean(process.env.APPIMAGE);
}

function pendingUpdatePath() {
  return path.join(app.getPath('userData'), 'pending-update.json');
}

// GitHub release notes come back as a markdown string for a single
// release, or as a { version, note } array when electron-updater collapses
// several intermediate releases into one update. Flattened to one string
// either way, since the changelog window just displays plain text.
function normalizeReleaseNotes(releaseNotes) {
  if (!releaseNotes) return '';
  if (typeof releaseNotes === 'string') return releaseNotes;
  return releaseNotes.map((entry) => `${entry.version}\n${entry.note || ''}`).join('\n\n');
}

function openChangelogWindow({ version, releaseName, releaseNotes }) {
  const win = new BrowserWindow({
    width: 480,
    height: 520,
    resizable: true,
    minimizable: true,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'changelog-dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('updater:notes', { version, releaseName, releaseNotes });
  });
  win.loadFile(path.join(__dirname, 'changelog-dialog.html'), { query: { locale: currentLocale() } });
  return win;
}

// Runs once per real app launch (not the deep-link router, not a relaunch
// still mid-flight), right after the window/tray are up. Checks whether the
// update that was silently downloaded and installed on the *previous* quit
// matches what's actually running now, and if so shows the changelog
// exactly once — the file is removed as soon as it's read, so a second
// launch on the same version won't show it again.
function showChangelogIfJustUpdated() {
  const notesPath = pendingUpdatePath();
  let pending;
  try {
    pending = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
  } catch {
    return;
  }

  // Always remove it here, whether or not the version still matches:
  // a stale entry (e.g. the download was for a version that never actually
  // became the running one) shouldn't linger and pop up unexpectedly later.
  fs.rmSync(notesPath, { force: true });

  if (pending && pending.version === app.getVersion()) {
    openChangelogWindow(pending);
  }
}

function persistPendingUpdate(info) {
  const payload = {
    version: info.version,
    releaseName: info.releaseName || info.version,
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  };
  try {
    fs.mkdirSync(path.dirname(pendingUpdatePath()), { recursive: true });
    fs.writeFileSync(pendingUpdatePath(), JSON.stringify(payload));
  } catch (err) {
    console.error('TuxChat updater: no se pudo guardar la nota de la versión descargada:', err);
  }
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

function startBackgroundChecks() {
  autoUpdater.autoDownload = true;
  // Installs quietly the next time the app actually quits (tray "Salir" /
  // menu "Salir" / OS logout) — never interrupts an open chat window with
  // a forced restart.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', persistPendingUpdate);
  // Update checks are best-effort background noise: no network, GitHub
  // hiccup, or rate limit should ever surface to the user.
  autoUpdater.on('error', (err) => {
    console.error('TuxChat updater:', err && err.message ? err.message : err);
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, CHECK_INTERVAL_MS);
}

// config.profileName is '' only for the main profile (see app/config).
// Extra sessions are separate Electron processes launched from the same
// installed binary — running the updater in each of them would mean up to
// MAX_SESSIONS redundant downloads racing to write the same AppImage file.
function initUpdater(config) {
  if (!app.isPackaged || !isAppImage() || config.profileName !== '') return;

  showChangelogIfJustUpdated();
  startBackgroundChecks();
}

module.exports = { initUpdater };
