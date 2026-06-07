// @ts-check
// Direct coverage for HistoryStore — the Repository over localStorage.
// We exercise it through window.__clock._history to avoid duplicating the
// (already-tested) end-to-end full-session path here.
const { test, expect } = require('@playwright/test');

const KEY = 'clock-toy-gym';

test.describe('HistoryStore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
  });

  test('load() on an empty store returns []', async ({ page }) => {
    const out = await page.evaluate(() => window.__clock._history.load());
    expect(out).toEqual([]);
  });

  test('push() appends and persists to localStorage', async ({ page }) => {
    const out = await page.evaluate((k) => {
      const h = window.__clock._history;
      h.push({ date: '2026-01-01', mode: 'drill1', difficulty: 'easy', correct: 8, total: 10, acc: 80, avgLatMs: 1234 });
      return { fromLoad: h.load(), fromLS: JSON.parse(localStorage.getItem(k)) };
    }, KEY);
    expect(out.fromLoad).toHaveLength(1);
    expect(out.fromLoad[0]).toMatchObject({ mode: 'drill1', difficulty: 'easy', correct: 8 });
    expect(out.fromLS).toEqual(out.fromLoad);
  });

  test('push() caps history at 20 entries (oldest dropped)', async ({ page }) => {
    const out = await page.evaluate(() => {
      const h = window.__clock._history;
      for (let i = 0; i < 25; i++) {
        h.push({ date: `d-${i}`, mode: 'drill1', difficulty: 'easy', correct: i, total: 10, acc: i * 10, avgLatMs: 1 });
      }
      const list = h.load();
      return { length: list.length, first: list[0].date, last: list[list.length - 1].date };
    });
    expect(out.length).toBe(20);
    expect(out.first).toBe('d-5');   // 25 pushes → kept last 20 = d-5 .. d-24
    expect(out.last).toBe('d-24');
  });

  test('clear() empties the store', async ({ page }) => {
    const out = await page.evaluate(() => {
      const h = window.__clock._history;
      h.push({ date: 'x', mode: 'm', difficulty: 'd', correct: 0, total: 0, acc: 0, avgLatMs: 0 });
      h.clear();
      return { afterClear: h.load(), raw: localStorage.getItem('clock-toy-gym') };
    });
    expect(out.afterClear).toEqual([]);
    expect(out.raw).toBeNull();
  });

  test('load() recovers from malformed JSON by returning []', async ({ page }) => {
    const out = await page.evaluate((k) => {
      localStorage.setItem(k, '{not valid json');
      return window.__clock._history.load();
    }, KEY);
    expect(out).toEqual([]);
  });
});
