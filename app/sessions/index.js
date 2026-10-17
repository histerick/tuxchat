"use strict";

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { updateTrayName } = require("../tray");
const titlebar = require("../mainWindow/titlebar");
const {
  switchSessionTab,
  removeSessionTab,
  getActiveSessionId,
} = require("../mainWindow");
const {
  openSessionModal,
  openDeleteModal,
  resizeSessionModal,
  closeSessionModal,
} = require("./modal-manager");
const { t } = require("../i18n");

// Each extra session tab runs an isolated partition
const MAX_SESSIONS = 6;

// Mirrors WhatsApp's own group-name limit
const MAX_NAME_LENGTH = 25;

const HOME = app.getPath("home");
const APPLICATIONS_DIR = path.join(HOME, ".local", "share", "applications");
const LAUNCHERS_DIR = path.join(HOME, ".local", "bin");
const ICONS_DIR = path.join(
  HOME,
  ".local",
  "share",
  "icons",
  "hicolor",
  "512x512",
  "apps",
);
const MAIN_ICON = path.join(__dirname, "..", "..", "build", "icon.png");
const TINTED_ICONS_DIR = path.join(HOME, ".local", "share", "tuxchat", "icons");
const SESSIONS_CONFIG_DIR = path.join(HOME, ".config", "tuxchat");
const SESSIONS_JSON_PATH = path.join(SESSIONS_CONFIG_DIR, "sessions.json");

