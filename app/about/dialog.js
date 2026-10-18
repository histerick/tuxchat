const REQUESTED_LOCALE = new URLSearchParams(location.search).get('locale');
const LOCALE = ['es', 'pt'].includes(REQUESTED_LOCALE) ? REQUESTED_LOCALE : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].aboutDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('description').textContent = L.description;
document.getElementById('disclaimer').textContent = L.disclaimer;
document.getElementById('license').textContent = L.license;
document.getElementById('links-heading').textContent = L.linksHeading;
document.getElementById('link-repo').textContent = L.repo;
document.getElementById('link-issues').textContent = L.issues;
document.getElementById('link-releases').textContent = L.releases;
document.getElementById('link-website').textContent = L.website;
document.getElementById('credits-heading').textContent = L.creditsHeading;
document.getElementById('credit-pedruhb').textContent = L.creditPedruhb;
document.getElementById('tech-heading').textContent = L.techHeading;
document.getElementById('copy-info').textContent = L.copyInfo;
document.getElementById('check-updates').textContent = L.checkUpdates;
document.getElementById('close').textContent = L.close;

// Only names go to the main process, which maps them to its own fixed
// URLs (see about/index.js).
for (const el of document.querySelectorAll('[data-link]')) {
  el.addEventListener('click', () => window.aboutDialog.open(el.dataset.link));
}

const techEl = document.getElementById('tech');

function addTechRow(label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  techEl.appendChild(dt);
  techEl.appendChild(dd);
}

window.aboutDialog.info().then((info) => {
  // From app.getVersion() in the main process, never written by hand here.
  document.getElementById('version').textContent = L.version(info.version);
  addTechRow('Electron', info.electron);
  addTechRow('Chrome', info.chrome);
  addTechRow('Node', info.node);
  addTechRow(L.platform, info.platform);
  addTechRow(L.displayServer, info.displayServer);
});

const copyBtn = document.getElementById('copy-info');
copyBtn.addEventListener('click', async () => {
  await window.aboutDialog.copyInfo();
  copyBtn.textContent = L.copied;
  setTimeout(() => {
    copyBtn.textContent = L.copyInfo;
  }, 2000);
});

const updateBtn = document.getElementById('check-updates');
const updateStatusEl = document.getElementById('update-status');

const UPDATE_MESSAGES = {
  latest: () => L.upToDate,
  available: (result) => L.updateAvailable(result.version),
  releases: () => L.releasesOpened,
  error: () => L.updateError,
};

updateBtn.addEventListener('click', async () => {
  updateBtn.disabled = true;
  updateStatusEl.textContent = L.checking;
  const result = await window.aboutDialog.checkForUpdates();
  const message = UPDATE_MESSAGES[result.status] || UPDATE_MESSAGES.error;
  updateStatusEl.textContent = message(result);
  updateBtn.disabled = false;
});

document.getElementById('close').addEventListener('click', () => window.close());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.close();
});
