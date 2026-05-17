const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

test.describe('Theme', () => {
  test('seeded dark theme is applied to <html>', async ({ page }) => {
    await gotoOnboarded(page, { theme: 'dark', background: 'gradient-1' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('#themeToggle toggles dark -> light -> dark', async ({ page }) => {
    await gotoOnboarded(page, { theme: 'dark', background: 'gradient-1' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect((await readData(page)).theme).toBe('light');

    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await readData(page)).theme).toBe('dark');
  });

  test('theme persists across reload', async ({ page }) => {
    await gotoOnboarded(page, { theme: 'dark', background: 'gradient-1' });

    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect((await readData(page)).theme).toBe('light');
  });

  test('toggling theme swaps the background family', async ({ page }) => {
    // dark/gradient -> light/light-*
    await gotoOnboarded(page, { theme: 'dark', background: 'gradient-1' });
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect((await readData(page)).background.startsWith('light')).toBe(true);

    // light/light-* -> dark/gradient-*
    await gotoOnboarded(page, { theme: 'light', background: 'light-1' });
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await readData(page)).background.startsWith('gradient')).toBe(true);
  });
});
