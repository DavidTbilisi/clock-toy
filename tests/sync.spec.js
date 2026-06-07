// @ts-check
const { test, expect } = require('@playwright/test');

async function readState(page) {
  return await page.evaluate(() => {
    const s = window.__clock.STATE();
    return {
      handH: s.handH, handM: s.handM,
      sliderH: s.sliderH, sliderM: s.sliderM,
      locked: { ...s.locked },
    };
  });
}

test.describe('hand ↔ slider sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Free Play (nothing locked: full bidirectional sync) ─────
  test.describe('Free Play — nothing locked', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => { pickMode('free'); pickDifficulty('medium'); });
    });

    test('moving the hour hand drags the hour slider with it', async ({ page }) => {
      await page.evaluate(() => window.__clock.setHandH(7));
      const s = await readState(page);
      expect(s.handH).toBe(7);
      expect(s.sliderH).toBe(7);
    });

    test('moving the minute hand drags the minute slider with it', async ({ page }) => {
      await page.evaluate(() => window.__clock.setHandM(25));
      const s = await readState(page);
      expect(s.handM).toBe(25);
      expect(s.sliderM).toBe(25);
    });

    test('moving the hour slider drags the hour hand with it', async ({ page }) => {
      await page.evaluate(() => window.__clock.setSliderH(4));
      const s = await readState(page);
      expect(s.sliderH).toBe(4);
      expect(s.handH).toBe(4);
    });

    test('moving the minute slider drags the minute hand with it', async ({ page }) => {
      await page.evaluate(() => window.__clock.setSliderM(40));
      const s = await readState(page);
      expect(s.sliderM).toBe(40);
      expect(s.handM).toBe(40);
    });

    test('hour and minute axes are independent', async ({ page }) => {
      await page.evaluate(() => {
        window.__clock.setHandH(3);
        window.__clock.setSliderM(15);
      });
      const s = await readState(page);
      expect(s).toMatchObject({ handH: 3, sliderH: 3, handM: 15, sliderM: 15 });
    });

    test('rendered slider knob reflects a hand-driven update', async ({ page }) => {
      await page.evaluate(() => window.__clock.setHandH(7));
      await expect(page.locator('#hour-knob')).toHaveText('7');
    });
  });

  // ── Drill 2 (hands locked): slider-side moves only ──────────
  test.describe('Drill 2 — hands locked', () => {
    test('moving the slider does NOT move the locked hand', async ({ page }) => {
      await page.evaluate(() => { pickMode('drill2'); pickDifficulty('easy'); });
      const round = await page.evaluate(() => window.__clock.ROUND());

      // The hand was pre-set to the round target by the drill's setup.
      // After the player drags the slider to some unrelated value, the hand
      // must stay where it was (otherwise drill2 would auto-solve itself).
      await page.evaluate(() => window.__clock.setSliderH(1));
      const s = await readState(page);
      expect(s.sliderH).toBe(1);
      expect(s.handH).toBe(round.hour);  // unchanged
      expect(s.locked.handH).toBe(true);
    });
  });

  // ── Drill 3 (sliders locked): hand-side moves only ──────────
  test.describe('Drill 3 — sliders locked', () => {
    test('moving the hand does NOT move the locked slider', async ({ page }) => {
      await page.evaluate(() => { pickMode('drill3'); pickDifficulty('easy'); });
      const round = await page.evaluate(() => window.__clock.ROUND());

      await page.evaluate(() => window.__clock.setHandH(2));
      const s = await readState(page);
      expect(s.handH).toBe(2);
      expect(s.sliderH).toBe(round.hour);  // unchanged
      expect(s.locked.sliderH).toBe(true);
    });
  });
});
