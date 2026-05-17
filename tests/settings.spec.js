const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

test('opens and closes the settings modal', async ({ page }) => {
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#closeSettingsModal').click();
  await expect(page.locator('#settingsModal')).not.toHaveClass(/active/);
});

test('selecting a background updates state and marks the swatch active', async ({ page }) => {
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  const swatch = page.locator('.bg-option[data-bg="gradient-2"]');
  await swatch.click();

  await expect(swatch).toHaveClass(/active/);

  const data = await readData(page);
  expect(data.background).toBe('gradient-2');
});

test('selecting a light background switches the theme to light', async ({ page }) => {
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('.bg-option[data-bg="light-2"]').click();

  const data = await readData(page);
  expect(data.background).toBe('light-2');
  expect(data.theme).toBe('light');
});

test('export data button opens the export modal', async ({ page }) => {
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#exportDataBtn').click();
  await expect(page.locator('#exportModal')).toHaveClass(/active/);
});

test('reset onboarding re-shows the onboarding modal', async ({ page }) => {
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#resetOnboardingBtn').click();
  await expect(page.locator('#onboardingModal')).toHaveClass(/active/);

  const data = await readData(page);
  expect(data.onboarded).toBe(false);
});

test('clear data wipes storage and returns to a fresh state', async ({ page }) => {
  await gotoOnboarded(page);

  // Accept the confirm() dialog so clearData() proceeds.
  page.on('dialog', (d) => d.accept());

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#clearDataBtn').click();

  // clearData() removes the key and reloads — onboarding should re-appear.
  await expect(page.locator('#onboardingModal')).toHaveClass(/active/);

  const data = await readData(page);
  expect(!data || data.onboarded !== true).toBe(true);
});
