const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

// Format a Date as YYYY-MM-DD in local time.
function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

test.describe('Countdown', () => {
  test('empty state', async ({ page }) => {
    await gotoOnboarded(page, { countdowns: [] });
    const empty = page.locator('#countdownList .empty-state');
    await expect(empty).toHaveCount(1);
    await expect(empty).toContainText('暂无');
  });

  test('renders a seeded countdown', async ({ page }) => {
    const future = fmt(daysFromNow(120));
    await gotoOnboarded(page, {
      countdowns: [{ name: 'My Trip', date: future, repeat: false }],
    });
    const item = page.locator('#countdownList .countdown-item');
    await expect(item).toHaveCount(1);
    await expect(item.locator('.countdown-name')).toContainText('My Trip');
    const days = await item.locator('.countdown-days').innerText();
    expect(Number(days)).toBeGreaterThan(0);
  });

  test('add a countdown via modal', async ({ page }) => {
    await gotoOnboarded(page, { countdowns: [] });
    const future = fmt(daysFromNow(90));

    await page.click('#addCountdownBtn');
    await expect(page.locator('#countdownModal')).toHaveClass(/active/);

    await page.fill('#countdownName', 'Launch Day');
    await page.fill('#countdownDate', future);
    await page.click('#saveCountdownBtn');

    await expect(page.locator('#countdownModal')).not.toHaveClass(/active/);
    const data = await readData(page);
    expect(data.countdowns.some(c => c.name === 'Launch Day' && c.date === future)).toBe(true);
    await expect(page.locator('#countdownList .countdown-item')).toContainText(['Launch Day']);
  });

  test('repeat option', async ({ page }) => {
    await gotoOnboarded(page, { countdowns: [] });
    const future = fmt(daysFromNow(100));

    await page.click('#addCountdownBtn');
    await expect(page.locator('#countdownModal')).toHaveClass(/active/);

    await page.fill('#countdownName', 'Birthday');
    await page.fill('#countdownDate', future);
    await page.check('#countdownRepeat');
    await page.click('#saveCountdownBtn');

    const data = await readData(page);
    const entry = data.countdowns.find(c => c.name === 'Birthday');
    expect(entry).toBeTruthy();
    expect(entry.repeat).toBe(true);
    await expect(
      page.locator('#countdownList .countdown-item', { hasText: 'Birthday' }).locator('.countdown-name')
    ).toContainText('🔁');
  });

  test('delete a countdown', async ({ page }, testInfo) => {
    // The .countdown-delete button is `display:none` on mobile.
    test.skip(testInfo.project.name === 'mobile', 'delete button hidden on mobile');
    const future = fmt(daysFromNow(60));
    await gotoOnboarded(page, {
      countdowns: [{ name: 'Removable', date: future, repeat: false }],
    });
    const item = page.locator('#countdownList .countdown-item');
    await expect(item).toHaveCount(1);

    // The delete button is only `pointer-events:auto` while the item is hovered,
    // and hovering applies a transform — use force to avoid the stability race.
    await item.hover();
    await item.locator('button.countdown-delete').click({ force: true });

    await expect.poll(async () => (await readData(page)).countdowns.length).toBe(0);
    await expect(page.locator('#countdownList .empty-state')).toContainText('暂无');
  });

  test('validation: empty fields show alert and keep modal open', async ({ page }) => {
    await gotoOnboarded(page, { countdowns: [] });

    const msgs = [];
    page.on('dialog', d => { msgs.push(d.message()); d.dismiss(); });

    await page.click('#addCountdownBtn');
    await expect(page.locator('#countdownModal')).toHaveClass(/active/);
    await page.click('#saveCountdownBtn');

    await expect.poll(() => msgs.length).toBeGreaterThan(0);
    expect(msgs.some(m => m.includes('请填写'))).toBe(true);
    await expect(page.locator('#countdownModal')).toHaveClass(/active/);
  });

  test('urgency classes', async ({ page }) => {
    await gotoOnboarded(page, {
      countdowns: [
        { name: 'Urgent One', date: fmt(daysFromNow(2)), repeat: false },
        { name: 'Soon One', date: fmt(daysFromNow(5)), repeat: false },
      ],
    });
    await expect(page.locator('#countdownList .countdown-item.urgent')).toHaveCount(1);
    await expect(page.locator('#countdownList .countdown-item.soon')).toHaveCount(1);
  });
});
