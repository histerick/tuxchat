const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].changelogDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('close').textContent = L.close;

window.changelogDialog.onNotes(({ version, releaseName, releaseNotes }) => {
  document.getElementById('heading').textContent = L.heading(releaseName || version);
  document.getElementById('subheading').textContent = L.subheading;
  // textContent, not innerHTML: release notes come from GitHub release
  // bodies (markdown), not HTML meant for rendering — treated as plain text.
  document.getElementById('notes').textContent = releaseNotes && releaseNotes.trim() ? releaseNotes : L.noNotes;
});

document.getElementById('close').addEventListener('click', () => window.close());
