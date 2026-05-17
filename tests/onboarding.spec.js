const { test, expect } = require('@playwright/test');
const { gotoFresh, gotoOnboarded, readData } = require('./helpers');

const STEP_TITLES = [
  '欢迎使用 Start Page',
  '选择主题',
  '设置位置',
  '导入书签',
  '快速教程',
];

test.describe('Onboarding', () => {
  test('fresh visitor sees the onboarding modal on step 1', async ({ page }) => {
    await gotoFresh(page);

    const modal = page.locator('#onboardingModal');
    await expect(modal).toHaveClass(/\bactive\b/);

    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[0]);

    await expect(page.locator('.onboarding-dot')).toHaveCount(5);
    await expect(page.locator('.onboarding-dot.active')).toHaveCount(1);
  });

  test('returning user does not see the onboarding modal', async ({ page }) => {
    await gotoOnboarded(page);
    await expect(page.locator('#onboardingModal')).not.toHaveClass(/\bactive\b/);
  });

  test('navigating all 5 steps via the primary button', async ({ page }) => {
    await gotoFresh(page);

    for (let i = 0; i < STEP_TITLES.length; i++) {
      await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[i]);

      // The active dot index should match the current step.
      const dots = page.locator('.onboarding-dot');
      await expect(dots.nth(i)).toHaveClass(/\bactive\b/);
      await expect(page.locator('.onboarding-dot.active')).toHaveCount(1);

      if (i < STEP_TITLES.length - 1) {
        await page.locator('.onboarding-btn-primary').click();
      }
    }
  });

  test('step 2 theme selection updates html and stored data', async ({ page }) => {
    await gotoFresh(page);
    await page.locator('.onboarding-btn-primary').click(); // -> step 2
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[1]);

    // First option = 深色模式 (dark), second = 浅色模式 (light).
    const options = page.locator('.onboarding-option');

    await options.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await readData(page)).theme).toBe('dark');

    await options.nth(1).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect((await readData(page)).theme).toBe('light');
  });

  test('step 2 secondary 跳过 advances to step 3', async ({ page }) => {
    await gotoFresh(page);
    await page.locator('.onboarding-btn-primary').click(); // -> step 2
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[1]);

    await page.locator('.onboarding-btn-secondary', { hasText: '跳过' }).click();
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[2]);
  });

  test('step 4 import prepends parsed links and advances to step 5', async ({ page }) => {
    await gotoFresh(page);
    // step 1 -> 2 -> 3 -> 4
    await page.locator('.onboarding-btn-primary').click();
    await page.locator('.onboarding-btn-primary').click();
    await page.locator('.onboarding-btn-primary').click();
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[3]);

    const before = (await readData(page)).links || [];

    const importText = [
      'https://github.com',
      'My Site | https://example.com | e',
    ].join('\n');
    await page.locator('#onboardingImportText').fill(importText);

    await page.locator('.onboarding-btn-primary', { hasText: '导入' }).click();

    // Flow advances to step 5.
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[4]);

    const after = (await readData(page)).links || [];
    expect(after.length).toBe(before.length + 2);

    // Imported links are prepended, in textarea order.
    expect(after[0]).toMatchObject({ name: 'github.com', url: 'https://github.com', key: '' });
    expect(after[1]).toMatchObject({ name: 'My Site', url: 'https://example.com', key: 'e' });
  });

  test('completing onboarding persists and survives reload', async ({ page }) => {
    await gotoFresh(page);
    // Walk to step 5.
    for (let i = 0; i < 4; i++) {
      await page.locator('.onboarding-btn-primary').click();
    }
    await expect(page.locator('h2.onboarding-title')).toHaveText(STEP_TITLES[4]);

    await page.locator('.onboarding-btn-primary', { hasText: '完成' }).click();

    await expect(page.locator('#onboardingModal')).not.toHaveClass(/\bactive\b/);
    expect((await readData(page)).onboarded).toBe(true);

    await page.reload();
    await expect(page.locator('#onboardingModal')).not.toHaveClass(/\bactive\b/);
  });

  test('resetting onboarding from settings re-shows the modal', async ({ page }) => {
    await gotoOnboarded(page);
    await expect(page.locator('#onboardingModal')).not.toHaveClass(/\bactive\b/);

    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/\bactive\b/);

    await page.locator('#resetOnboardingBtn').click();
    await expect(page.locator('#onboardingModal')).toHaveClass(/\bactive\b/);
    expect((await readData(page)).onboarded).toBe(false);
  });
});
