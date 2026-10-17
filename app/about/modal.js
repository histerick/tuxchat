"use strict";

const urlParams = new URLSearchParams(window.location.search);
const localeParam = urlParams.get("locale") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "en";
const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].aboutModal) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.aboutModal) || {
    title: "About TuxChat",
    desc: "Desktop client for WhatsApp Web with support for multiple isolated sessions.",
    platform: "Platform",
    repository: "Project repository",
    close: "Close",
  };

document.documentElement.lang = LOCALE;
document.title = L.title;
const titleTextEl = document.getElementById("about-title-text");
if (titleTextEl) titleTextEl.textContent = L.title;
const descEl = document.getElementById("app-desc");
if (descEl) descEl.textContent = L.desc;
const platformLabelEl = document.getElementById("platform-label");
if (platformLabelEl) platformLabelEl.textContent = L.platform;
const repoLabelEl = document.getElementById("repo-label");
if (repoLabelEl) repoLabelEl.textContent = L.repository;
const closeBtn = document.getElementById("close-btn");
if (closeBtn) closeBtn.textContent = L.close;

const appVersionEl = document.getElementById("app-version");
const electronVerEl = document.getElementById("electron-ver");
const chromeVerEl = document.getElementById("chrome-ver");
const nodeVerEl = document.getElementById("node-ver");
const platformVerEl = document.getElementById("platform-ver");
const repoBtn = document.getElementById("repo-btn");
const closeXBtn = document.getElementById("close-x-btn");

async function init() {
  try {
    const info = await window.aboutAPI.getInfo();
    if (info) {
      appVersionEl.textContent = `v${info.version || "0.2.7"}`;
      electronVerEl.textContent = info.electronVersion || "-";
      chromeVerEl.textContent = info.chromeVersion || "-";
      nodeVerEl.textContent = info.nodeVersion || "-";
      platformVerEl.textContent = `${info.platform || "linux"} (${info.arch || "x64"})`;
    }
  } catch {
    appVersionEl.textContent = "v0.2.7";
  }
}

function closeModal() {
  if (window.aboutAPI && typeof window.aboutAPI.close === "function") {
    window.aboutAPI.close();
  } else {
    window.close();
  }
}

closeXBtn.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

repoBtn.addEventListener("click", () => {
  if (window.aboutAPI && typeof window.aboutAPI.openLink === "function") {
    window.aboutAPI.openLink("https://github.com/histerick/tuxchat");
  }
});

init();
