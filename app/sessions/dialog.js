const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].addDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('heading').textContent = L.heading;
document.getElementById('name').placeholder = L.namePlaceholder;
document.getElementById('success').textContent = L.success;
document.getElementById('cancel').textContent = L.cancel;
document.getElementById('create').textContent = L.create;

const nameInput = document.getElementById('name');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');
const countEl = document.getElementById('count');
const createBtn = document.getElementById('create');
const cancelBtn = document.getElementById('cancel');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

window.sessionDialog.getStatus().then(({ count, max }) => {
  countEl.textContent = L.count(count, max);
  if (count >= max) {
    nameInput.disabled = true;
    createBtn.disabled = true;
  }
});

async function submit() {
  const name = nameInput.value.trim();
  errorEl.hidden = true;
  createBtn.disabled = true;
  nameInput.disabled = true;

  const result = await window.sessionDialog.create(name);
  if (!result.ok) {
    showError(result.error);
    createBtn.disabled = false;
    nameInput.disabled = false;
    return;
  }

  successEl.hidden = false;
  setTimeout(() => window.close(), 800);
}

createBtn.addEventListener('click', submit);
cancelBtn.addEventListener('click', () => window.close());
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submit();
});
