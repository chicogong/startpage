const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { gotoOnboarded, gotoFresh, readData } = require('./helpers');

async function openExportModal(page) {
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);
  await page.locator('#exportDataBtn').click();
  await expect(page.locator('#exportModal')).toHaveClass(/active/);
  // Opening the export modal closes the settings modal underneath it, so the
  // two overlays never stack.
  await expect(page.locator('#settingsModal')).not.toHaveClass(/active/);
}

test('export modal shows three export options', async ({ page }) => {
  await gotoOnboarded(page);

  await openExportModal(page);

  await expect(page.locator('#exportAll')).toBeVisible();
  await expect(page.locator('#exportLinks')).toBeVisible();
  await expect(page.locator('#exportVocab')).toBeVisible();
});

test('exportAll downloads a JSON backup of the seeded data', async ({ page }) => {
  const seededLinks = [{ name: 'Seeded', url: 'https://seed.example', key: 'z' }];
  await gotoOnboarded(page, { links: seededLinks });

  await openExportModal(page);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportAll').click();
  const download = await downloadPromise;

  const filename = download.suggestedFilename();
  expect(filename.startsWith('startpage-backup-')).toBe(true);
  expect(filename.endsWith('.json')).toBe(true);

  const content = fs.readFileSync(await download.path(), 'utf8');
  const parsed = JSON.parse(content);
  expect(parsed.version).toBe('1.0');
  expect(parsed.data.links).toEqual(seededLinks);

  await expect(page.locator('#exportModal')).not.toHaveClass(/active/);
});

test('exportLinks downloads a links text file', async ({ page }) => {
  const seededLinks = [
    { name: 'WithKey', url: 'https://withkey.example', key: 'k' },
    { name: 'NoKey', url: 'https://nokey.example', key: '' }
  ];
  await gotoOnboarded(page, { links: seededLinks });

  await openExportModal(page);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportLinks').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('startpage-links.txt');

  const content = fs.readFileSync(await download.path(), 'utf8');
  const lines = content.split('\n');
  expect(lines).toContain('WithKey | https://withkey.example | k');
  expect(lines).toContain('NoKey | https://nokey.example');
});

test('exportVocab downloads a vocab JSON file', async ({ page }) => {
  const seededVocab = {
    words: [
      {
        word: 'distinctiveword',
        phonetic: '/d/',
        meaning: '独特词',
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        nextReview: null
      }
    ],
    dailyNew: 5,
    todayLearned: [],
    streak: 0,
    lastStudyDate: null
  };
  await gotoOnboarded(page, { vocab: seededVocab });

  await openExportModal(page);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportVocab').click();
  const download = await downloadPromise;

  const filename = download.suggestedFilename();
  expect(filename.startsWith('startpage-vocab-')).toBe(true);
  expect(filename.endsWith('.json')).toBe(true);

  const content = fs.readFileSync(await download.path(), 'utf8');
  const parsed = JSON.parse(content);
  expect(parsed.vocab.words.some((w) => w.word === 'distinctiveword')).toBe(true);
});

test('importing a full backup replaces the app state', async ({ page }) => {
  await gotoOnboarded(page);

  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      theme: 'light',
      background: 'light-1',
      customBg: '',
      links: [{ name: 'Imported', url: 'https://imported.example', key: '' }],
      countdowns: [],
      todos: { today: [], week: [], later: [] },
      vocab: { words: [], dailyNew: 5, todayLearned: [], streak: 0, lastStudyDate: null }
    }
  };

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#importFileInput').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });

  await expect(async () => {
    const data = await readData(page);
    expect(data.theme).toBe('light');
    expect(data.links.some((l) => l.name === 'Imported')).toBe(true);
  }).toPass();
});

test('importing a vocab-only file replaces the vocab list', async ({ page }) => {
  await gotoOnboarded(page);

  const vocabFile = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    vocab: {
      words: [
        {
          word: 'imported',
          phonetic: '/x/',
          meaning: 'm',
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          nextReview: null
        }
      ],
      dailyNew: 5,
      todayLearned: [],
      streak: 0,
      lastStudyDate: null
    }
  };

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#importFileInput').setInputFiles({
    name: 'vocab.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(vocabFile))
  });

  await expect(async () => {
    const data = await readData(page);
    expect(data.vocab.words.some((w) => w.word === 'imported')).toBe(true);
  }).toPass();
});

test('importing malformed JSON alerts and leaves data unchanged', async ({ page }) => {
  await gotoOnboarded(page);

  const before = await readData(page);

  let alertMessage = '';
  page.on('dialog', (d) => {
    alertMessage = d.message();
    d.accept();
  });

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#importFileInput').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json{')
  });

  await expect(() => {
    expect(alertMessage).toContain('导入失败');
  }).toPass();

  const after = await readData(page);
  expect(after).toEqual(before);
});

test('round-trip: exported backup restores distinctive data on import', async ({ page }) => {
  const distinctiveLinks = [
    { name: 'RoundTrip', url: 'https://roundtrip.example', key: 'r' }
  ];
  await gotoOnboarded(page, { links: distinctiveLinks });

  await openExportModal(page);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportAll').click();
  const download = await downloadPromise;
  const content = fs.readFileSync(await download.path(), 'utf8');

  await gotoFresh(page);
  await gotoOnboarded(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/active/);

  await page.locator('#importFileInput').setInputFiles({
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content)
  });

  await expect(async () => {
    const data = await readData(page);
    expect(data.links).toEqual(distinctiveLinks);
  }).toPass();
});
