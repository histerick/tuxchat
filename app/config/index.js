'use strict';

const path = require('node:path');

// --user-data-dir is a native Chromium switch: Electron honors it
// automatically before app is ready. --class is parsed below too, since
// Electron does *not* apply it to the window's WM_CLASS on its own (see
// app/index.js).
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
    wmClass: args['class'] || null,
    appName: profileName ? `TuxChat - ${profileName}` : 'TuxChat',
    appIcon: args['app-icon'] || path.join(__dirname, '..', '..', 'build', 'icon.png'),
    url: args['url'] || 'https://web.whatsapp.com',
    // No default here on purpose: forcing x11 for everyone would degrade
    // Wayland-native AMD/Intel users who don't need it. app/index.js
    // decides whether to force it (NVIDIA + Wayland only) before this
    // even runs, and passes it as a real --ozone-platform flag when it
    // does — this just picks that up if present.
    ozonePlatform: args['ozone-platform'] || null,
  };
}

module.exports = { getConfig, parseArgs };
