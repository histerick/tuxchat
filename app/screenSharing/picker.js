'use strict';

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
