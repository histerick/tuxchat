'use strict';

const { ipcMain, nativeTheme } = require('electron');
const { t } = require('../i18n');

const HEIGHT = 38;

// No session color: close to GNOME's own Adwaita header bars, so an
// uncolored session still looks at home next to native apps.
const NEUTRAL = {
  dark: { bg: '#303030', fg: '#ffffff' },
  light: { bg: '#ebebeb', fg: '#1f1f1f' },
};

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// The palette's pure colors are far too loud for a whole bar and clash
// with either theme. Same hue, toned to fit: a deep shade under a dark
// theme, a pale tint under a light one, each with text that clears WCAG
// AAA (7:1) for every palette color — checked when the palette was
// chosen (lowest: yellow on dark, 7.7:1).
function barColors(color, dark) {
  if (!color) return dark ? NEUTRAL.dark : NEUTRAL.light;
  const [h, s] = hexToHsl(color);
  return dark
    ? { bg: hslToHex(h, Math.min(s, 0.55), 0.24), fg: '#ffffff' }
    : { bg: hslToHex(h, Math.min(s, 0.7), 0.85), fg: '#1f1f1f' };
}

const state = { win: null, title: '', color: null };

function currentColors() {
  return barColors(state.color, nativeTheme.shouldUseDarkColors);
}

function snapshot() {
  return {
    title: state.title,
    ...currentColors(),
    menus: [
      { id: 'file', label: t('menu.file') },
      { id: 'sessions', label: t('menu.sessions') },
      { id: 'view', label: t('menu.view') },
      { id: 'help', label: t('menu.help') },
    ],
  };
}

function push() {
  const { win } = state;
  if (!win || win.isDestroyed()) return;
  const data = snapshot();
  win.setTitleBarOverlay({ color: data.bg, symbolColor: data.fg, height: HEIGHT });
  win.setBackgroundColor(data.bg);
  win.webContents.send('titlebar:state', data);
}

function attach(win, title) {
  state.win = win;
  state.title = title;
  push();
}

function setTitle(title) {
  state.title = title;
  if (state.win) state.win.setTitle(title);
  push();
}

function setColor(color) {
  state.color = color;
  push();
}

// Follows the system theme live (GNOME's dark/light switch), not just at
// startup.
nativeTheme.on('updated', push);
ipcMain.handle('titlebar:get', () => snapshot());

module.exports = { HEIGHT, attach, setTitle, setColor, currentColors, barColors };
