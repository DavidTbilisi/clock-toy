// @ts-check
// DOM-render coverage for StatsView and SummaryView branches that depend on
// numeric thresholds (accuracy ring colour, latency-bar colour, each of the
// four verdict outcomes).
const { test, expect } = require('@playwright/test');

/** Seed `n` round results with the given pattern then trigger updateStats(). */
async function seedResultsAndUpdate(page, mode, diff, results) {
  await page.evaluate(({ mode, diff, results }) => {
    pickMode(mode); pickDifficulty(diff);
    const store = window.__clock._store;
    // Drop the auto-started round so we can rebuild results from scratch.
    store.resetSession();
    store.results = results;
    // Re-derive the streak from the seeded tail of results.
    let streak = 0;
    for (const r of results) {
      streak = r.correct ? streak + 1 : 0;
    }
    store.streak = streak;
    store.cur = results.length;
  }, { mode, diff, results });
}

test.describe('SummaryView — each verdict branch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((k) => localStorage.removeItem(k), 'clock-toy-gym');
  });

  /** Seed exactly `correctCount` correct rounds, the rest wrong, fast latency. */
  async function showSummaryWith(page, diff, correctCount, latPerRound) {
    await page.evaluate(({ diff, correctCount, latPerRound }) => {
      pickMode('drill1'); pickDifficulty(diff);
      const store = window.__clock._store;
      const summary = window.__clock._summary;
      store.results = Array.from({ length: 10 }, (_, i) => ({
        correct: i < correctCount, latency: latPerRound,
        timeout: false, type: 'drill1', errors: i < correctCount ? [] : ['hour hand'],
      }));
      store.cur = 10;
      summary.show();
    }, { diff, correctCount, latPerRound });
  }

  test('"Promote" verdict (acc >= 0.90 AND avgLat <= plateau)', async ({ page }) => {
    // Medium plateau = 9000ms.
    await showSummaryWith(page, 'medium', 10, 2000);
    await expect(page.locator('.vbanner')).toContainText('Promote');
    await expect(page.locator('.vbanner b')).toContainText('Hard');
  });

  test('"Pass" verdict (0.80 <= acc < 0.90, OR fast enough but slow latency)', async ({ page }) => {
    await showSummaryWith(page, 'medium', 8, 2000);
    await expect(page.locator('.vbanner')).toContainText('Pass');
  });

  test('"Keep going" verdict (0.60 <= acc < 0.80)', async ({ page }) => {
    await showSummaryWith(page, 'medium', 6, 5000);
    await expect(page.locator('.vbanner')).toContainText('Keep going');
  });

  test('"Try Easy" verdict (acc < 0.60)', async ({ page }) => {
    await showSummaryWith(page, 'medium', 3, 5000);
    await expect(page.locator('.vbanner')).toContainText('Try Easy');
  });

  test('error chart shows a row per non-zero error kind', async ({ page }) => {
    await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('medium');
      const store = window.__clock._store;
      const summary = window.__clock._summary;
      store.results = [
        { correct: false, latency: 1000, timeout: false, type: 'drill1', errors: ['hour hand'] },
        { correct: false, latency: 1000, timeout: false, type: 'drill1', errors: ['minute slider'] },
        { correct: true,  latency: 1000, timeout: false, type: 'drill1', errors: [] },
      ];
      store.cur = 3;
      summary.show();
    });
    await expect(page.locator('.error-row')).toHaveCount(2);
    await expect(page.locator('.error-row').nth(0)).toContainText('hour hand');
    await expect(page.locator('.error-row').nth(1)).toContainText('minute slider');
  });

  test('error chart shows "No misses" when every round was correct', async ({ page }) => {
    await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('medium');
      const store = window.__clock._store;
      const summary = window.__clock._summary;
      store.results = Array.from({ length: 10 }, () => ({
        correct: true, latency: 1000, timeout: false, type: 'drill1', errors: [],
      }));
      store.cur = 10;
      summary.show();
    });
    await expect(page.locator('.error-row')).toHaveCount(1);
    await expect(page.locator('.error-row')).toContainText('No misses');
  });
});

test.describe('Round — onTimeout', () => {
  test('onTimeout fires after the timer hits 0 (synthesised) and shows timeout feedback', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('easy');
      // Backdate the timer start beyond the timer length so the next tick fires.
      const T = 25;  // easy timer (seconds)
      window.__clock._store.timerStart = Date.now() - (T + 2) * 1000;
    });
    // Wait for the next tick (100ms interval) to detect timeout.
    await expect(page.locator('#fb.bad')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#fb .fv')).toContainText("Time's up");
  });
});
