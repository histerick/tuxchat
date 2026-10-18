const REQUESTED_LOCALE = new URLSearchParams(location.search).get('locale');
const LOCALE = ['es', 'pt'].includes(REQUESTED_LOCALE) ? REQUESTED_LOCALE : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].colorDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;
document.getElementById('hint').textContent = L.hint;
document.getElementById('close').textContent = L.close;

const swatchesEl = document.getElementById('swatches');

function markSelected(color) {
  for (const el of swatchesEl.children) {
    el.setAttribute('aria-checked', String(el.dataset.color === (color || '')));
  }
}

// Applied live on click: the strip on the main window changes right away,
// so there's nothing to confirm — Close just dismisses the dialog.
function addSwatch(color, label) {
  const el = document.createElement('button');
  el.className = color ? 'swatch' : 'swatch none';
  el.dataset.color = color || '';
  el.setAttribute('role', 'radio');
  el.title = label;
  el.setAttribute('aria-label', label);
  if (color) el.style.background = color;
  el.addEventListener('click', async () => {
    const result = await window.sessionColorDialog.set(color);
    markSelected(result.color);
  });
  swatchesEl.appendChild(el);
}

window.sessionColorDialog.get().then(({ color, palette }) => {
  addSwatch(null, L.none);
  for (const value of palette) addSwatch(value, value);
  markSelected(color);
});

document.getElementById('close').addEventListener('click', () => window.close());
