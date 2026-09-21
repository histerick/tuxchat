'use strict';

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Shared across every profile (not scoped to any one --user-data-dir),
// since the whole point is remembering which *session* should handle an
// incoming link regardless of which one happens to be running when it
// arrives. Lives under ~/.local/share, same tree as the .desktop/icon
// files sessions/index.js already manages.
function stateFile() {
  return path.join(app.getPath('home'), '.local', 'share', 'tuxchat', 'deep-links.json');
}

function getRememberedHandler() {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    return data.desktopId || null;
  } catch {
    return null;
  }
}

function setRememberedHandler(desktopId) {
  const file = stateFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ desktopId }));
}

function clearRememberedHandler() {
  fs.rmSync(stateFile(), { force: true });
}

module.exports = { getRememberedHandler, setRememberedHandler, clearRememberedHandler };
