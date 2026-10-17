import js from "@eslint/js";

const nodeGlobals = {
  require: "readonly",
  module: "readonly",
  process: "readonly",
  __dirname: "readonly",
  console: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
};

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  location: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
  Node: "readonly",
  DOMParser: "readonly",
  localStorage: "readonly",
};

export default [
  js.configs.recommended,
  {
    files: ["app/**/*.js", "scripts/**/*.js"],
    ignores: [
      "app/screenSharing/picker.js",
      "app/sessions/dialog.js",
      "app/sessions/delete-dialog.js",
      "app/sessions/rename-dialog.js",
      "app/deepLinks/settings-dialog.js",
      "app/router/picker.js",
      "app/i18n/renderer-strings.js",
      "app/updater/changelog-dialog.js",
      "app/sessionColor/dialog.js",
      "app/mainWindow/titlebar-renderer.js",
      "app/sessions/modal.js",
      "app/sessions/delete-modal.js",
      "app/about/modal.js",
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: [
      "app/screenSharing/picker.js",
      "app/sessions/dialog.js",
      "app/sessions/delete-dialog.js",
      "app/sessions/rename-dialog.js",
      "app/deepLinks/settings-dialog.js",
      "app/router/picker.js",
      "app/i18n/renderer-strings.js",
      "app/updater/changelog-dialog.js",
      "app/sessionColor/dialog.js",
      "app/mainWindow/titlebar-renderer.js",
      "app/sessions/modal.js",
      "app/sessions/delete-modal.js",
      "app/about/modal.js",
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: browserGlobals,
    },
  },
];
