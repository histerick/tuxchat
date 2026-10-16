const menusEl = document.getElementById('menus');
const titleEl = document.getElementById('title');

function render({ title, bg, fg, menus }) {
  document.documentElement.style.setProperty('--bg', bg);
  document.documentElement.style.setProperty('--fg', fg);
  titleEl.textContent = title;

  if (menusEl.children.length) return;
  for (const { id, label } of menus) {
    const button = document.createElement('button');
    button.textContent = label;
    button.setAttribute('aria-haspopup', 'menu');
    button.addEventListener('click', () => {
      // Drops the menu right under its button, like a native menu bar.
      const rect = button.getBoundingClientRect();
      window.titlebar.openMenu(id, Math.round(rect.left), Math.round(rect.bottom));
    });
    menusEl.appendChild(button);
  }
}

window.titlebar.get().then(render);
window.titlebar.onState(render);
