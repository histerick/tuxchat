'use strict';

const REQUESTED_LOCALE = new URLSearchParams(location.search).get('locale');
const LOCALE = ['es', 'pt'].includes(REQUESTED_LOCALE) ? REQUESTED_LOCALE : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].screenPicker;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;

window.screenPicker.onSources((sources) => {
  const grid = document.getElementById('grid');
  for (const source of sources) {
    const button = document.createElement('button');
    button.className = 'source';

    // Built node by node, never via innerHTML: source.name is the title
    // of whatever window is open on the desktop, which any app (or a web
    // page's own <title>) controls, so it must only ever land as text.
    const img = document.createElement('img');
    img.src = source.thumbnail;
    img.alt = '';
    const name = document.createElement('span');
    name.textContent = source.name;
    button.appendChild(img);
    button.appendChild(name);

    button.addEventListener('click', () => window.screenPicker.select(source.id));
    grid.appendChild(button);
  }
});
