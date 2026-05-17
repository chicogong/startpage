// Shared helpers for the Start Page E2E suite.
const path = require('path');

// The app is a single static file loaded over file://.
const PAGE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const STORAGE_KEY = 'startpage_data';

/**
 * Abort every non-file:// request so the suite is hermetic and fast.
 * The app pulls in Google Fonts, remote favicons and weather/dictionary APIs;
 * offline those requests stall and the page `load` event never fires. The app
 * is built to degrade gracefully when they fail, so aborting them is safe and
 * keeps tests independent of the network.
 */
async function blockExternalRequests(page) {
  await page.route('**/*', (route) => {
    if (route.request().url().startsWith('file:')) return route.continue();
    return route.abort();
  });
}

/**
 * Load the page with a cleared localStorage — simulates a brand-new visitor.
 * The onboarding modal will be active.
 */
async function gotoFresh(page) {
  await blockExternalRequests(page);
  await page.goto(PAGE_URL);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
}

/**
 * Load the page as a returning user who already finished onboarding.
 * `overrides` is shallow-merged into the seeded data; the app fills in the rest
 * of its defaults (links, countdowns, todos, vocab, ...).
 */
async function gotoOnboarded(page, overrides = {}) {
  await blockExternalRequests(page);
  await page.goto(PAGE_URL);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: { onboarded: true, ...overrides } }
  );
  await page.reload();
}

/** Read and parse the persisted app state from localStorage. */
async function readData(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

module.exports = {
  PAGE_URL,
  STORAGE_KEY,
  blockExternalRequests,
  gotoFresh,
  gotoOnboarded,
  readData,
};
