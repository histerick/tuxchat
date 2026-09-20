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

// Electron passes requestingOrigin with a trailing slash to the permission
// check handler but not to the request handler — normalize through URL
// instead of comparing raw strings, or the trailing slash alone makes
// every check silently fail (mic/video/notifications all denied without
// any visible error).
function isAllowed(requestingOrigin, permission) {
  let origin;
  try {
    origin = new URL(requestingOrigin).origin;
  } catch {
    return false;
  }
  return origin === ALLOWED_ORIGIN && ALLOWED_PERMISSIONS.has(permission);
}

function registerPermissionHandlers(targetSession) {
  targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(isAllowed(webContents.getURL(), permission));
  });

  targetSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) =>
    isAllowed(requestingOrigin, permission)
  );
}

module.exports = { registerPermissionHandlers };
