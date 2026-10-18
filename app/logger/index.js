'use strict';

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');

// Launched from the dock or by the deep-link router, stdout/stderr go
// nowhere: GNOME doesn't keep them in the journal, so every
// console.error() in the app vanished unless it was started from a
// terminal. Each process mirrors its console into a file under its own
// userData dir instead — one per session, plus the router's own — so a
// failure can be looked at after the fact and attached to a bug report.
//
// Only what this process's JavaScript logs ends up here. Chromium's own
// native messages (GPU, sandbox) still only reach stderr.

// Past this, the file is moved to tuxchat.log.1 (replacing the previous
// one) and a fresh one starts: two files of history at most, per process.
const MAX_BYTES = 1024 * 1024;

let logFile = null;
let size = 0;

function rotate() {
  try {
    fs.renameSync(logFile, `${logFile}.1`);
  } catch {
    // Nothing to rotate yet.
  }
  size = 0;
}

function write(level, args) {
  if (!logFile) return;
  const line = `${new Date().toISOString()} [${level}] ${util.format(...args)}\n`;
  const bytes = Buffer.byteLength(line);
  try {
    if (size + bytes > MAX_BYTES) rotate();
    fs.appendFileSync(logFile, line);
    size += bytes;
  } catch {
    // Logging must never be what breaks the app.
  }
}

function logPath() {
  return logFile;
}

// Called once per process, after its userData path is final (the router
// moves its own; see app/index.js). label tells the processes apart when
// reading a log: the session's name, or "router".
function initLogger(label) {
  logFile = path.join(app.getPath('userData'), 'tuxchat.log');
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    size = fs.statSync(logFile).size;
  } catch {
    size = 0;
  }

  for (const level of ['error', 'warn', 'info', 'log']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      write(level, args);
    };
  }

  // A crashed renderer (WhatsApp's page, a dialog) or helper process
  // otherwise leaves no trace either.
  app.on('render-process-gone', (_event, _contents, details) => {
    console.error('Proceso de página terminado:', details.reason, `(código ${details.exitCode})`);
  });
  app.on('child-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return;
    console.error(`Proceso ${details.type} terminado:`, details.reason, `(código ${details.exitCode})`);
  });

  console.info(`TuxChat ${app.getVersion()} (${label}), pid ${process.pid}`);
}

module.exports = { initLogger, logPath };
