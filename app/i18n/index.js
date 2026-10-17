"use strict";

const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { es, en, pt } = require("./strings");

const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

function getSavedLocale() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      if (data && ["en", "es", "pt"].includes(data.locale)) {
        return data.locale;
      }
    }
  } catch {
    //
  }
  return null;
}

let cachedLocale = null;

function currentLocale() {
  if (!cachedLocale) {
    const saved = getSavedLocale();
    // Default to 'en' when installed / no preference saved
    cachedLocale = saved || "en";
  }
  return cachedLocale;
}

function setLocale(newLocale) {
  if (!["en", "es", "pt"].includes(newLocale)) return;
  cachedLocale = newLocale;
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    let data = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) || {};
      } catch {
        data = {};
      }
    }
    data.locale = newLocale;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save settings.json:", err);
  }
}

function dict() {
  const loc = currentLocale();
  if (loc === "pt") return pt;
  if (loc === "es") return es;
  return en;
}

// Dot-path lookup, e.g. t('menu.addSession') or, for parametrized strings,
// t('sessions.errors.tooLong', 25). Falls back to the path itself instead
// of throwing so a typo'd key shows up visibly instead of crashing a
// dialog.
function t(keyPath, ...args) {
  let value = dict();
  for (const part of keyPath.split(".")) {
    value = value && value[part];
  }
  if (typeof value === "function") return value(...args);
  return value == null ? keyPath : value;
}

module.exports = { t, currentLocale, setLocale };
