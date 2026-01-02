const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = 'file://' + path.resolve(__dirname, 'index.html');

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(PAGE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display onboarding modal for new users', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Check if onboarding modal is visible
    const modal = page.locator('#onboardingModal');
    await expect(modal).toHaveClass(/active/);

    console.log('✓ Onboarding modal displays for new users');
  });

  test('should show welcome step with correct content', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Check welcome content
    await expect(page.locator('.onboarding-title')).toContainText('欢迎使用');

    // Check progress dots
    const dots = page.locator('.onboarding-dot');
    await expect(dots).toHaveCount(5);

    // First dot should be active
    const activeDots = page.locator('.onboarding-dot.active');
    await expect(activeDots).toHaveCount(1);

    console.log('✓ Welcome step displays correctly');
  });

  test('should navigate through all 5 steps', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Step 1: Welcome
    await expect(page.locator('.onboarding-title')).toContainText('欢迎使用');
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Step 2: Theme
    await expect(page.locator('.onboarding-title')).toContainText('选择主题');
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Step 3: Location
    await expect(page.locator('.onboarding-title')).toContainText('设置位置');
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Step 4: Import
    await expect(page.locator('.onboarding-title')).toContainText('导入书签');
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Step 5: Tutorial
    await expect(page.locator('.onboarding-title')).toContainText('快速教程');

    console.log('✓ Successfully navigated through all 5 steps');
  });

  test('should allow theme selection', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Navigate to theme step
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Click dark theme
    await page.click('text=深色模式');

    // Check if theme is applied
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');

    console.log('✓ Theme selection works');
  });

  test('should parse bookmark import correctly', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Navigate to import step (click through 3 steps)
    for (let i = 0; i < 3; i++) {
      await page.click('.onboarding-btn-primary');
      await page.waitForTimeout(300);
    }

    // Enter test bookmarks
    const testBookmarks = `https://google.com
GitHub | https://github.com | g
Twitter | https://twitter.com`;

    await page.fill('#onboardingImportText', testBookmarks);

    // Click import button (within onboarding modal)
    await page.click('#onboardingModal .onboarding-btn-primary:has-text("导入")');
    await page.waitForTimeout(500);

    // Check if links were imported
    const links = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('startpage_data'));
      return data.links;
    });

    expect(links.length).toBeGreaterThan(0);
    expect(links[0].url).toBe('https://google.com');
    expect(links[1].name).toBe('GitHub');
    expect(links[1].key).toBe('g');

    console.log('✓ Bookmark import works correctly');
  });

  test('should complete onboarding and not show again', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Complete all steps
    for (let i = 0; i < 4; i++) {
      await page.click('.onboarding-btn-primary');
      await page.waitForTimeout(300);
    }

    // Click finish on last step
    await page.click('text=完成');
    await page.waitForTimeout(300);

    // Modal should be closed
    const modal = page.locator('#onboardingModal');
    await expect(modal).not.toHaveClass(/active/);

    // Reload and check onboarding doesn't show
    await page.reload();
    await page.waitForTimeout(500);
    await expect(modal).not.toHaveClass(/active/);

    console.log('✓ Onboarding completes and does not show again');
  });

  test('should have reset onboarding button in settings', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Complete onboarding first
    for (let i = 0; i < 4; i++) {
      await page.click('.onboarding-btn-primary');
      await page.waitForTimeout(300);
    }
    await page.click('text=完成');

    // Open settings
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // Check if reset button exists
    const resetBtn = page.locator('#resetOnboardingBtn');
    await expect(resetBtn).toBeVisible();

    console.log('✓ Reset onboarding button exists in settings');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PAGE_URL);

    // Check if modal is full screen on mobile
    const modal = page.locator('.onboarding-modal');
    const box = await modal.boundingBox();

    expect(box.width).toBeGreaterThan(300);

    // Check if buttons are touch-friendly (min 48px)
    const button = page.locator('.onboarding-btn').first();
    const btnBox = await button.boundingBox();

    expect(btnBox.height).toBeGreaterThanOrEqual(48);

    console.log('✓ Mobile viewport works correctly');
  });
});

test.describe('Skip functionality', () => {
  test('should allow skipping steps', async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to step 2
    await page.click('.onboarding-btn-primary');
    await page.waitForTimeout(300);

    // Click skip button
    await page.click('text=跳过');
    await page.waitForTimeout(300);

    // Should move to next step
    await expect(page.locator('.onboarding-title')).toContainText('设置位置');

    console.log('✓ Skip functionality works');
  });
});
