const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].deleteDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;
document.getElementById('description').textContent = L.description;
document.getElementById('empty').textContent = L.empty;
document.getElementById('select-mode').textContent = L.select;
document.getElementById('cancel-select').textContent = L.cancel;
document.getElementById('do-delete').textContent = L.delete;

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const errorEl = document.getElementById('error');
const selectModeBtn = document.getElementById('select-mode');
const cancelSelectBtn = document.getElementById('cancel-select');
const doDeleteBtn = document.getElementById('do-delete');

let sessions = [];
let selecting = false;

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

function checkedDesktopIds() {
  return Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.dataset.desktopId);
}

function renderList() {
  listEl.innerHTML = '';
  for (const item of sessions) {
    const row = document.createElement('div');
    row.className = 'session-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.hidden = !selecting;
    checkbox.dataset.desktopId = item.desktopId;
    checkbox.addEventListener('change', () => {
      doDeleteBtn.disabled = checkedDesktopIds().length === 0;
    });

    const name = document.createElement('span');
    name.textContent = item.profileName;

    row.appendChild(checkbox);
    row.appendChild(name);
    listEl.appendChild(row);
  }
}

function renderActions() {
  emptyEl.hidden = sessions.length > 0;
  selectModeBtn.hidden = selecting || sessions.length === 0;
  cancelSelectBtn.hidden = !selecting;
  doDeleteBtn.hidden = !selecting;
  if (selecting) doDeleteBtn.disabled = checkedDesktopIds().length === 0;
}

function render() {
  renderList();
  renderActions();
}

async function loadSessions() {
  sessions = await window.deleteSessionDialog.listDeletable();
  render();
}

selectModeBtn.addEventListener('click', () => {
  clearError();
  selecting = true;
  render();
});

cancelSelectBtn.addEventListener('click', () => {
  clearError();
  selecting = false;
  render();
});

doDeleteBtn.addEventListener('click', async () => {
  const desktopIds = checkedDesktopIds();
  if (desktopIds.length === 0) return;

  doDeleteBtn.disabled = true;

  const errors = [];
  for (const desktopId of desktopIds) {
    const result = await window.deleteSessionDialog.remove(desktopId);
    if (!result.ok) errors.push(result.error);
  }

  selecting = false;
  await loadSessions();

  if (errors.length > 0) showError(errors.join(' '));
});

loadSessions();
