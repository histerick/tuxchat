'use strict';

const ALLOWED_ORIGIN = 'https://web.whatsapp.com';

// 'media' covers both getUserMedia (camera/mic for calls) and
// getDisplayMedia (screen share). Without granting it explicitly here,
// Electron's default handler denies it and calls fail silently in the UI.
const ALLOWED_PERMISSIONS = new Set([
  'media',
  'notifications',
  'clipboard-read',
  'clipboard-sanitized-write',
]);

function isAllowed(requestingOrigin, permission) {
  return requestingOrigin === ALLOWED_ORIGIN && ALLOWED_PERMISSIONS.has(permission);
}

function registerPermissionHandlers(targetSession) {
  targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingOrigin = new URL(webContents.getURL()).origin;
    callback(isAllowed(requestingOrigin, permission));
  });

  targetSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) =>
    isAllowed(requestingOrigin, permission)
  );
}

module.exports = { registerPermissionHandlers };
