"use strict";

const urlParams = new URLSearchParams(window.location.search);
const localeParam = urlParams.get("locale") || "";
const desktopIdParam = urlParams.get("desktopId") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "en";
const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].colorDialog) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.colorDialog) || {
    windowTitle: "Session color",
    heading: "Session color",
    hint: "Tints the title bar and the icon, to tell this account apart from the others.",
    none: "No color",
    selectedColor: "Selected color:",
    customColor: "Custom color",
    customColorDesc: "Color picker or HEX code",
    close: "Close",
  };

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById("heading").textContent = L.heading;
document.getElementById("hint").textContent = L.hint;
document.getElementById("close").textContent = L.close;

const statusLabelEl = document.getElementById("color-status-label");
if (statusLabelEl)
  statusLabelEl.textContent = L.selectedColor || "Cor selecionada:";

const swatchesLabelEl = document.getElementById("swatches-label");
if (swatchesLabelEl) {
  swatchesLabelEl.textContent =
    LOCALE === "en"
      ? "Color palette"
      : LOCALE === "es"
        ? "Paleta de colores"
        : "Paleta de cores";
}

const customTitleEl = document.getElementById("custom-color-title");
if (customTitleEl)
  customTitleEl.textContent = L.customColor || "Cor personalizada";

const customDescEl = document.getElementById("custom-color-desc");
if (customDescEl) {
  customDescEl.textContent =
    L.customColorDesc ||
    (LOCALE === "en"
      ? "Color picker or HEX code"
      : LOCALE === "es"
        ? "Selector de color o código HEX"
        : "Seletor de cores ou código HEX");
}

const modalCloseBtn = document.getElementById("modal-close-btn");
const closeBtn = document.getElementById("close");
const swatchesEl = document.getElementById("swatches");
const colorDotEl = document.getElementById("color-dot");
const colorNameEl = document.getElementById("color-name");

const nativePicker = document.getElementById("native-color-picker");
const customPreview = document.getElementById("custom-color-preview");
const hexInput = document.getElementById("hex-input");
const customCard = document.getElementById("custom-color-card");

let currentPalette = [];
let currentColor = null;

function markSelected(color) {
  currentColor = color ? color.toLowerCase() : null;
  const isPreset = currentPalette.some((p) => p.toLowerCase() === currentColor);

  for (const el of swatchesEl.children) {
    const swatchColor = el.dataset.color ? el.dataset.color.toLowerCase() : "";
    el.setAttribute(
      "aria-checked",
      String(swatchColor === (currentColor || "")),
    );
  }

  if (customCard) {
    customCard.classList.toggle("active", Boolean(currentColor && !isPreset));
  }

  if (currentColor) {
    colorDotEl.style.background = currentColor;
    colorNameEl.textContent = currentColor.toUpperCase();
    if (customPreview) customPreview.style.background = currentColor;
    if (nativePicker) nativePicker.value = currentColor;
    if (hexInput && document.activeElement !== hexInput) {
      hexInput.value = currentColor.replace("#", "").toUpperCase();
    }
  } else {
    colorDotEl.style.background = "#8696a0";
    colorNameEl.textContent = L.none;
    if (customPreview) customPreview.style.background = "#00a884";
    if (nativePicker) nativePicker.value = "#00a884";
    if (hexInput && document.activeElement !== hexInput) {
      hexInput.value = "";
    }
  }
}

async function applyColor(color) {
  const result = await window.sessionColorDialog.set({
    desktopId: desktopIdParam,
    color,
  });
  markSelected(result.color);
}

function addSwatch(color, label) {
  const el = document.createElement("button");
  el.className = color ? "swatch" : "swatch none";
  el.dataset.color = color || "";
  el.setAttribute("role", "radio");
  el.title = label;
  el.setAttribute("aria-label", label);

  if (color) {
    el.style.background = color;
  } else {
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
  }

  el.addEventListener("click", () => {
    applyColor(color);
  });
  swatchesEl.appendChild(el);
}

// Native color picker events
if (nativePicker) {
  nativePicker.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val) {
      applyColor(val);
    }
  });
  nativePicker.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val) {
      applyColor(val);
    }
  });
}

// HEX input events
if (hexInput) {
  hexInput.addEventListener("input", (e) => {
    let clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    e.target.value = clean.toUpperCase();
    if (clean.length === 6) {
      applyColor(`#${clean}`);
    } else if (clean.length === 3) {
      applyColor(`#${clean}`);
    } else if (clean.length === 0) {
      applyColor(null);
    }
  });

  hexInput.addEventListener("blur", () => {
    if (currentColor) {
      hexInput.value = currentColor.replace("#", "").toUpperCase();
    } else {
      hexInput.value = "";
    }
  });

  hexInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      hexInput.blur();
    }
  });
}

function closeDialog() {
  if (
    window.sessionColorDialog &&
    typeof window.sessionColorDialog.close === "function"
  ) {
    window.sessionColorDialog.close();
  } else {
    window.close();
  }
}

modalCloseBtn.addEventListener("click", closeDialog);
closeBtn.addEventListener("click", closeDialog);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDialog();
  }
});

window.sessionColorDialog.get(desktopIdParam).then(({ color, palette }) => {
  currentPalette = Array.isArray(palette) ? palette : [];
  addSwatch(null, L.none);
  for (const value of currentPalette) {
    addSwatch(value, value);
  }
  markSelected(color);
});
