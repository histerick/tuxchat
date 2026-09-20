'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { updateTrayName } = require('../tray');

// Each extra session is a full, separate Electron process (~150-300MB RAM
// each), so this cap is resource protection, not anti-spam. One constant,
// easy to bump if 4 turns out too tight.
const MAX_SESSIONS = 4;

// Mirrors WhatsApp's own group-name limit, so it reads as a familiar
// constraint in this app rather than an arbitrary one — and keeps names
// short enough to stay legible in the dock/tray at a glance.
const MAX_NAME_LENGTH = 25;

const HOME = app.getPath('home');
const APPLICATIONS_DIR = path.join(HOME, '.local', 'share', 'applications');
const LAUNCHERS_DIR = path.join(HOME, '.local', 'bin');
const ICONS_DIR = path.join(HOME, '.local', 'share', 'icons', 'hicolor', '512x512', 'apps');
const MAIN_ICON = path.join(__dirname, '..', '..', 'build', 'icon.png');

// Matches both the main profile's `tuxchat.desktop` (no suffix) and extra
// sessions' `tuxchat-<slug>.desktop`, same naming already used by hand for
// the "Trabajo" session.
const DESKTOP_RE = /^tuxchat(?:-(.+))?\.desktop$/;

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

// Shared by create and rename: catches empty names, names too long to stay
// legible in the dock/tray, and control characters that would otherwise
// get written verbatim into a `.desktop` file's Name= line.
function validateProfileName(profileName) {
  if (!profileName) {
    return 'Escribí un nombre para la sesión.';
  }
  if (/[\r\n]/.test(profileName)) {
    return 'El nombre no puede tener saltos de línea.';
  }
  if (profileName.length > MAX_NAME_LENGTH) {
    return `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  }
  return null;
}

function listSessionSlugs() {
  if (!fs.existsSync(APPLICATIONS_DIR)) return [];
  return fs
    .readdirSync(APPLICATIONS_DIR)
    .map((file) => DESKTOP_RE.exec(file))
    .filter(Boolean)
    .map((match) => match[1] || '');
}

function sessionStatus() {
  return { count: listSessionSlugs().length, max: MAX_SESSIONS };
}

function readProfileName(desktopPath) {
  try {
    const content = fs.readFileSync(desktopPath, 'utf8');
    const match = /^Name=TuxChat - (.+)$/m.exec(content);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// The main profile (slug '') is excluded on purpose: it isn't created by
// this dialog, so it shouldn't be deletable from it either.
function listDeletableSessions() {
  if (!fs.existsSync(APPLICATIONS_DIR)) return [];
  return fs
    .readdirSync(APPLICATIONS_DIR)
    .map((file) => DESKTOP_RE.exec(file))
    .filter((match) => match && match[1])
    .map((match) => {
      const slug = match[1];
      const desktopId = `tuxchat-${slug}`;
      const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
      return { desktopId, profileName: readProfileName(desktopPath) || slug };
    });
}

// Kills whatever is running against a profile, waits until nothing matches
// it any more, then wipes the profile directory. Runs detached in its own
// process so it survives even when it ends up killing its own caller
// (self-delete: a session removing itself from its own menu) — a JS
// setTimeout in the Electron process couldn't do that, since the process
// dies with it. Tested against the real failure mode this guards against:
// deleting a *running* session's data and killing it right after (instead
// of first) leaves Chromium a window to recreate Cache/Service
// Worker/Trust Tokens files in the profile dir before it dies, which is
// exactly the "residuo por privacidad" this is meant to avoid.
// TARGET_DIR travels via env, not argv, so this script's own command line
// never contains the pattern it searches for and can't self-match it.
const WIPE_HELPER_SCRIPT = `
PATTERN="--user-data-dir=$TARGET_DIR"
pkill -f -- "$PATTERN"
for _ in $(seq 1 100); do
  pgrep -f -- "$PATTERN" >/dev/null 2>&1 || break
  sleep 0.1
done
pkill -9 -f -- "$PATTERN" 2>/dev/null
[ -n "$TARGET_DIR" ] && rm -rf "$TARGET_DIR"
`;

function wipeUserDataDir(userDataDir) {
  const child = execFile('/bin/bash', ['-c', WIPE_HELPER_SCRIPT], {
    env: { ...process.env, TARGET_DIR: userDataDir },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function deleteSession(desktopId) {
  const match = /^tuxchat-(.+)$/.exec(desktopId || '');
  if (!match) {
    return { ok: false, error: 'Sesión inválida.' };
  }

  const launcherPath = path.join(LAUNCHERS_DIR, `${desktopId}-launcher.sh`);
  const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
  const iconPath = path.join(ICONS_DIR, `${desktopId}.png`);
  const userDataDir = path.join(HOME, '.config', desktopId);

  if (!fs.existsSync(desktopPath)) {
    return { ok: false, error: 'Esa sesión ya no existe.' };
  }

  try {
    // Static config files: nothing else writes to these at runtime, so
    // they're safe to remove immediately regardless of whether the
    // session is currently running.
    fs.rmSync(launcherPath, { force: true });
    fs.rmSync(desktopPath, { force: true });
    fs.rmSync(iconPath, { force: true });
  } catch (err) {
    return { ok: false, error: `No se pudo eliminar la sesión: ${err.message}` };
  }

  refreshDesktopCaches();
  wipeUserDataDir(userDataDir);

  return { ok: true };
}

function buildLauncherScript({ profileName, userDataDir, desktopId }) {
  const parts = [shQuote(process.execPath)];
  // Dev mode (unpackaged): the Electron binary needs the app dir as its
  // first argument, same as the hand-written launchers. A packaged build's
  // executable already knows its own app, so this is skipped there.
  if (!app.isPackaged) parts.push(shQuote(app.getAppPath()));
  parts.push('--ozone-platform=x11');
  parts.push(`--user-data-dir=${shQuote(userDataDir)}`);
  parts.push(`--class=${desktopId}`);
  parts.push(`--profile-name=${shQuote(profileName)}`);

  return `#!/bin/bash
# Sesión "${profileName}" de TuxChat, generada desde el menú
# "Sesiones > Añadir sesión...". Mismo patrón que las sesiones armadas a
# mano: --user-data-dir aísla cookies/localStorage, --class aísla el
# WM_CLASS para que el dock no la agrupe con otras sesiones.
exec ${parts.join(' \\\n  ')}
`;
}

function buildDesktopEntry({ profileName, launcherPath, desktopId, hasIcon }) {
  const lines = [
    '[Desktop Entry]',
    'Version=1.0',
    'Terminal=false',
    'Type=Application',
    `Name=TuxChat - ${profileName}`,
    `Comment=WhatsApp Web (sesión "${profileName}", proyecto TuxChat)`,
    `Exec=${launcherPath}`,
  ];
  if (hasIcon) lines.push(`Icon=${desktopId}`);
  lines.push(`StartupWMClass=${desktopId}`, 'Categories=Network;InstantMessaging;');
  return lines.join('\n') + '\n';
}

function refreshDesktopCaches() {
  // Best-effort only: a stale cache means the icon/launcher shows up a
  // little late, not that the session fails to work.
  execFile('update-desktop-database', [APPLICATIONS_DIR], () => {});
  execFile('gtk-update-icon-cache', ['-f', '-t', path.join(HOME, '.local', 'share', 'icons', 'hicolor')], () => {});
}

function launchSession(launcherPath) {
  const child = execFile('/bin/bash', [launcherPath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function createSession(rawName) {
  const profileName = (rawName || '').trim();
  const nameError = validateProfileName(profileName);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const slug = slugify(profileName);
  if (!slug) {
    return { ok: false, error: 'Ese nombre no genera un identificador válido, probá con otro.' };
  }

  const existing = listSessionSlugs();
  if (existing.includes(slug)) {
    return { ok: false, error: `Ya existe una sesión "${profileName}".` };
  }
  if (existing.length >= MAX_SESSIONS) {
    return { ok: false, error: `Límite de ${MAX_SESSIONS} sesiones alcanzado.` };
  }

  const desktopId = `tuxchat-${slug}`;
  const launcherPath = path.join(LAUNCHERS_DIR, `${desktopId}-launcher.sh`);
  const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
  const iconPath = path.join(ICONS_DIR, `${desktopId}.png`);
  const userDataDir = path.join(HOME, '.config', desktopId);

  try {
    fs.mkdirSync(LAUNCHERS_DIR, { recursive: true });
    fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });

    const hasIcon = fs.existsSync(MAIN_ICON);
    if (hasIcon) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
      fs.copyFileSync(MAIN_ICON, iconPath);
    }

    fs.writeFileSync(launcherPath, buildLauncherScript({ profileName, userDataDir, desktopId }));
    fs.chmodSync(launcherPath, 0o755);

    fs.writeFileSync(desktopPath, buildDesktopEntry({ profileName, launcherPath, desktopId, hasIcon }));
  } catch (err) {
    return { ok: false, error: `No se pudo crear la sesión: ${err.message}` };
  }

  refreshDesktopCaches();
  launchSession(launcherPath);

  return { ok: true, profileName, desktopId };
}

// Renaming only ever touches the *display* name (the .desktop Name= and
// the --profile-name a relaunch will show in the title/tray). desktopId,
// userDataDir, --class and the icon file stay exactly as they were, so
// there's no directory to move and no WhatsApp session data at risk —
// just the two small text files this same code already knows how to
// write for a new session.
function renameSession(desktopId, rawNewName) {
  const match = /^tuxchat-(.+)$/.exec(desktopId || '');
  if (!match) {
    return { ok: false, error: 'Sesión inválida.' };
  }

  const profileName = (rawNewName || '').trim();
  const nameError = validateProfileName(profileName);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const inUse = listDeletableSessions().some(
    (session) => session.desktopId !== desktopId && session.profileName === profileName
  );
  if (inUse) {
    return { ok: false, error: `Ya hay otra sesión llamada "${profileName}".` };
  }

  const launcherPath = path.join(LAUNCHERS_DIR, `${desktopId}-launcher.sh`);
  const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
  const iconPath = path.join(ICONS_DIR, `${desktopId}.png`);
  const userDataDir = path.join(HOME, '.config', desktopId);

  if (!fs.existsSync(desktopPath)) {
    return { ok: false, error: 'Esa sesión ya no existe.' };
  }

  try {
    fs.writeFileSync(launcherPath, buildLauncherScript({ profileName, userDataDir, desktopId }));
    fs.chmodSync(launcherPath, 0o755);
    fs.writeFileSync(
      desktopPath,
      buildDesktopEntry({ profileName, launcherPath, desktopId, hasIcon: fs.existsSync(iconPath) })
    );
  } catch (err) {
    return { ok: false, error: `No se pudo renombrar la sesión: ${err.message}` };
  }

  refreshDesktopCaches();

  return { ok: true, profileName, desktopId };
}

// Populated once, right after the main window/tray exist, so the IPC
// handler below (registered at module load, before either exists yet)
// knows which session it's running as and can update the *live* window
// title and tray label after a rename — the .desktop/launcher rewrite
// above only affects the *next* launch.
let selfContext = null;

function registerSelfContext(mainWindow, tray, profileName) {
  selfContext = { mainWindow, tray, profileName };
}

function canRenameSelf() {
  return Boolean(selfContext && selfContext.profileName);
}

ipcMain.handle('sessions:status', () => sessionStatus());
ipcMain.handle('sessions:create', (_event, name) => createSession(name));
ipcMain.handle('sessions:list-deletable', () => listDeletableSessions());
ipcMain.handle('sessions:delete', (_event, desktopId) => deleteSession(desktopId));
ipcMain.handle('sessions:current', () => ({
  profileName: selfContext ? selfContext.profileName : '',
  canRename: canRenameSelf(),
}));
ipcMain.handle('sessions:rename', (_event, newName) => {
  if (!canRenameSelf()) {
    return { ok: false, error: 'La sesión principal no se puede renombrar desde acá.' };
  }

  const desktopId = `tuxchat-${slugify(selfContext.profileName)}`;
  const result = renameSession(desktopId, newName);
  if (result.ok) {
    selfContext.profileName = result.profileName;
    const appName = `TuxChat - ${result.profileName}`;
    selfContext.mainWindow.setTitle(appName);
    updateTrayName(selfContext.tray, selfContext.mainWindow, appName);
  }
  return result;
});

function openAddSessionDialog() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Añadir sesión',
    webPreferences: {
      preload: path.join(__dirname, 'dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'dialog.html'));
  return win;
}

function openDeleteSessionDialog() {
  const win = new BrowserWindow({
    width: 460,
    height: 440,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Eliminar sesión',
    webPreferences: {
      preload: path.join(__dirname, 'delete-dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'delete-dialog.html'));
  return win;
}

function openRenameSessionDialog() {
  const win = new BrowserWindow({
    width: 400,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Renombrar sesión',
    webPreferences: {
      preload: path.join(__dirname, 'rename-dialog-preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'rename-dialog.html'));
  return win;
}

module.exports = {
  openAddSessionDialog,
  openDeleteSessionDialog,
  openRenameSessionDialog,
  sessionStatus,
  createSession,
  listDeletableSessions,
  deleteSession,
  renameSession,
  registerSelfContext,
  canRenameSelf,
  MAX_SESSIONS,
  MAX_NAME_LENGTH,
};
