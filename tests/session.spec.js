// @ts-check
const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'clock-toy-gym';

async function answerCurrentRoundCorrectly(page) {
  const round = await page.evaluate(() => window.__clock.ROUND());
  await page.evaluate(({ h, m, p }) => {
    const s = window.__clock.STATE();
    s.handH = h; s.handM = m;
    s.sliderH = h; s.sliderM = m;
    window.__clock.setPeriod(p);
    renderHands();
    renderSlider('hour');
    renderSlider('minute');
  }, { h: round.hour, m: round.minute, p: round.period });
  await page.click('#check-btn');
  await expect(page.locator('#fb.ok')).toBeVisible();
}

test.describe('full session', () => {
  test('completing 10 correct rounds shows summary + writes localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);

    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('medium'); });

    // Progress dots: all 10 start as plain `.pd`, the first is the current.
    await expect(page.locator('.pd')).toHaveCount(10);
    await expect(page.locator('.pd.cur')).toHaveCount(1);

    for (let i = 0; i < 10; i++) {
      await answerCurrentRoundCorrectly(page);
      await page.click('#next-btn');
    }

    await expect(page.locator('#summary')).toBeVisible();
    await expect(page.locator('#play')).toBeHidden();

    // Hero ring shows the score.
    await expect(page.locator('.srl-pct')).toHaveText('10/10');
    // 100% accuracy row.
    await expect(page.locator('.sum-stats')).toContainText('100%');
    // No timeouts.
    await expect(page.locator('.sum-stats')).toContainText('Timeouts');

    // localStorage entry written.
    const entries = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '[]'),
      STORAGE_KEY
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      mode: 'drill1',
      difficulty: 'medium',
      correct: 10,
      total: 10,
      acc: 100,
    });
    expect(typeof entries[0].avgLatMs).toBe('number');
    expect(entries[0].avgLatMs).toBeGreaterThan(0);
    expect(typeof entries[0].date).toBe('string');
  });

  test('localStorage history accumulates across sessions and is capped at 20', async ({ page }) => {
    await page.goto('/');
    // Seed 21 prior entries; expect the oldest to be dropped after a new session.
    await page.evaluate((key) => {
      const seed = Array.from({ length: 21 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        mode: 'drill1', difficulty: 'easy',
        correct: i, total: 10, acc: i * 10, avgLatMs: 1000,
      }));
      localStorage.setItem(key, JSON.stringify(seed));
    }, STORAGE_KEY);

    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('easy'); });
    for (let i = 0; i < 10; i++) {
      await answerCurrentRoundCorrectly(page);
      await page.click('#next-btn');
    }
    await expect(page.locator('#summary')).toBeVisible();

    const entries = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '[]'),
      STORAGE_KEY
    );
    expect(entries).toHaveLength(20);
    // Newest entry (the one we just played) is last.
    expect(entries[entries.length - 1]).toMatchObject({
      mode: 'drill1', difficulty: 'easy', correct: 10, total: 10, acc: 100,
    });
    // The oldest seeded entry (index 0) should have been dropped.
    expect(entries[0].date).not.toBe('2024-01-01T00:00:00.000Z');
  });

  test('restart same mode wipes round state but keeps mode/difficulty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('easy'); });

    for (let i = 0; i < 10; i++) {
      await answerCurrentRoundCorrectly(page);
      await page.click('#next-btn');
    }
    await expect(page.locator('#summary')).toBeVisible();

    await page.getByRole('button', { name: /Try again/ }).click();
    await expect(page.locator('#play')).toBeVisible();
    await expect(page.locator('#summary')).toBeHidden();
    await expect(page.locator('#mode-pill')).toHaveText('Set the Clock · Easy');
    // Progress is reset.
    await expect(page.locator('.pd.done-ok')).toHaveCount(0);
    await expect(page.locator('.pd.cur')).toHaveCount(1);
  });

  test('back-to-mode-picker from summary resets mode + difficulty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('easy'); });

    for (let i = 0; i < 10; i++) {
      await answerCurrentRoundCorrectly(page);
      await page.click('#next-btn');
    }

    await page.getByRole('button', { name: /Choose mode/ }).click();
    await expect(page.locator('#mode-sel')).toBeVisible();
    await expect(page.locator('#mode-pill')).toHaveText('Choose Mode');
    const mode = await page.evaluate(() => window.__clock.MODE());
    const diff = await page.evaluate(() => window.__clock.DIFF());
    expect(mode).toBeNull();
    expect(diff).toBeNull();
  });
});
