const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

test.describe('Quick Links', () => {
  test('renders seeded links', async ({ page }) => {
    await gotoOnboarded(page, {
      links: [{ name: 'GitHub', url: 'https://github.com', key: 'g' }],
    });
    const links = page.locator('#quickLinks a.quick-link');
    await expect(links).toHaveCount(1);
    await expect(links.first()).toContainText('GitHub');
    await expect(links.first().locator('span.key')).toHaveText('g');
  });

  test('add a link via #linkModal', async ({ page }, testInfo) => {
    // The .add-link-btn is `display:none` on mobile (links are read-only there).
    test.skip(testInfo.project.name === 'mobile', 'add-link button hidden on mobile');
    await gotoOnboarded(page, { links: [] });
    await page.locator('#quickLinks .add-link-btn').click();
    await expect(page.locator('#linkModal')).toHaveClass(/active/);

    await page.fill('#linkName', 'Example');
    await page.fill('#linkUrl', 'https://example.com');
    await page.fill('#linkKey', 'e');
    await page.click('#saveLinkBtn');

    await expect(page.locator('#linkModal')).not.toHaveClass(/active/);
    const data = await readData(page);
    expect(data.links.some(l => l.name === 'Example' && l.url === 'https://example.com')).toBe(true);
    await expect(page.locator('#quickLinks a.quick-link')).toContainText(['Example']);
  });

  test('URL without scheme gets https:// prepended', async ({ page }, testInfo) => {
    // The .add-link-btn is `display:none` on mobile (links are read-only there).
    test.skip(testInfo.project.name === 'mobile', 'add-link button hidden on mobile');
    await gotoOnboarded(page, { links: [] });
    await page.locator('#quickLinks .add-link-btn').click();
    await expect(page.locator('#linkModal')).toHaveClass(/active/);

    await page.fill('#linkName', 'NoScheme');
    await page.fill('#linkUrl', 'example.com');
    await page.click('#saveLinkBtn');

    const data = await readData(page);
    const link = data.links.find(l => l.name === 'NoScheme');
    expect(link).toBeTruthy();
    expect(link.url).toBe('https://example.com');
  });

  test('duplicate shortcut key rejected', async ({ page }, testInfo) => {
    // The .add-link-btn is `display:none` on mobile (links are read-only there).
    test.skip(testInfo.project.name === 'mobile', 'add-link button hidden on mobile');
    await gotoOnboarded(page, {
      links: [{ name: 'GitHub', url: 'https://github.com', key: 'g' }],
    });
    const before = (await readData(page)).links.length;

    const msgs = [];
    page.on('dialog', d => { msgs.push(d.message()); d.dismiss(); });

    await page.locator('#quickLinks .add-link-btn').click();
    await expect(page.locator('#linkModal')).toHaveClass(/active/);
    await page.fill('#linkName', 'GitLab');
    await page.fill('#linkUrl', 'https://gitlab.com');
    await page.fill('#linkKey', 'g');
    await page.click('#saveLinkBtn');

    await expect.poll(() => msgs.length).toBeGreaterThan(0);
    expect(msgs.some(m => m.includes('已被使用'))).toBe(true);

    const after = (await readData(page)).links.length;
    expect(after).toBe(before);
  });

  test('validation: empty name/url shows alert and keeps modal open', async ({ page }, testInfo) => {
    // The .add-link-btn is `display:none` on mobile (links are read-only there).
    test.skip(testInfo.project.name === 'mobile', 'add-link button hidden on mobile');
    await gotoOnboarded(page, { links: [] });

    const msgs = [];
    page.on('dialog', d => { msgs.push(d.message()); d.dismiss(); });

    await page.locator('#quickLinks .add-link-btn').click();
    await expect(page.locator('#linkModal')).toHaveClass(/active/);
    await page.click('#saveLinkBtn');

    await expect.poll(() => msgs.length).toBeGreaterThan(0);
    expect(msgs.some(m => m.includes('请填写'))).toBe(true);
    await expect(page.locator('#linkModal')).toHaveClass(/active/);
  });

  test('batch import adds two links', async ({ page }, testInfo) => {
    // The .batch-link-btn is `display:none` on mobile (links are read-only there).
    test.skip(testInfo.project.name === 'mobile', 'batch-link button hidden on mobile');
    await gotoOnboarded(page, { links: [] });
    const before = (await readData(page)).links.length;

    const msgs = [];
    page.on('dialog', d => { msgs.push(d.message()); d.dismiss(); });

    await page.locator('#quickLinks .batch-link-btn').click();
    await expect(page.locator('#batchLinkModal')).toHaveClass(/active/);
    await page.fill('#batchLinkInput', 'A | https://a.com | a\nB | https://b.com');
    await page.click('#saveBatchLinkBtn');

    await expect.poll(async () => (await readData(page)).links.length).toBe(before + 2);
    expect(msgs.some(m => m.includes('成功添加'))).toBe(true);
  });

  test('search filters links', async ({ page }) => {
    await gotoOnboarded(page, {
      links: [
        { name: 'GitHub', url: 'https://github.com', key: '' },
        { name: 'Google', url: 'https://google.com', key: '' },
        { name: 'Twitter', url: 'https://twitter.com', key: '' },
      ],
    });
    const links = page.locator('#quickLinks a.quick-link');
    await expect(links).toHaveCount(3);

    await page.fill('#searchInput', 'git');
    await expect(links).toHaveCount(1);
    await expect(links.first()).toContainText('GitHub');

    await page.fill('#searchInput', '');
    await expect(links).toHaveCount(3);
  });

  test('Cmd/Ctrl+K focuses search input', async ({ page }) => {
    await gotoOnboarded(page, { links: [] });
    await page.locator('body').click();

    const isMac = process.platform === 'darwin';
    await page.keyboard.press((isMac ? 'Meta' : 'Control') + '+KeyK');

    await expect(page.locator('#searchInput')).toBeFocused();
  });

  test('single-key shortcut opens a link', async ({ page }) => {
    await gotoOnboarded(page, {
      links: [{ name: 'Jump', url: 'https://example.com/jump', key: 'j' }],
    });

    // Stub window.open to record calls deterministically.
    await page.evaluate(() => {
      window.__opened = [];
      window.open = (url) => { window.__opened.push(url); return null; };
    });

    await page.locator('body').click();
    await page.keyboard.press('j');

    await expect.poll(() => page.evaluate(() => window.__opened || [])).toContain(
      'https://example.com/jump'
    );
  });
});