function getStoredSessions() {
  if (!fs.existsSync(SESSIONS_JSON_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(SESSIONS_JSON_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStoredSessions(sessions) {
  try {
    fs.mkdirSync(SESSIONS_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(
      SESSIONS_JSON_PATH,
      JSON.stringify(sessions, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("Failed to save sessions.json:", err);
  }
}

function notifySessionsChanged() {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send("sessions:changed");
    } catch {
      // Window may be closing or destroyed
    }
  }
}

const DESKTOP_RE = /^tuxchat(?:-(.+))?\.desktop$/;

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function validateProfileName(profileName) {
  if (!profileName) {
    return t("sessions.errors.emptyName");
  }
  if (/[\r\n]/.test(profileName)) {
    return t("sessions.errors.newlineName");
  }
  if (profileName.length > MAX_NAME_LENGTH) {
    return t("sessions.errors.tooLong", MAX_NAME_LENGTH);
  }
  return null;
}

function listSessionSlugs() {
  const stored = getStoredSessions();
  const slugs = stored
    .filter((s) => s.desktopId !== "tuxchat")
    .map((s) => s.slug || slugify(s.profileName));
  if (process.platform === "linux" && fs.existsSync(APPLICATIONS_DIR)) {
    const linuxSlugs = fs
      .readdirSync(APPLICATIONS_DIR)
      .map((file) => DESKTOP_RE.exec(file))
      .filter(Boolean)
      .map((match) => match[1] || "")
      .filter(Boolean);
    return Array.from(new Set([...slugs, ...linuxSlugs]));
  }
  return slugs;
}

function sessionStatus() {
  return { count: listDeletableSessions().length + 1, max: MAX_SESSIONS };
}

function listDeletableSessions() {
  const stored = getStoredSessions();
  const deletable = stored
    .filter((s) => s.desktopId !== "tuxchat")
    .map((s) => ({
      desktopId: s.desktopId || `tuxchat-${s.slug}`,
      slug: s.slug || slugify(s.profileName),
      profileName: s.profileName,
      avatar: s.avatar || null,
      color: s.color || null,
      muted: Boolean(s.muted),
      volume: typeof s.volume === "number" ? s.volume : 100,
      hideInLinkPicker: Boolean(s.hideInLinkPicker),
      lastLinkAt: s.lastLinkAt || null,
    }));

  if (process.platform === "linux" && fs.existsSync(APPLICATIONS_DIR)) {
    const existingIds = new Set(deletable.map((s) => s.desktopId));
    fs.readdirSync(APPLICATIONS_DIR)
      .map((file) => DESKTOP_RE.exec(file))
      .filter((match) => match && match[1])
      .forEach((match) => {
        const slug = match[1];
        const desktopId = `tuxchat-${slug}`;
        if (!existingIds.has(desktopId)) {
          const desktopPath = path.join(
            APPLICATIONS_DIR,
            `${desktopId}.desktop`,
          );
          let profileName = slug;
          try {
            const content = fs.readFileSync(desktopPath, "utf8");
            const m = /^Name=TuxChat - (.+)$/m.exec(content);
            if (m) profileName = m[1];
          } catch {
            // Ignore unreadable desktop entry
          }
          deletable.push({
            desktopId,
            slug,
            profileName,
            avatar: null,
            color: null,
            muted: false,
            volume: 100,
            hideInLinkPicker: false,
          });
        }
      });
  }

  return deletable;
}

function listAllSessions() {
  const stored = getStoredSessions();
  const mainCustom = stored.find((s) => s.desktopId === "tuxchat");
  let mainProfileName = mainCustom
    ? mainCustom.profileName
    : t("sessions.mainLabel");
  if (
    mainProfileName === "TuxChat (principal)" ||
    mainProfileName === "TuxChat (main)" ||
    mainProfileName === "Principal" ||
    mainProfileName === "Main"
  ) {
    mainProfileName = t("sessions.mainLabel");
  }
  const mainSession = {
    desktopId: "tuxchat",
    profileName: mainProfileName,
    avatar: mainCustom ? mainCustom.avatar : null,
    color: mainCustom ? mainCustom.color || null : null,
    muted: mainCustom ? Boolean(mainCustom.muted) : false,
    volume:
      mainCustom && typeof mainCustom.volume === "number"
        ? mainCustom.volume
        : 100,
    hideInLinkPicker: mainCustom ? Boolean(mainCustom.hideInLinkPicker) : false,
    lastLinkAt: mainCustom ? mainCustom.lastLinkAt || null : null,
  };

  const deletable = listDeletableSessions();
  const allMap = new Map();
  allMap.set("tuxchat", mainSession);
  for (const s of deletable) {
    allMap.set(s.desktopId, s);
  }

  const result = [];
  const addedIds = new Set();

  for (const s of stored) {
    const id = s.desktopId || (s.slug ? `tuxchat-${s.slug}` : "tuxchat");
    if (allMap.has(id) && !addedIds.has(id)) {
      result.push(allMap.get(id));
      addedIds.add(id);
    }
  }

  if (!addedIds.has("tuxchat")) {
    result.unshift(mainSession);
    addedIds.add("tuxchat");
  }

  for (const [id, session] of allMap.entries()) {
    if (!addedIds.has(id)) {
      result.push(session);
      addedIds.add(id);
    }
  }

  return result;
}

function buildLauncherScript({ profileName, userDataDir, desktopId }) {
  const parts = [shQuote(process.env.APPIMAGE || process.execPath)];
  if (!app.isPackaged) parts.push(shQuote(app.getAppPath()));
  parts.push(`--user-data-dir=${shQuote(userDataDir)}`);
  parts.push(`--class=${desktopId}`);
  parts.push(`--profile-name=${shQuote(profileName)}`);

  return `#!/bin/bash
# Sesión "${profileName}" de TuxChat
exec ${parts.join(" \\\n  ")}
`;
}

function buildDesktopEntry({ profileName, launcherPath, desktopId, icon }) {
  const lines = [
    "[Desktop Entry]",
    "Version=1.0",
    "Terminal=false",
    "Type=Application",
    `Name=TuxChat - ${profileName}`,
    `Comment=${t("sessions.desktopComment", profileName)}`,
    `Exec=${launcherPath}`,
  ];
  if (icon) lines.push(`Icon=${icon}`);
  lines.push(
    `StartupWMClass=${desktopId}`,
    "Categories=Network;InstantMessaging;",
  );
  return lines.join("\n") + "\n";
}

function removeTintedIcons(desktopId) {
  if (!fs.existsSync(TINTED_ICONS_DIR)) return;
  for (const file of fs.readdirSync(TINTED_ICONS_DIR)) {
    if (file.startsWith(`${desktopId}-`))
      fs.rmSync(path.join(TINTED_ICONS_DIR, file), { force: true });
  }
}

function refreshDesktopCaches() {
  if (process.platform !== "linux") return;
  execFile("update-desktop-database", [APPLICATIONS_DIR], () => {});
  execFile(
    "gtk-update-icon-cache",
    ["-f", "-t", path.join(HOME, ".local", "share", "icons", "hicolor")],
    () => {},
  );
}

function createSession(rawInput, rawAvatar) {
  let profileName = "";
  let avatar = null;

  if (typeof rawInput === "object" && rawInput !== null) {
    profileName = (rawInput.name || rawInput.profileName || "").trim();
    avatar = rawInput.avatar || null;
  } else {
    profileName = (rawInput || "").trim();
    avatar = rawAvatar || null;
  }

  const nameError = validateProfileName(profileName);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const slug = slugify(profileName);
  if (!slug) {
    return { ok: false, error: t("sessions.errors.invalidSlug") };
  }

  const existing = listSessionSlugs();
  if (existing.includes(slug)) {
    return { ok: false, error: t("sessions.errors.duplicate", profileName) };
  }
  if (existing.length >= MAX_SESSIONS) {
    return {
      ok: false,
      error: t("sessions.errors.limitReached", MAX_SESSIONS),
    };
  }

  const desktopId = `tuxchat-${slug}`;
  const list = getStoredSessions();
  list.push({ desktopId, slug, profileName, avatar });
  saveStoredSessions(list);

  if (process.platform === "linux") {
    try {
      const launcherPath = path.join(LAUNCHERS_DIR, `${desktopId}-launcher.sh`);
      const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
      const iconPath = path.join(ICONS_DIR, `${desktopId}.png`);
      const userDataDir = path.join(HOME, ".config", desktopId);

      fs.mkdirSync(LAUNCHERS_DIR, { recursive: true });
      fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });

      const hasIcon = fs.existsSync(MAIN_ICON);
      if (hasIcon) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
        fs.copyFileSync(MAIN_ICON, iconPath);
      }

      fs.writeFileSync(
        launcherPath,
        buildLauncherScript({ profileName, userDataDir, desktopId }),
      );
      fs.chmodSync(launcherPath, 0o755);
      fs.writeFileSync(
        desktopPath,
        buildDesktopEntry({
          profileName,
          launcherPath,
          desktopId,
          icon: hasIcon ? desktopId : null,
        }),
      );
      refreshDesktopCaches();
    } catch (err) {
      console.error("Failed to create linux desktop entry:", err);
    }
  }

  notifySessionsChanged();
  switchSessionTab(desktopId);

  return { ok: true, profileName, desktopId, avatar };
}

function updateSession(payload) {
  if (!payload || !payload.desktopId) {
    return { ok: false, error: "ID de sessão inválido." };
  }

  const desktopId = payload.desktopId;
  const rawName = (payload.name || payload.profileName || "").trim();
  const avatar = payload.avatar;

  if (rawName) {
    const nameError = validateProfileName(rawName);
    if (nameError) return { ok: false, error: nameError };
  }

  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === desktopId ||
      (s.slug && `tuxchat-${s.slug}` === desktopId),
  );

  if (!item && desktopId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: rawName || t("sessions.mainLabel"),
      avatar: null,
    };
    list.push(item);
  }

  if (!item) {
    return { ok: false, error: "Sessão não encontrada." };
  }

  if (rawName) item.profileName = rawName;
  if (avatar !== undefined) item.avatar = avatar;
  if (payload.color !== undefined) item.color = payload.color;

  saveStoredSessions(list);

  if (getActiveSessionId() === desktopId) {
    let name = item.profileName || "";
    const m = /^TuxChat\s*\((.+)\)$/i.exec(name);
    if (m) name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const appName = name ? `TuxChat - ${name}` : "TuxChat";
    titlebar.setTitle(appName);
    if (selfContext && selfContext.mainWindow) {
      updateTrayName(selfContext.tray, selfContext.mainWindow, appName);
    }
  }

  notifySessionsChanged();
  return {
    ok: true,
    desktopId,
    profileName: item.profileName,
    avatar: item.avatar,
  };
}

