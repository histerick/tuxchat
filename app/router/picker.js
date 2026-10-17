"use strict";

const urlParams = new URLSearchParams(window.location.search);
const localeParam = urlParams.get("locale") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "pt";

const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].linkPicker) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.linkPicker) || {
    windowTitle: "Abrir link do WhatsApp",
    heading: "Com qual sessão deseja enviar a mensagem?",
    messageLabel: "Mensagem:",
    messagePlaceholder: "Digite ou edite a mensagem...",
    autoSend: "Enviar automaticamente",
    sessionsHeading: "Enviar com a sessão:",
    remember: "Lembrar desta escolha para os próximos links",
    cancel: "Cancelar",
    hide: "Ocultar",
    unhide: "Exibir",
    hideTooltip: "Ocultar sessão nesta lista",
    unhideTooltip: "Voltar a exibir sessão",
    hiddenSessions: (n) => `Sessões ocultas (${n})`,
    timeNever: "Nunca usada para links",
    timeJustNow: "Usada agora mesmo",
    timeSeconds: (s) =>
      s === 1 ? "Usada há 1 segundo atrás" : `Usada há ${s} segundos atrás`,
    timeMinute: "Usada há 1 minuto atrás",
    timeMinutes: (m) => `Usada há ${m} minutos atrás`,
    timeHour: "Usada há 1 hora atrás",
    timeHours: (h) => `Usada há ${h} horas atrás`,
    timeYesterday: "Usada ontem",
    timeDays: (d) => `Usada há ${d} dias atrás`,
  };

document.documentElement.lang = LOCALE;
document.title = L.windowTitle;
document.getElementById("heading").textContent = L.windowTitle;
const subheadingEl = document.getElementById("subheading");
if (subheadingEl) subheadingEl.textContent = L.heading;
const rememberLabelEl = document.getElementById("remember-label");
if (rememberLabelEl) rememberLabelEl.textContent = L.remember;
const cancelBtn = document.getElementById("cancel");
if (cancelBtn) cancelBtn.textContent = L.cancel || "Cancelar";

const messageInputEl = document.getElementById("message-input");
const messageLabelEl = document.getElementById("message-label");
const autoSendEl = document.getElementById("auto-send");
const autoSendLabelEl = document.getElementById("auto-send-label");
const sessionsHeadingEl = document.getElementById("sessions-heading");

if (messageLabelEl && L.messageLabel) {
  const span = messageLabelEl.querySelector("span");
  if (span) span.textContent = L.messageLabel;
}
if (messageInputEl && L.messagePlaceholder) {
  messageInputEl.placeholder = L.messagePlaceholder;
}
if (autoSendLabelEl && L.autoSend) {
  autoSendLabelEl.textContent = L.autoSend;
}
if (sessionsHeadingEl && L.sessionsHeading) {
  sessionsHeadingEl.textContent = L.sessionsHeading;
}

try {
  const savedAutoSend = localStorage.getItem("tuxchat_picker_auto_send");
  if (savedAutoSend !== null && autoSendEl) {
    autoSendEl.checked = savedAutoSend === "true";
  }
} catch {
  // Local storage unavailable
}

if (autoSendEl) {
  autoSendEl.addEventListener("change", () => {
    try {
      localStorage.setItem("tuxchat_picker_auto_send", String(autoSendEl.checked));
    } catch {
      // Local storage unavailable
    }
  });
}

const visibleListEl = document.getElementById("visible-list");
const hiddenSectionEl = document.getElementById("hidden-section");
const toggleHiddenBtn = document.getElementById("toggle-hidden-btn");
const hiddenLabelEl = document.getElementById("hidden-label");
const hiddenListEl = document.getElementById("hidden-list");
const rememberEl = document.getElementById("remember");
const closeXBtn = document.getElementById("close-x-btn");

let allSessions = [];
let isHiddenExpanded = false;
let isChoosing = false;

function getInitials(name) {
  if (!name) return "S";
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (clean.slice(0, 2) || name.slice(0, 2) || "S").toUpperCase();
}

function formatLastUsed(timestamp) {
  if (!timestamp || typeof timestamp !== "number") {
    return L.timeNever || "Nunca usada para links";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 1) {
    return L.timeJustNow || "Usada agora mesmo";
  }
  if (diffSec < 60) {
    return typeof L.timeSeconds === "function"
      ? L.timeSeconds(diffSec)
      : diffSec === 1
        ? "Usada há 1 segundo atrás"
        : `Usada há ${diffSec} segundos atrás`;
  }
  const mins = Math.floor(diffSec / 60);
  if (mins === 1) {
    return L.timeMinute || "Usada há 1 minuto atrás";
  }
  if (mins < 60) {
    return typeof L.timeMinutes === "function"
      ? L.timeMinutes(mins)
      : `Usada há ${mins} minutos atrás`;
  }
  const hours = Math.floor(mins / 60);
  if (hours === 1) {
    return L.timeHour || "Usada há 1 hora atrás";
  }
  if (hours < 24) {
    return typeof L.timeHours === "function"
      ? L.timeHours(hours)
      : `Usada há ${hours} horas atrás`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return L.timeYesterday || "Usada ontem";
  }
  return typeof L.timeDays === "function"
    ? L.timeDays(days)
    : `Usada há ${days} dias atrás`;
}

async function chooseSession(desktopId) {
  if (!desktopId || isChoosing) return;
  isChoosing = true;
  document.querySelectorAll(".session-row").forEach((r) => {
    r.style.pointerEvents = "none";
  });
  const remember = rememberEl ? rememberEl.checked : false;
  const message = messageInputEl ? messageInputEl.value : "";
  const autoSend = autoSendEl ? autoSendEl.checked : false;
  await window.linkPicker.choose(desktopId, remember, message, autoSend);
}

