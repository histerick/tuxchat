'use strict';

const { app } = require('electron');
const { es, en } = require('./strings');

// US English by default; Latin American Spanish only when the OS locale
// itself is Spanish. Anything else (fr, de, pt, ...) also falls back to
// English rather than guessing — matches how most desktop apps behave
// when they don't ship a translation for the exact system locale.
function detectLocale() {
  try {
    return app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

// Locale is resolved once per process and doesn't change at runtime (no
// in-app language switcher), so memoizing avoids re-parsing app.getLocale()
// on every t() call.
let cachedLocale = null;
function currentLocale() {
  if (!cachedLocale) cachedLocale = detectLocale();
  return cachedLocale;
}

function dict() {
  return currentLocale() === 'es' ? es : en;
}

// Dot-path lookup, e.g. t('menu.addSession') or, for parametrized strings,
// t('sessions.errors.tooLong', 25). Falls back to the path itself instead
// of throwing so a typo'd key shows up visibly instead of crashing a
// dialog.
function t(keyPath, ...args) {
  let value = dict();
  for (const part of keyPath.split('.')) {
    value = value && value[part];
  }
  if (typeof value === 'function') return value(...args);
  return value == null ? keyPath : value;
}

module.exports = { t, currentLocale };