function deleteSession(desktopId) {
  if (!desktopId || desktopId === "tuxchat") {
    return { ok: false, error: "A sessão principal não pode ser excluída." };
  }

  let list = getStoredSessions();
  list = list.filter(
    (s) => s.desktopId !== desktopId && `tuxchat-${s.slug}` !== desktopId,
  );
  saveStoredSessions(list);

  // Close the active view in the main window
  removeSessionTab(desktopId);

  if (process.platform === "linux") {
    const launcherPath = path.join(LAUNCHERS_DIR, `${desktopId}-launcher.sh`);
    const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
    const iconPath = path.join(ICONS_DIR, `${desktopId}.png`);
    const userDataDir = path.join(HOME, ".config", desktopId);

    try {
      fs.rmSync(launcherPath, { force: true });
      fs.rmSync(desktopPath, { force: true });
      fs.rmSync(iconPath, { force: true });
      removeTintedIcons(desktopId);
      refreshDesktopCaches();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (err) {
      console.error("Error removing Linux session files:", err);
    }
  } else {
    const userDataDir = path.join(HOME, ".config", desktopId);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist or be in use
    }
  }

  notifySessionsChanged();
  return { ok: true };
}

function renameSession(desktopId, rawNewName) {
  return updateSession({ desktopId, name: rawNewName });
}