function createSessionRow(item, isHidden) {
  const row = document.createElement("div");
  row.className = `session-row${isHidden ? " is-hidden" : ""}`;
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");
  row.setAttribute(
    "aria-label",
    `${item.profileName} - ${formatLastUsed(item.lastLinkAt)}`,
  );

  // Main content area
  const mainBtn = document.createElement("div");
  mainBtn.className = "session-main-btn";

  const avatar = document.createElement("div");
  avatar.className = "session-avatar";
  if (item.avatar) {
    const img = document.createElement("img");
    img.src = item.avatar;
    avatar.appendChild(img);
  } else {
    avatar.textContent = getInitials(item.profileName);
  }
  if (item.color) {
    avatar.style.borderColor = item.color;
    avatar.style.color = item.color;
  }

  const info = document.createElement("div");
  info.className = "session-info";

  const name = document.createElement("span");
  name.className = "session-name";
  name.textContent = item.profileName;

  const desc = document.createElement("span");
  desc.className = "session-time-desc";
  desc.dataset.timestamp = item.lastLinkAt ? String(item.lastLinkAt) : "";
  desc.textContent = formatLastUsed(item.lastLinkAt);

  info.appendChild(name);
  info.appendChild(desc);

  mainBtn.appendChild(avatar);
  mainBtn.appendChild(info);
  row.appendChild(mainBtn);

  // Right side: arrow indicator and hide/unhide button
  const right = document.createElement("div");
  right.className = "session-row-right";

  const arrow = document.createElement("span");
  arrow.className = "session-arrow";
  arrow.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  right.appendChild(arrow);

  const actionBtn = document.createElement("button");
  actionBtn.type = "button";
  actionBtn.className = "hide-toggle-btn";
  actionBtn.title = isHidden
    ? L.unhideTooltip || "Voltar a exibir sessão"
    : L.hideTooltip || "Ocultar sessão nesta lista";
  actionBtn.setAttribute("aria-label", actionBtn.title);

  if (isHidden) {
    actionBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
    actionBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      item.hideInLinkPicker = false;
      await window.linkPicker.toggleHide(item.desktopId, false);
      render();
    });
  } else {
    actionBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
        <line x1="2" y1="2" x2="22" y2="22"></line>
      </svg>
    `;
    actionBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      item.hideInLinkPicker = true;
      await window.linkPicker.toggleHide(item.desktopId, true);
      render();
    });
  }

  right.appendChild(actionBtn);
  row.appendChild(right);

  row.addEventListener("click", (e) => {
    if (e.target.closest(".hide-toggle-btn")) return;
    chooseSession(item.desktopId);
  });

  row.addEventListener("keydown", (e) => {
    if (e.target.closest(".hide-toggle-btn")) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chooseSession(item.desktopId);
    }
  });

  return row;
}

function updateRelativeTimeLabels() {
  document.querySelectorAll(".session-time-desc").forEach((el) => {
    const raw = el.dataset.timestamp;
    if (raw) {
      const ts = Number(raw);
      if (!isNaN(ts)) {
        el.textContent = formatLastUsed(ts);
      }
    }
  });
}

function render() {
  visibleListEl.innerHTML = "";
  hiddenListEl.innerHTML = "";

  const visible = allSessions.filter((s) => !s.hideInLinkPicker);
  const hidden = allSessions.filter((s) => s.hideInLinkPicker);

  const displayVisible = visible.length > 0 ? visible : allSessions;
  const displayHidden = visible.length > 0 ? hidden : [];

  for (const item of displayVisible) {
    visibleListEl.appendChild(createSessionRow(item, false));
  }

  if (displayHidden.length > 0) {
    hiddenSectionEl.hidden = false;
    hiddenLabelEl.textContent =
      typeof L.hiddenSessions === "function"
        ? L.hiddenSessions(displayHidden.length)
        : `Sessões ocultas (${displayHidden.length})`;

    for (const item of displayHidden) {
      hiddenListEl.appendChild(createSessionRow(item, true));
    }
  } else {
    hiddenSectionEl.hidden = true;
    hiddenListEl.hidden = true;
    isHiddenExpanded = false;
    toggleHiddenBtn.classList.remove("open");
  }
}

toggleHiddenBtn.addEventListener("click", () => {
  isHiddenExpanded = !isHiddenExpanded;
  hiddenListEl.hidden = !isHiddenExpanded;
  toggleHiddenBtn.classList.toggle("open", isHiddenExpanded);
});

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    window.linkPicker.cancel();
  });
}

if (closeXBtn) {
  closeXBtn.addEventListener("click", () => {
    window.linkPicker.cancel();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.linkPicker.cancel();
  } else if (e.key === "Enter") {
    if (document.activeElement === messageInputEl && !e.ctrlKey && !e.metaKey) {
      return;
    }
    const visible = allSessions.filter((s) => !s.hideInLinkPicker);
    const target = visible.length > 0 ? visible[0] : allSessions[0];
    if (target) {
      chooseSession(target.desktopId);
    }
  }
});

// Periodically update relative times live every 5 seconds
setInterval(updateRelativeTimeLabels, 5000);

window.linkPicker.onInit((sessions, options = {}) => {
  allSessions = Array.isArray(sessions) ? [...sessions] : [];

  if (options && typeof options === "object") {
    if (options.phone && subheadingEl) {
      subheadingEl.textContent = `${L.heading} (${options.phone})`;
    }
    if (typeof options.text === "string" && messageInputEl) {
      messageInputEl.value = options.text;
    }
  }

  render();
});
