// @ts-check
// Lock down two invariants that protect against silent drift:
//   1. Every translation key present in en.js must also exist in ka.js and
//      ru.js. A missing key falls back to English at runtime, but that's a
//      regression we want to catch in tests, not in production.
//   2. The slider rails accept real pointer events end-to-end.
const { test, expect } = require('@playwright/test');

test.describe('translation key parity', () => {
  test('every key in en.js exists in ka.js and ru.js', async ({ page }) => {
    await page.goto('/');
    const missing = await page.evaluate(async () => {
      const [en, ka, ru] = await Promise.all([
        import('/src/i18n/en.js'), import('/src/i18n/ka.js'), import('/src/i18n/ru.js'),
      ]);
      // Recursively collect all dotted keys whose values are strings.
      const keys = (obj, prefix = '') => {
        const out = [];
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object') out.push(...keys(v, path));
          else if (typeof v === 'string') out.push(path);
        }
        return out;
      };
      const has = (obj, key) => key.split('.').reduce((o, p) => (o == null ? undefined : o[p]), obj) !== undefined;
      const enKeys = keys(en.default);
      return {
        kaMissing: enKeys.filter((k) => !has(ka.default, k)),
        ruMissing: enKeys.filter((k) => !has(ru.default, k)),
      };
    });
    expect(missing.kaMissing, 'keys missing from ka.js').toEqual([]);
    expect(missing.ruMissing, 'keys missing from ru.js').toEqual([]);
  });
});

test.describe('slider pointer-drag', () => {
  test('pointerdown on the hour rail sets the value at that x', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { pickMode('free'); pickDifficulty('medium'); });

    const rail = page.locator('#hour-rail');
    const box = await rail.boundingBox();
    if (!box) throw new Error('hour-rail has no bounding box');

    // Click roughly at the centre of the rail. In medium, the hour rail has
    // 12 evenly-spaced slots; centre lands near hour 6 or 7.
    await page.evaluate(({ x, y }) => {
      const r = document.getElementById('hour-rail');
      const opts = { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, bubbles: true, cancelable: true };
      r.dispatchEvent(new PointerEvent('pointerdown', opts));
      r.dispatchEvent(new PointerEvent('pointerup', opts));
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

    const sliderH = await page.evaluate(() => window.__clock.STATE().sliderH);
    // Centre of the 1..12 range should snap to 6 or 7 — accept either.
    expect([6, 7]).toContain(sliderH);
  });

  test('pointerdown is a no-op when the rail is locked', async ({ page }) => {
    await page.goto('/');
    // drill3 locks the slider rails to the round target.
    await page.evaluate(() => { pickMode('drill3'); pickDifficulty('easy'); });

    const before = await page.evaluate(() => window.__clock.STATE().sliderH);
    const box = await page.locator('#hour-rail').boundingBox();
    if (!box) throw new Error('hour-rail has no bounding box');

    await page.evaluate(({ x, y }) => {
      const r = document.getElementById('hour-rail');
      const opts = { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, bubbles: true, cancelable: true };
      r.dispatchEvent(new PointerEvent('pointerdown', opts));
      r.dispatchEvent(new PointerEvent('pointerup', opts));
    }, { x: box.x + 40, y: box.y + box.height / 2 });

    const after = await page.evaluate(() => window.__clock.STATE().sliderH);
    expect(after).toBe(before);  // unchanged
  });
});
