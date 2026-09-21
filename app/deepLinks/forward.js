'use strict';

const { app } = require('electron');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { listDeletableSessions } = require('../sessions');

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

function forwardToSession(desktopId, whatsappUrl) {
  const launch = launchArgsFor(desktopId);
  if (!launch) return false;

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

  // execFile with an argv array, never a shell string: whatsappUrl comes
  // from an external link a user clicked, so it has to reach the child
  // process as a single opaque argument, not get shell-interpreted.
  const child = execFile(process.execPath, args, { detached: true, stdio: 'ignore' });
  child.unref();
  return true;
}

module.exports = { forwardToSession };
