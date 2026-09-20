import js from '@eslint/js';

const nodeGlobals = {
  require: 'readonly',
  module: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  setTimeout: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  setTimeout: 'readonly',
};

export default [
  js.configs.recommended,
  {
    files: ['app/**/*.js', 'scripts/**/*.js'],
    ignores: [
      'app/screenSharing/picker.js',
      'app/sessions/dialog.js',
      'app/sessions/delete-dialog.js',
      'app/sessions/rename-dialog.js',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'app/screenSharing/picker.js',
      'app/sessions/dialog.js',
      'app/sessions/delete-dialog.js',
      'app/sessions/rename-dialog.js',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: browserGlobals,
    },
  },
];
