const js = require('@eslint/js');
const globals = require('globals');
const playwright = require('eslint-plugin-playwright');

// ESLint flat config. Scope: the test project and its config files.
// index.html (the app itself) is a self-contained single file and is not linted here.
module.exports = [
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      '.wrangler/',
      'sw.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'prefer-const': 'error',
      'no-unused-vars': 'error',
      'no-console': 'error',
    },
  },
  {
    // Code inside page.evaluate()/addInitScript() callbacks runs in the browser.
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.js'],
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      // page.click/fill are used intentionally alongside locators in this suite.
      'playwright/prefer-locator': 'off',
      // Conditional test.skip() is used deliberately to scope tests per project
      // (e.g. controls that are hidden on the mobile viewport).
      'playwright/no-skipped-test': 'off',
    },
  },
];
