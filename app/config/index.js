'use strict';

const path = require('node:path');

// --user-data-dir and --class are native Chromium/X11 switches: Electron
// honors them automatically before app is ready, so they don't need
// custom parsing here. Only our own flags are parsed below.
function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

function getConfig() {
  const args = parseArgs(process.argv.slice(1));
  const profileName = args['profile-name'] || '';

  return {
    profileName,
    appName: profileName ? `TuxChat - ${profileName}` : 'TuxChat',
    appIcon: args['app-icon'] || path.join(__dirname, '..', '..', 'build', 'icon.png'),
    url: args['url'] || 'https://web.whatsapp.com',
    // Validated on this machine: NVIDIA + Wayland crashes Chromium-based
    // apps ("Aw, Snap"); x11 is the known-good default here.
    ozonePlatform: args['ozone-platform'] || 'x11',
  };
}

module.exports = { getConfig, parseArgs };
