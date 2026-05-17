const { test, expect } = require('@playwright/test');
const { gotoOnboarded, readData } = require('./helpers');

test.describe('Todo feature', () => {
  test('renders seeded today todos', async ({ page }) => {
    await gotoOnboarded(page, {
      todos: {
        today: [
          { text: 'Task A', completed: false },
          { text: 'Task B', completed: true },
        ],
        week: [],
        later: [],
      },
    });

    const items = page.locator('#todoList .todo-item');
    await expect(items).toHaveCount(2);
    await expect(page.locator('#todoList')).toContainText('Task A');
    await expect(page.locator('#todoList')).toContainText('Task B');

    const taskB = page.locator('#todoList .todo-item', { hasText: 'Task B' });
    await expect(taskB).toHaveClass(/completed/);
    const taskA = page.locator('#todoList .todo-item', { hasText: 'Task A' });
    await expect(taskA).not.toHaveClass(/completed/);
  });

  test('adds a todo via the add button', async ({ page }) => {
    await gotoOnboarded(page, { todos: { today: [], week: [], later: [] } });

    await page.fill('#todoInput', 'New via button');
    await page.click('#addTodoBtn');

    await expect(page.locator('#todoList')).toContainText('New via button');
    await expect(page.locator('#todoInput')).toHaveValue('');

    const data = await readData(page);
    expect(data.todos.today[0].text).toBe('New via button');
    expect(data.todos.today[0].completed).toBe(false);
  });

  test('adds a todo via the Enter key', async ({ page }) => {
    await gotoOnboarded(page, { todos: { today: [], week: [], later: [] } });

    await page.fill('#todoInput', 'New via enter');
    await page.press('#todoInput', 'Enter');

    await expect(page.locator('#todoList')).toContainText('New via enter');
    await expect(page.locator('#todoInput')).toHaveValue('');

    const data = await readData(page);
    expect(data.todos.today[0].text).toBe('New via enter');
  });

  test('toggles a todo complete', async ({ page }) => {
    await gotoOnboarded(page, {
      todos: {
        today: [{ text: 'Toggle me', completed: false }],
        week: [],
        later: [],
      },
    });

    const item = page.locator('#todoList .todo-item', { hasText: 'Toggle me' });
    await expect(item).not.toHaveClass(/completed/);

    await item.locator('.todo-checkbox').click();
    await expect(item).toHaveClass(/completed/);

    const data = await readData(page);
    expect(data.todos.today[0].completed).toBe(true);
  });

  test('switches tabs to show that category', async ({ page }) => {
    await gotoOnboarded(page, {
      todos: {
        today: [{ text: 'Today item', completed: false }],
        week: [{ text: 'Week item', completed: false }],
        later: [],
      },
    });

    await expect(page.locator('#todoList')).toContainText('Today item');

    await page.click('.todo-tab[data-tab="week"]');
    await expect(page.locator('.todo-tab[data-tab="week"]')).toHaveClass(/active/);

    await expect(page.locator('#todoList')).toContainText('Week item');
    await expect(page.locator('#todoList')).not.toContainText('Today item');
  });

  test('adds a todo to the week category while week tab is active', async ({ page }) => {
    await gotoOnboarded(page, { todos: { today: [], week: [], later: [] } });

    await page.click('.todo-tab[data-tab="week"]');
    await expect(page.locator('.todo-tab[data-tab="week"]')).toHaveClass(/active/);

    await page.fill('#todoInput', 'Week task');
    await page.click('#addTodoBtn');

    await expect(page.locator('#todoList')).toContainText('Week task');

    const data = await readData(page);
    expect(data.todos.week[0].text).toBe('Week task');
    expect(data.todos.today).toHaveLength(0);
  });

  test('deletes a todo', async ({ page }) => {
    await gotoOnboarded(page, {
      todos: {
        today: [
          { text: 'Keep me', completed: false },
          { text: 'Delete me', completed: false },
        ],
        week: [],
        later: [],
      },
    });

    const target = page.locator('#todoList .todo-item', { hasText: 'Delete me' });
    await target.locator('.todo-action-btn').click();

    await expect(page.locator('#todoList .todo-item')).toHaveCount(1);
    await expect(page.locator('#todoList')).not.toContainText('Delete me');
    await expect(page.locator('#todoList')).toContainText('Keep me');

    const data = await readData(page);
    expect(data.todos.today.map((t) => t.text)).toEqual(['Keep me']);
  });

  test('archives all completed todos across categories', async ({ page }) => {
    // archiveTodos() filters directly without a confirm dialog, but accept any
    // dialog defensively in case the app changes.
    page.on('dialog', (d) => d.accept());

    await gotoOnboarded(page, {
      todos: {
        today: [
          { text: 'Today done', completed: true },
          { text: 'Today open', completed: false },
        ],
        week: [
          { text: 'Week done', completed: true },
          { text: 'Week open', completed: false },
        ],
        later: [{ text: 'Later done', completed: true }],
      },
    });

    await page.click('#archiveTodosBtn');

    await expect
      .poll(async () => {
        const data = await readData(page);
        return [
          ...data.todos.today,
          ...data.todos.week,
          ...data.todos.later,
        ].map((t) => t.text);
      })
      .toEqual(['Today open', 'Week open']);

    const data = await readData(page);
    const allCompleted = [
      ...data.todos.today,
      ...data.todos.week,
      ...data.todos.later,
    ].some((t) => t.completed);
    expect(allCompleted).toBe(false);
  });
});