function reorderSessions(orderedIds) {
  if (!Array.isArray(orderedIds)) {
    return { ok: false, error: "Invalid orderedIds array" };
  }

  const stored = getStoredSessions();

  if (
    orderedIds.includes("tuxchat") &&
    !stored.some((s) => s.desktopId === "tuxchat")
  ) {
    stored.push({
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
    });
  }

  const deletable = listDeletableSessions();
  for (const id of orderedIds) {
    if (
      !stored.some(
        (s) => s.desktopId === id || (s.slug && `tuxchat-${s.slug}` === id),
      )
    ) {
      const match = deletable.find((d) => d.desktopId === id);
      if (match) {
        stored.push(match);
      }
    }
  }

  stored.sort((a, b) => {
    const idA = a.desktopId || (a.slug ? `tuxchat-${a.slug}` : "tuxchat");
    const idB = b.desktopId || (b.slug ? `tuxchat-${b.slug}` : "tuxchat");
    const indexA = orderedIds.indexOf(idA);
    const indexB = orderedIds.indexOf(idB);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  saveStoredSessions(stored);
  notifySessionsChanged();
  return { ok: true };
}

let selfContext = null;

function registerSelfContext(mainWindow, tray, profileName, wmClass) {
  const desktopId =
    wmClass || (profileName ? `tuxchat-${slugify(profileName)}` : "tuxchat");
  selfContext = { mainWindow, tray, profileName, desktopId };
}

function canRenameSelf() {
  return true;
}

function getSessionColor(desktopId) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const all = listAllSessions();
  const s = all.find((item) => item.desktopId === targetId);
  return s && s.color ? s.color : null;
}

function setSessionColor(desktopId, color) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === targetId || (s.slug && `tuxchat-${s.slug}` === targetId),
  );

  if (!item && targetId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
    };
    list.push(item);
  }

  if (!item) return false;
  item.color = color || null;
  saveStoredSessions(list);

  if (getActiveSessionId() === targetId) {
    titlebar.setColor(item.color);
  }

  notifySessionsChanged();
  return true;
}

function getSessionMuted(desktopId) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const all = listAllSessions();
  const s = all.find((item) => item.desktopId === targetId);
  return s ? Boolean(s.muted) : false;
}

function setSessionMuted(desktopId, muted) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === targetId || (s.slug && `tuxchat-${s.slug}` === targetId),
  );

  if (!item && targetId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
      muted: false,
      volume: 100,
    };
    list.push(item);
  }

  if (!item) return false;
  item.muted = Boolean(muted);
  saveStoredSessions(list);

  try {
    const { setAudioMutedForSession } = require("../mainWindow");
    if (typeof setAudioMutedForSession === "function") {
      setAudioMutedForSession(targetId, item.muted);
    }
  } catch {
    // mainWindow may not be loaded yet
  }

  notifySessionsChanged();
  return true;
}

function getSessionVolume(desktopId) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const all = listAllSessions();
  const s = all.find((item) => item.desktopId === targetId);
  return s && typeof s.volume === "number" ? s.volume : 100;
}

