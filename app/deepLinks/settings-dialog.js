"use strict";

const localeParam =
  new URLSearchParams(window.location.search).get("locale") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "en";
const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].linksSettingsDialog) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.linksSettingsDialog) || {
    windowTitle: "WhatsApp links",
    heading: "WhatsApp links",
    description: "Choose which session opens whatsapp:// links.",
    savedSession: (name) => `Saved session: ${name}`,
    noSavedSession:
      "No session saved: you'll be asked every time a link arrives.",
    forget: "Forget saved",
    save: "Save",
    close: "Cancel",
  };

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById("heading").textContent = L.heading;
document.getElementById("description").textContent = L.description;
document.getElementById("forget").textContent = L.forget;
document.getElementById("save").textContent = L.save;
document.getElementById("close").textContent = L.close;

const modalCloseBtn = document.getElementById("modal-close-btn");
const listEl = document.getElementById("list");
const currentEl = document.getElementById("current");
const saveBtn = document.getElementById("save");
const forgetBtn = document.getElementById("forget");
const closeBtn = document.getElementById("close");

let sessions = [];
let selected = null;
let saved = null;

function getInitials(name) {
  if (!name) return "S";
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (clean.slice(0, 2) || name.slice(0, 2) || "S").toUpperCase();
}

function render() {
  listEl.innerHTML = "";
  for (const item of sessions) {
    const row = document.createElement("label");
    row.className =
      item.desktopId === selected ? "session-row selected" : "session-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "handler";
    radio.value = item.desktopId;
    radio.checked = item.desktopId === selected;

    radio.addEventListener("change", () => {
      selected = item.desktopId;
      saveBtn.disabled = selected === saved;
      for (const child of listEl.children) {
        child.classList.remove("selected");
      }
      row.classList.add("selected");
    });

    const avatarBox = document.createElement("div");
    avatarBox.className = "session-row-avatar";
    if (item.avatar) {
      const img = document.createElement("img");
      img.src = item.avatar;
      img.alt = item.profileName;
      avatarBox.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.className = "initials";
      span.textContent = getInitials(item.profileName);
      avatarBox.appendChild(span);
    }

    const name = document.createElement("span");
    name.className = "session-row-name";
    name.textContent = item.profileName;

    const hideBtn = document.createElement("button");
    hideBtn.type = "button";
    hideBtn.className = "hide-toggle-btn";
    hideBtn.style.cssText =
      "background:transparent;border:none;color:#8696a0;cursor:pointer;padding:4px;display:flex;align-items:center;margin-left:auto;border-radius:4px;";
    const isHidden = Boolean(item.hideInLinkPicker);
    const pickerL =
      (window.TUXCHAT_STRINGS &&
        window.TUXCHAT_STRINGS[LOCALE] &&
        window.TUXCHAT_STRINGS[LOCALE].linkPicker) ||
      {};
    hideBtn.title = isHidden
      ? pickerL.unhideTooltip || "Voltar a exibir sessão"
      : pickerL.hideTooltip || "Ocultar sessão nesta lista";
    hideBtn.innerHTML = isHidden
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    hideBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newHide = !isHidden;
      item.hideInLinkPicker = newHide;
      await window.deepLinksDialog.toggleHide(item.desktopId, newHide);
      render();
    });

    row.appendChild(radio);
    row.appendChild(avatarBox);
    row.appendChild(name);
    row.appendChild(hideBtn);
    listEl.appendChild(row);
  }
}

async function load() {
  try {
    sessions = await window.deepLinksDialog.listSessions();
    saved = await window.deepLinksDialog.getHandler();
    selected = saved;

    const savedSession = sessions.find((item) => item.desktopId === saved);
    if (savedSession) {
      currentEl.innerHTML =
        typeof L.savedSession === "function"
          ? L.savedSession(`<strong>${savedSession.profileName}</strong>`)
          : `Sessão padrão salva: <strong>${savedSession.profileName}</strong>`;
    } else {
      currentEl.textContent = L.noSavedSession;
    }

    saveBtn.disabled = true;
    forgetBtn.disabled = !saved;
    render();
  } catch {
    // Error loading data
  }
}

function closeDialog() {
  if (
    window.deepLinksDialog &&
    typeof window.deepLinksDialog.close === "function"
  ) {
    window.deepLinksDialog.close();
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

saveBtn.addEventListener("click", async () => {
  if (!selected) return;
  saveBtn.disabled = true;
  await window.deepLinksDialog.setHandler(selected);
  closeDialog();
});

forgetBtn.addEventListener("click", async () => {
  forgetBtn.disabled = true;
  await window.deepLinksDialog.clearHandler();
  await load();
});

load();
