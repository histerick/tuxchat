'use strict';

const { app } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { listDeletableSessions } = require('../sessions');

// How long the router keeps an eye on a session it just launched (see
// watchLaunch below).
const WATCH_MS = 5000;

// Reuses the exact same launch shape sessions/index.js's buildLauncherScript
// generates, but spawned directly instead of via a persisted .sh file —
// the router isn't tied to any particular session's launcher existing on
// disk. Appending the whatsapp:// URL as an extra argv item is what makes
// this work whether the target session is already running or not:
// - Not running: this *is* the real launch, and app/index.js picks the
//   URL up from process.argv on cold start.
// - Already running: its own requestSingleInstanceLock() rejects this new
//   process, which triggers the *existing* instance's 'second-instance'
//   handler with this argv — Electron's built-in way to hand data to an
//   already-running instance, no custom IPC needed.
function launchArgsFor(desktopId) {
  if (!desktopId || desktopId === 'tuxchat') {
    return { userDataDir: null, profileName: '', windowClass: 'tuxchat' };
  }

  const session = listDeletableSessions().find((s) => s.desktopId === desktopId);
  if (!session) return null;

  return {
    userDataDir: path.join(app.getPath('home'), '.config', desktopId),
    profileName: session.profileName,
    windowClass: desktopId,
  };
}

// The launched session never reports back, so one that died on startup
// used to vanish without a trace: the link just never opened. Watched for
// a few seconds instead, an early failure lands in the router's log.
// Exiting 0 is the normal outcome when the session was already running —
// it hands the link to that instance and quits (see app/index.js).
function watchLaunch(child, desktopId) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.info(`La sesión ${desktopId} sigue abriéndose con el enlace.`);
      finish(true);
    }, WATCH_MS);
    function finish(ok) {
      clearTimeout(timer);
      child.removeAllListeners();
      child.unref();
      resolve(ok);
    }
    child.on('error', (err) => {
      console.error(`No se pudo lanzar la sesión ${desktopId}:`, err);
      finish(false);
    });
    child.on('exit', (code, signal) => {
      if (code === 0) {
        console.info(`Enlace entregado a la sesión ${desktopId}, que ya estaba abierta.`);
        finish(true);
        return;
      }
      console.error(`La sesión ${desktopId} terminó al arrancar (código ${code}, señal ${signal}).`);
      finish(false);
    });
  });
}

// Resolves once the launch looks settled (see watchLaunch), so the router
// stays alive until then instead of quitting right after spawning.
function forwardToSession(desktopId, whatsappUrl) {
  const launch = launchArgsFor(desktopId);
  if (!launch) {
    console.error(`No existe la sesión ${desktopId} para abrir el enlace.`);
    return Promise.resolve(false);
  }

  // Not process.execPath under an AppImage, same as buildLauncherScript():
  // that's the binary inside this router's own temporary mount. Run bare
  // like that, it misses the --no-sandbox the AppImage's AppRun adds, and
  // Chromium aborts on a chrome-sandbox that can't be setuid inside the
  // image — confirmed live on 2026-10-18: links picked for any session
  // never opened. The mount also goes away as soon as the router exits.
  // process.env.APPIMAGE goes through AppRun and mounts its own copy.
  const executable = process.env.APPIMAGE || process.execPath;

  const args = [];
  if (!app.isPackaged) args.push(app.getAppPath());
  // No --ozone-platform=x11 here on purpose: the spawned process runs the
  // same NVIDIA+Wayland self-detection as any normal launch (app/index.js)
  // and re-execs itself with it only if actually needed, same as forcing
  // it here would wrongly degrade AMD/Intel Wayland-native users.
  if (launch.userDataDir) args.push(`--user-data-dir=${launch.userDataDir}`);
  args.push(`--class=${launch.windowClass}`);
  if (launch.profileName) args.push(`--profile-name=${launch.profileName}`);
  args.push(whatsappUrl);

  // spawn with an argv array, never a shell string: whatsappUrl comes
  // from an external link a user clicked, so it has to reach the child
  // process as a single opaque argument, not get shell-interpreted.
  console.info(`Enviando el enlace a la sesión ${desktopId}.`);
  const child = spawn(executable, args, { detached: true, stdio: 'ignore' });
  return watchLaunch(child, desktopId);
}

module.exports = { forwardToSession };
