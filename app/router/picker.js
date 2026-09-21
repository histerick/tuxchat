const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].linkPicker;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;
document.getElementById('remember-label').textContent = L.remember;
document.getElementById('open').textContent = L.open;

const listEl = document.getElementById('list');
const rememberEl = document.getElementById('remember');
const openBtn = document.getElementById('open');

let selected = null;

function render(sessions) {
  listEl.innerHTML = '';
  for (const item of sessions) {
    const row = document.createElement('label');
    row.className = 'session-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'session';
    radio.value = item.desktopId;
    radio.addEventListener('change', () => {
      selected = item.desktopId;
      openBtn.disabled = false;
    });

    const name = document.createElement('span');
    name.textContent = item.profileName;

    row.appendChild(radio);
    row.appendChild(name);
    listEl.appendChild(row);
  }
}

window.linkPicker.onInit((sessions) => render(sessions));

openBtn.addEventListener('click', async () => {
  if (!selected) return;
  openBtn.disabled = true;
  await window.linkPicker.choose(selected, rememberEl.checked);
});
