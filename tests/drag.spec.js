const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

/**
 * Drive a native HTML5 drag-and-drop programmatically.
 * Playwright's mouse-based dragTo is unreliable for native DnD, so we build a
 * real DataTransfer and dispatch the DragEvent sequence the app's handlers
 * expect: dragstart on the source, dragenter/dragover/drop on the target,
 * then dragend on the source.
 */
async function html5Drag(page, fromSel, toSel) {
  await page.evaluate(({ from, to }) => {
    const dt = new DataTransfer();
    const src = document.querySelector(from);
    const tgt = document.querySelector(to);
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  }, { from: fromSel, to: toSel });
}

test.describe('Drag and drop reordering', () => {
  test('reorder quick links: drag last onto first', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'HTML5 drag tested on desktop only');
    await gotoOnboarded(page, {
      links: [
        { name: 'Alpha', url: 'https://a.example', key: '' },
        { name: 'Beta', url: 'https://b.example', key: '' },
        { name: 'Gamma', url: 'https://c.example', key: '' },
      ],
    });
    await expect(page.locator('#quickLinks a.quick-link')).toHaveCount(3);

    // Drag Gamma (idx 2) onto Alpha (idx 0): splice removes Gamma then inserts
    // it at index 0 -> [Gamma, Alpha, Beta].
    await html5Drag(
      page,
      '#quickLinks a.quick-link[data-idx="2"]',
      '#quickLinks a.quick-link[data-idx="0"]'
    );

    await expect.poll(async () => (await readData(page)).links.map(l => l.name))
      .toEqual(['Gamma', 'Alpha', 'Beta']);

    await expect(page.locator('#quickLinks a.quick-link span:not(.key)'))
      .toHaveText(['Gamma', 'Alpha', 'Beta']);
  });

  test('reorder todos within Today tab: drag last onto first', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'HTML5 drag tested on desktop only');
    await gotoOnboarded(page, {
      todos: {
        today: [
          { text: 'T1', completed: false },
          { text: 'T2', completed: false },
          { text: 'T3', completed: false },
        ],
        week: [],
        later: [],
      },
    });
    await expect(page.locator('#todoList .todo-item')).toHaveCount(3);

    // Drag T3 (idx 2) onto T1 (idx 0): splice removes T3 then inserts at 0
    // -> [T3, T1, T2].
    await html5Drag(
      page,
      '#todoList .todo-item[data-idx="2"]',
      '#todoList .todo-item[data-idx="0"]'
    );

    await expect.poll(async () => (await readData(page)).todos.today.map(t => t.text))
      .toEqual(['T3', 'T1', 'T2']);

    await expect(page.locator('#todoList .todo-item .todo-text'))
      .toHaveText(['T3', 'T1', 'T2']);
  });

  test('reorder dashboard cards: drag last card before first', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'HTML5 drag tested on desktop only');
    await gotoOnboarded(page);
    await expect.poll(async () => (await readData(page)).cardOrder)
      .toEqual(['countdown', 'pomodoro', 'vocab', 'todo']);

    // Drag the 'todo' card (DOM idx 3) onto 'countdown' (DOM idx 0). swapCards
    // sees idx1 > idx2 so it places the dragged card *before* the target,
    // yielding ['todo', 'countdown', 'pomodoro', 'vocab'].
    await html5Drag(
      page,
      '#dashboard .card[data-card-id="todo"]',
      '#dashboard .card[data-card-id="countdown"]'
    );

    await expect.poll(async () => (await readData(page)).cardOrder)
      .toEqual(['todo', 'countdown', 'pomodoro', 'vocab']);

    const domOrder = await page.locator('#dashboard .card[data-card-id]')
      .evaluateAll(cards => cards.map(c => c.dataset.cardId));
    expect(domOrder).toEqual(['todo', 'countdown', 'pomodoro', 'vocab']);
  });
});
