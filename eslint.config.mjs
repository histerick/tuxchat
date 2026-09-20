import js from '@eslint/js';

const nodeGlobals = {
  require: 'readonly',
  module: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  URL: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
};

export default [
  js.configs.recommended,
  {
    files: ['app/**/*.js', 'scripts/**/*.js'],
    ignores: ['app/screenSharing/picker.js'],
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
    files: ['app/screenSharing/picker.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: browserGlobals,
    },
  },
];