function setSessionVolume(desktopId, volume) {
  const targetId = desktopId || getActiveSessionId() || "tuxchat";
  const vol = Math.max(0, Math.min(100, Math.round(Number(volume) || 0)));
  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === targetId || (s.slug && `tuxchat-${s.slug}` === targetId),
  );

  if (!item && targetId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
      muted: false,
      volume: 100,
    };
    list.push(item);
  }

  if (!item) return false;
  item.volume = vol;
  saveStoredSessions(list);

  try {
    const { setVolumeForSession } = require("../mainWindow");
    if (typeof setVolumeForSession === "function") {
      setVolumeForSession(targetId, vol);
    }
  } catch {
    // mainWindow may not be loaded yet
  }

  notifySessionsChanged();
  return true;
}

function setSessionHideInLinkPicker(desktopId, hide) {
  const targetId = desktopId || "tuxchat";
  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === targetId || (s.slug && `tuxchat-${s.slug}` === targetId),
  );

  if (!item && targetId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
      muted: false,
      volume: 100,
      hideInLinkPicker: false,
    };
    list.push(item);
  }

  if (!item) return false;
  item.hideInLinkPicker = Boolean(hide);
  saveStoredSessions(list);
  notifySessionsChanged();
  return true;
}

function recordSessionLinkUsage(desktopId) {
  const targetId = desktopId || "tuxchat";
  const list = getStoredSessions();
  let item = list.find(
    (s) =>
      s.desktopId === targetId || (s.slug && `tuxchat-${s.slug}` === targetId),
  );

  if (!item && targetId === "tuxchat") {
    item = {
      desktopId: "tuxchat",
      slug: "",
      profileName: t("sessions.mainLabel"),
      avatar: null,
      color: null,
      muted: false,
      volume: 100,
      hideInLinkPicker: false,
      lastLinkAt: Date.now(),
    };
    list.push(item);
  } else if (item) {
    item.lastLinkAt = Date.now();
  }

  saveStoredSessions(list);
  notifySessionsChanged();
  return true;
}

function switchSession(desktopId) {
  const res = switchSessionTab(desktopId);
  const color = getSessionColor(desktopId);
  titlebar.setColor(color);
  return res;
}

function setSessionIcon(desktopId, colorKey, pngBuffer) {
  if (!/^tuxchat-(.+)$/.test(desktopId || "")) return;
  const desktopPath = path.join(APPLICATIONS_DIR, `${desktopId}.desktop`);
  if (!fs.existsSync(desktopPath)) return;

  removeTintedIcons(desktopId);
  let icon = fs.existsSync(path.join(ICONS_DIR, `${desktopId}.png`))
    ? desktopId
    : null;
  if (pngBuffer) {
    fs.mkdirSync(TINTED_ICONS_DIR, { recursive: true });
    icon = path.join(TINTED_ICONS_DIR, `${desktopId}-${colorKey}.png`);
    fs.writeFileSync(icon, pngBuffer);
  }

  const lines = fs
    .readFileSync(desktopPath, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("Icon="));
  if (icon)
    lines.splice(
      lines.findIndex((line) => line.startsWith("Exec=")) + 1,
      0,
      `Icon=${icon}`,
    );
  fs.writeFileSync(desktopPath, lines.join("\n"));
  refreshDesktopCaches();
}

function openAddSessionDialog() {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  openSessionModal(win, { mode: "create" });
}

function openDeleteSessionDialog() {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  const activeId = getActiveSessionId();
  openDeleteModal(win, activeId);
}

function openRenameSessionDialog() {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  const activeId = getActiveSessionId();
  openSessionModal(win, { mode: "edit", desktopId: activeId });
}

