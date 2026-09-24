const LOCALE = new URLSearchParams(location.search).get('locale') === 'es' ? 'es' : 'en';
const L = window.TUXCHAT_STRINGS[LOCALE].changelogDialog;

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById('close').textContent = L.close;

// electron-updater's GitHub provider hands over release notes as the HTML
// GitHub rendered from the release's markdown, not the markdown itself —
// shown as plain text, that meant raw <p>/<ul> tags in the window. The
// HTML is still untrusted remote input, so it's never assigned to
// innerHTML: it's parsed into an inert document (DOMParser doesn't run
// scripts or load anything) and rebuilt from this allowlist, without a
// single attribute. Other elements keep their text but lose the tag;
// DROPPED ones lose their content too.
const ALLOWED = new Set([
  'P',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'B',
  'EM',
  'I',
  'CODE',
  'PRE',
  'HR',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);
const DROPPED = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT']);

function rebuild(source, target) {
  for (const node of source.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (DROPPED.has(node.tagName)) continue;
      // GitHub turns every line break inside a markdown paragraph into a
      // <br>, so hard-wrapped notes would come out chopped mid-sentence.
      if (node.tagName === 'BR') {
        target.appendChild(document.createTextNode(' '));
      } else if (ALLOWED.has(node.tagName)) {
        rebuild(node, target.appendChild(document.createElement(node.tagName)));
      } else {
        // Includes <a>: its text stays, but a link here would navigate
        // this dialog window itself rather than open a browser.
        rebuild(node, target);
      }
    }
  }
}

function renderNotes(container, notes) {
  if (/<\/?[a-z][^>]*>/i.test(notes)) {
    const parsed = new DOMParser().parseFromString(notes, 'text/html');
    rebuild(parsed.body, container);
  } else {
    // Plain text/markdown (older pending-update files, or a provider that
    // doesn't pre-render): keep its own line breaks.
    container.classList.add('plain');
    container.textContent = notes;
  }
}

window.changelogDialog.onNotes(({ version, releaseName, releaseNotes }) => {
  // The version, not releaseName: release titles already read "TuxChat
  // vX.Y.Z", which made the heading say "TuxChat updated to TuxChat …".
  document.getElementById('heading').textContent = L.heading(version ? `v${version}` : releaseName);
  document.getElementById('subheading').textContent = L.subheading;
  const notes = document.getElementById('notes');
  if (releaseNotes && releaseNotes.trim()) renderNotes(notes, releaseNotes);
  else notes.textContent = L.noNotes;
});

document.getElementById('close').addEventListener('click', () => window.close());
