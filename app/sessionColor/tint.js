'use strict';

const { nativeImage } = require('electron');

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mid-lightness of the icon's green background gradient (#27d27d at the
// top-left down to #078b70): a pixel at this lightness lands exactly on
// the session color, lighter/darker ones keep the same relative shift,
// so the gradient survives the recolor.
const BASE_LIGHTNESS = 0.4;

// Recolors only the icon's green background (hue ~140-175, clearly
// saturated). The penguin is dark navy, white and yellow/orange, all
// outside that range, so it stays untouched. Anti-aliased edge pixels are
// shifted by the same rule and blend in.
function tintIcon(iconPath, color) {
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) return image;
  const { width, height } = image.getSize();
  // Skia's native pixel order on Linux/x86: B, G, R, A.
  const pixels = image.toBitmap();
  const [th, ts, tl] = rgbToHsl(...hexToRgb(color));

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(pixels[i + 2], pixels[i + 1], pixels[i]);
    if (h < 110 || h > 190 || s < 0.25) continue;
    const newL = Math.min(0.92, Math.max(0.08, tl + (l - BASE_LIGHTNESS)));
    const [r, g, b] = hslToRgb(th, Math.min(1, ts * (s / 0.7)), newL);
    pixels[i] = b;
    pixels[i + 1] = g;
    pixels[i + 2] = r;
  }

  return nativeImage.createFromBitmap(pixels, { width, height });
}

module.exports = { tintIcon };
