const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].linksSettingsDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;
document.getElementById('description').textContent = L.description;
document.getElementById('forget').textContent = L.forget;
document.getElementById('save').textContent = L.save;
document.getElementById('close').textContent = L.close;

const listEl = document.getElementById('list');
const currentEl = document.getElementById('current');
const saveBtn = document.getElementById('save');
const forgetBtn = document.getElementById('forget');
const closeBtn = document.getElementById('close');

let sessions = [];
let selected = null;
let saved = null;

function render() {
  listEl.innerHTML = '';
  for (const item of sessions) {
    const row = document.createElement('label');
    row.className = 'session-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'handler';
    radio.value = item.desktopId;
    radio.checked = item.desktopId === selected;
    radio.addEventListener('change', () => {
      selected = item.desktopId;
      saveBtn.disabled = selected === saved;
    });

    const name = document.createElement('span');
    name.textContent = item.profileName;

    row.appendChild(radio);
    row.appendChild(name);
    listEl.appendChild(row);
  }
}

async function load() {
  sessions = await window.deepLinksDialog.listSessions();
  saved = await window.deepLinksDialog.getHandler();
  selected = saved;

  const savedSession = sessions.find((item) => item.desktopId === saved);
  currentEl.textContent = savedSession ? L.savedSession(savedSession.profileName) : L.noSavedSession;

  saveBtn.disabled = true;
  forgetBtn.disabled = !saved;
  render();
}

saveBtn.addEventListener('click', async () => {
  if (!selected) return;
  await window.deepLinksDialog.setHandler(selected);
  await load();
});

forgetBtn.addEventListener('click', async () => {
  await window.deepLinksDialog.clearHandler();
  await load();
});

closeBtn.addEventListener('click', () => window.close());

load();
