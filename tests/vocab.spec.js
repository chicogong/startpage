const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

// A deterministic seed word so tests don't depend on app defaults or the network.
function seedWord(extra = {}) {
  return {
    word: 'serendipity',
    phonetic: '/ˌserənˈdɪpɪti/',
    meaning: '机缘巧合',
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    nextReview: null,
    ...extra,
  };
}

test('renders a seeded word with a reveal button', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await expect(page.locator('#vocabWord')).toHaveText('serendipity');
  await expect(page.locator('#vocabActions .vocab-btn-reveal')).toHaveCount(1);
  await expect(page.locator('#vocabActions .vocab-btn-reveal')).toContainText('显示答案');
});

test('clicking the flashcard reveals the meaning and rating buttons', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await expect(page.locator('#vocabMeaning')).not.toHaveClass(/show/);

  await page.locator('#vocabFlashcard').click();

  await expect(page.locator('#vocabMeaning')).toHaveClass(/show/);
  await expect(page.locator('#vocabActions .vocab-btn')).toHaveCount(4);
});

test('rating a word adds it to todayLearned and updates the count', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await page.locator('#vocabFlashcard').click();
  await expect(page.locator('#vocabActions .vocab-btn')).toHaveCount(4);

  await page.locator('#vocabActions .vocab-btn.good').click();

  await expect(page.locator('#vocabTodayCount')).toHaveText('1');

  const data = await readData(page);
  expect(data.vocab.todayLearned).toContain('serendipity');
});

test('rating updates SM-2 state (repetition and nextReview)', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await page.locator('#vocabFlashcard').click();
  await expect(page.locator('#vocabActions .vocab-btn')).toHaveCount(4);

  await page.locator('#vocabActions .vocab-btn.good').click();
  await expect(page.locator('#vocabTodayCount')).toHaveText('1');

  const data = await readData(page);
  const word = data.vocab.words.find((w) => w.word === 'serendipity');
  expect(word).toBeTruthy();
  expect(word.repetition).toBeGreaterThan(0);
  expect(word.nextReview).not.toBeNull();
  expect(typeof word.nextReview).toBe('string');
  expect(Number.isNaN(Date.parse(word.nextReview))).toBe(false);
});

test('shows the completion state when there are no words', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [] } });

  // With an empty queue the app renders the completion state into #vocabFlashcard.
  // (#vocabCounter is set to '完成' first, but it lives inside #vocabFlashcard and
  // is removed when the flashcard's innerHTML is replaced, so we assert on the
  // surviving completion content instead.)
  await expect(page.locator('#vocabFlashcard')).toContainText('今日完成!');
  await expect(page.locator('#vocabFlashcard .vocab-complete')).toBeVisible();
});

test('adds a word through the vocab modal', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await page.locator('#manageVocabBtn').click();
  await expect(page.locator('#vocabModal')).toHaveClass(/active/);

  await page.locator('#vocabInput').fill('epiphany | /ɪˈpɪfəni/ | 顿悟');
  await page.locator('#saveVocabBtn').click();

  await expect(page.locator('#vocabModal')).not.toHaveClass(/active/);

  const data = await readData(page);
  expect(data.vocab.words.some((w) => w.word === 'epiphany')).toBe(true);
});

test('does not add a duplicate word', async ({ page }) => {
  await gotoOnboarded(page, { vocab: { words: [seedWord()] } });

  await page.locator('#manageVocabBtn').click();
  await expect(page.locator('#vocabModal')).toHaveClass(/active/);

  await page.locator('#vocabInput').fill('serendipity | /ˌserənˈdɪpɪti/ | 机缘巧合');
  await page.locator('#saveVocabBtn').click();

  await expect(page.locator('#vocabModal')).not.toHaveClass(/active/);

  const data = await readData(page);
  const matches = data.vocab.words.filter((w) => w.word === 'serendipity');
  expect(matches).toHaveLength(1);
});