// IPC Handlers
ipcMain.handle("sessions:status", () => sessionStatus());
ipcMain.handle("sessions:list-all", () => listAllSessions());
ipcMain.handle("sessions:list-deletable", () => listDeletableSessions());
ipcMain.handle("sessions:reorder", (_event, orderedIds) =>
  reorderSessions(orderedIds),
);
ipcMain.handle("sessions:current", () => {
  const activeId = getActiveSessionId();
  const all = listAllSessions();
  const current = all.find((s) => s.desktopId === activeId) || all[0];
  return {
    desktopId: activeId,
    profileName: current ? current.profileName : "",
    avatar: current ? current.avatar : null,
    color: current ? current.color : null,
    muted: current ? current.muted : false,
    volume: current ? current.volume : 100,
    hideInLinkPicker: current ? current.hideInLinkPicker : false,
    canRename: true,
  };
});
ipcMain.handle("sessions:set-muted", (_event, { desktopId, muted }) =>
  setSessionMuted(desktopId, muted),
);
ipcMain.handle("sessions:set-volume", (_event, { desktopId, volume }) =>
  setSessionVolume(desktopId, volume),
);
ipcMain.handle("sessions:toggle-hide-link", (_event, { desktopId, hide }) =>
  setSessionHideInLinkPicker(desktopId, hide),
);
ipcMain.handle("sessions:switch", (_event, desktopId) =>
  switchSession(desktopId),
);
ipcMain.handle("sessions:create", (_event, payload) => createSession(payload));
ipcMain.handle("sessions:update", (_event, payload) => updateSession(payload));
ipcMain.handle("sessions:delete", (_event, desktopId) =>
  deleteSession(desktopId),
);
ipcMain.handle("sessions:open-add", () => {
  openAddSessionDialog();
  return { ok: true };
});
ipcMain.handle("sessions:open-edit", (_event, desktopId) => {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  openSessionModal(win, { mode: "edit", desktopId });
  return { ok: true };
});
ipcMain.handle("sessions:open-delete", (_event, desktopId) => {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  openDeleteModal(win, desktopId);
  return { ok: true };
});
ipcMain.on("sessions:modal-close", () => {
  closeSessionModal();
});
ipcMain.on("sessions:modal-resize", (_event, height) => {
  resizeSessionModal(height);
});
ipcMain.on("sessions:context-menu", (_event, desktopId) => {
  const win =
    (selfContext && selfContext.mainWindow) ||
    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (!win) return;
  const isMain = desktopId === "tuxchat";
  const { openSessionColorDialog } = require("../sessionColor");
  const isMuted = getSessionMuted(desktopId);
  const currentVol = getSessionVolume(desktopId);

  const template = [
    {
      label: t("menu.editSession"),
      click: () => openSessionModal(win, { mode: "edit", desktopId }),
    },
    {
      label: t("menu.sessionColor"),
      click: () => openSessionColorDialog(desktopId),
    },
    { type: "separator" },
    {
      label: isMuted ? t("menu.unmuteAudio") : t("menu.muteAudio"),
      type: "checkbox",
      checked: isMuted,
      click: () => setSessionMuted(desktopId, !isMuted),
    },
    {
      label: `${t("menu.volume")} (${currentVol}%)`,
      submenu: [
        {
          label: "100%",
          type: "radio",
          checked: currentVol === 100,
          click: () => setSessionVolume(desktopId, 100),
        },
        {
          label: "75%",
          type: "radio",
          checked: currentVol === 75,
          click: () => setSessionVolume(desktopId, 75),
        },
        {
          label: "50%",
          type: "radio",
          checked: currentVol === 50,
          click: () => setSessionVolume(desktopId, 50),
        },
        {
          label: "25%",
          type: "radio",
          checked: currentVol === 25,
          click: () => setSessionVolume(desktopId, 25),
        },
        {
          label: "10%",
          type: "radio",
          checked: currentVol === 10,
          click: () => setSessionVolume(desktopId, 10),
        },
        {
          label: `0% (${t("menu.silent")})`,
          type: "radio",
          checked: currentVol === 0,
          click: () => setSessionVolume(desktopId, 0),
        },
      ],
    },
  ];
  if (!isMain) {
    template.push(
      { type: "separator" },
      {
        label: t("menu.deleteSession"),
        click: () => openDeleteModal(win, desktopId),
      },
    );
  }
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win });
});
ipcMain.handle("sessions:rename", (_event, newName) => {
  const activeId = getActiveSessionId();
  return updateSession({ desktopId: activeId, name: newName });
});

module.exports = {
  openAddSessionDialog,
  openDeleteSessionDialog,
  openRenameSessionDialog,
  sessionStatus,
  createSession,
  updateSession,
  listDeletableSessions,
  listAllSessions,
  switchSession,
  notifySessionsChanged,
  deleteSession,
  renameSession,
  reorderSessions,
  getSessionColor,
  setSessionColor,
  getSessionMuted,
  setSessionMuted,
  getSessionVolume,
  setSessionVolume,
  setSessionHideInLinkPicker,
  recordSessionLinkUsage,
  registerSelfContext,
  canRenameSelf,
  refreshDesktopCaches,
  setSessionIcon,
  MAX_SESSIONS,
  MAX_NAME_LENGTH,
};
