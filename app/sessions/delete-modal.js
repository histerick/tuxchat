"use strict";

const params = new URLSearchParams(window.location.search);
const desktopId = params.get("desktopId") || "";
const localeParam = params.get("locale") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "en";
const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].deleteModal) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.deleteModal) || {
    title: "Delete Session",
    mainCantDelete: "The main TuxChat session cannot be deleted.",
    subtext: "Additional TuxChat session",
    warning:
      "The login and all local data for this session will be permanently deleted from this machine.",
    cancel: "Cancel",
    confirm: "Delete session",
    deleting: "Deleting...",
  };

document.documentElement.lang = LOCALE;
document.title = L.title;

const titleTextEl = document.getElementById("delete-title-text");
if (titleTextEl) titleTextEl.textContent = L.title;
const subtextEl = document.getElementById("delete-session-subtext");
if (subtextEl) subtextEl.textContent = L.subtext;
const warningTextEl = document.getElementById("delete-warning-text");
if (warningTextEl) warningTextEl.textContent = L.warning;
const cancelBtn = document.getElementById("delete-cancel-btn");
if (cancelBtn) cancelBtn.textContent = L.cancel;
const confirmBtnText = document.getElementById("delete-confirm-btn-text");
if (confirmBtnText) confirmBtnText.textContent = L.confirm;

const sessionNameEl = document.getElementById("delete-session-name");
const avatarImgEl = document.getElementById("delete-avatar-img");
const avatarInitialsEl = document.getElementById("delete-avatar-initials");
const errorEl = document.getElementById("delete-error");
const closeBtn = document.getElementById("delete-close-btn");
const confirmBtn = document.getElementById("delete-confirm-btn");

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

async function init() {
  if (!desktopId || desktopId === "tuxchat") {
    sessionNameEl.textContent = "TuxChat";
    errorEl.textContent = L.mainCantDelete;
    errorEl.hidden = false;
    confirmBtn.disabled = true;
    return;
  }

  try {
    const list = await window.modalAPI.list();
    const session = list.find((s) => s.desktopId === desktopId);
    if (session) {
      sessionNameEl.textContent = session.profileName || desktopId;
      if (session.avatar) {
        avatarImgEl.src = session.avatar;
        avatarImgEl.hidden = false;
        avatarInitialsEl.hidden = true;
      } else {
        avatarImgEl.hidden = true;
        avatarInitialsEl.textContent = getInitials(session.profileName);
        avatarInitialsEl.hidden = false;
      }
    } else {
      sessionNameEl.textContent = desktopId;
      avatarInitialsEl.textContent = getInitials(desktopId);
    }
  } catch {
    sessionNameEl.textContent = desktopId;
  }

  cancelBtn.focus();
}

closeBtn.addEventListener("click", () => window.modalAPI.close());
cancelBtn.addEventListener("click", () => window.modalAPI.close());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.modalAPI.close();
  }
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<span>${L.deleting}</span>`;
  errorEl.hidden = true;

  try {
    const res = await window.modalAPI.delete(desktopId);
    if (!res.ok) {
      errorEl.textContent = res.error || "Erro.";
      errorEl.hidden = false;
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>${L.confirm}</span>
      `;
      return;
    }
    window.modalAPI.close();
  } catch (err) {
    errorEl.textContent = err.message || "Erro.";
    errorEl.hidden = false;
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span>${L.confirm}</span>
    `;
  }
});

init();
