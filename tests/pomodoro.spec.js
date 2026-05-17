const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

test.describe('Pomodoro feature', () => {
  test('shows the initial work state', async ({ page }) => {
    await gotoOnboarded(page);

    await expect(page.locator('#pomodoroTime')).toHaveText('25:00');
    await expect(page.locator('#pomodoroStatus')).toHaveText('专注');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('开始');
  });

  test('starts the timer and counts down', async ({ page }) => {
    await gotoOnboarded(page);

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('暂停');

    // Real-time timer ticks every 1s; give it a generous window to decrement.
    await expect(page.locator('#pomodoroTime')).not.toHaveText('25:00', {
      timeout: 5000,
    });
  });

  test('pauses the timer and freezes the time', async ({ page }) => {
    await gotoOnboarded(page);

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('暂停');

    // Let it tick at least once so the time is no longer the initial value.
    await expect(page.locator('#pomodoroTime')).not.toHaveText('25:00', {
      timeout: 5000,
    });

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('开始');

    const frozen = await page.locator('#pomodoroTime').textContent();
    // Verifying the paused timer does NOT change inherently requires real time.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1500);
    await expect(page.locator('#pomodoroTime')).toHaveText(frozen);
  });

  test('resets the timer back to the initial work state', async ({ page }) => {
    await gotoOnboarded(page);

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroTime')).not.toHaveText('25:00', {
      timeout: 5000,
    });

    await page.click('#pomodoroResetBtn');

    await expect(page.locator('#pomodoroTime')).toHaveText('25:00');
    await expect(page.locator('#pomodoroStatus')).toHaveText('专注');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('开始');
  });

  test('has exactly 4 phase indicator dots', async ({ page }) => {
    await gotoOnboarded(page);

    await expect(page.locator('.pomodoro-phase')).toHaveCount(4);
  });

  test('persists timerRunning as false after pause', async ({ page }) => {
    await gotoOnboarded(page);

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('暂停');

    await expect
      .poll(async () => (await readData(page)).pomodoro.timerRunning)
      .toBe(true);

    await page.click('#pomodoroStartBtn');
    await expect(page.locator('#pomodoroStartBtn')).toHaveText('开始');

    await expect
      .poll(async () => (await readData(page)).pomodoro.timerRunning)
      .toBe(false);
  });
});
