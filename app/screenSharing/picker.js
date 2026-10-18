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
    button.innerHTML = `<img src="${source.thumbnail}" alt=""><span>${source.name}</span>`;
    button.addEventListener('click', () => window.screenPicker.select(source.id));
    grid.appendChild(button);
  }
});
