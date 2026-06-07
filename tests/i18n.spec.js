// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('i18n', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Force a clean baseline so the order of cycling is predictable.
    await page.evaluate(() => {
      localStorage.removeItem('clock-toy-locale');
      window.__clock.setLocale('en');
    });
  });

  test('defaults to English: mode cards show English names', async ({ page }) => {
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('Free Play');
    await expect(page.locator('#mode-grid .sel-card').nth(1)).toContainText('Set the Clock');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('locale toggle cycles EN → KA → RU → EN, updating all static text', async ({ page }) => {
    await expect(page.locator('#locale-toggle')).toHaveText('EN');
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('Free Play');

    await page.locator('#locale-toggle').click();
    await expect(page.locator('#locale-toggle')).toHaveText('KA');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
    // ქართული text in the first mode card.
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('თავისუფალი');

    await page.locator('#locale-toggle').click();
    await expect(page.locator('#locale-toggle')).toHaveText('RU');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('Свободно');

    // Wrap back to EN.
    await page.locator('#locale-toggle').click();
    await expect(page.locator('#locale-toggle')).toHaveText('EN');
  });

  test('locale choice persists across reloads', async ({ page }) => {
    await page.evaluate(() => window.__clock.setLocale('ru'));
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('Свободно');

    await page.reload();
    await expect(page.locator('#mode-grid .sel-card').nth(0)).toContainText('Свободно');
    await expect(page.locator('#locale-toggle')).toHaveText('RU');
  });

  test('feedback panel respects the live locale', async ({ page }) => {
    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('medium'); });

    // Set the right answer and check in EN; verify English feedback.
    const round = await page.evaluate(() => window.__clock.ROUND());
    await page.evaluate(({ h, m }) => {
      const s = window.__clock.STATE();
      s.handH = h; s.handM = m;
      s.sliderH = h; s.sliderM = m;
      renderHands();
      renderSlider('hour'); renderSlider('minute');
    }, { h: round.hour, m: round.minute });
    await page.click('#check-btn');
    await expect(page.locator('#fb .fv')).toContainText('exactly right');

    // Switching locale must re-render the visible feedback panel.
    await page.evaluate(() => window.__clock.setLocale('ka'));
    await expect(page.locator('#fb .fv')).toContainText('სწორედ');

    await page.evaluate(() => window.__clock.setLocale('ru'));
    await expect(page.locator('#fb .fv')).toContainText('точно так');
  });

  test('buttons + rail labels swap on locale change', async ({ page }) => {
    await page.evaluate(() => { pickMode('free'); pickDifficulty('easy'); });
    await expect(page.locator('#check-btn')).toContainText('Check');
    await expect(page.locator('[data-i18n="rails.hour"]')).toHaveText('HOUR');

    await page.evaluate(() => window.__clock.setLocale('ru'));
    await expect(page.locator('#check-btn')).toContainText('Проверить');
    await expect(page.locator('[data-i18n="rails.hour"]')).toHaveText('ЧАС');
  });

  test('voice toggle flips the audio-enabled flag and persists it', async ({ page }) => {
    // Default ON.
    await expect(page.locator('#voice-toggle')).toHaveText('🔊');
    const enabled1 = await page.evaluate(() => JSON.parse(localStorage.getItem('clock-toy-voice') || '"1"'));
    // The default-on path writes nothing until the user toggles, so the key
    // may not exist yet — that's fine.

    await page.locator('#voice-toggle').click();
    await expect(page.locator('#voice-toggle')).toHaveText('🔇');
    expect(await page.evaluate(() => localStorage.getItem('clock-toy-voice'))).toBe('0');

    await page.reload();
    // Persisted off across reload.
    await expect(page.locator('#voice-toggle')).toHaveText('🔇');

    await page.locator('#voice-toggle').click();
    await expect(page.locator('#voice-toggle')).toHaveText('🔊');
  });
});
