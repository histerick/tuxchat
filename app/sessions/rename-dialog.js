'use strict';

const nameInput = document.getElementById('name');
const errorEl = document.getElementById('error');
const cancelBtn = document.getElementById('cancel');
const confirmBtn = document.getElementById('confirm');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

window.renameSessionDialog.getCurrent().then(({ profileName, canRename }) => {
  if (!canRename) {
    nameInput.disabled = true;
    confirmBtn.disabled = true;
    showError('La sesión principal no se puede renombrar desde acá.');
    return;
  }
  nameInput.value = profileName;
  nameInput.select();
});

cancelBtn.addEventListener('click', () => window.close());

async function submit() {
  const name = nameInput.value.trim();
  if (!name) {
    showError('Escribí un nombre para la sesión.');
    return;
  }

  errorEl.hidden = true;
  confirmBtn.disabled = true;
  nameInput.disabled = true;

  const result = await window.renameSessionDialog.rename(name);
  if (!result.ok) {
    showError(result.error);
    confirmBtn.disabled = false;
    nameInput.disabled = false;
    return;
  }

  window.close();
}

confirmBtn.addEventListener('click', submit);
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submit();
});
