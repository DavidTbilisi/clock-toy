// @ts-check
const { test, expect } = require('@playwright/test');

// ───────────────────────────────────────────────────────────────
// Helpers — drive the app through its global script-scope functions
// and the window.__clock debug hook (documented in CLAUDE.md).
// ───────────────────────────────────────────────────────────────

async function setupMode(page, mode, diff = 'medium') {
  await page.goto('/');
  await page.evaluate(([m, d]) => {
    pickMode(m);
    pickDifficulty(d);
  }, [mode, diff]);
}

async function getRound(page) {
  return await page.evaluate(() => window.__clock.ROUND());
}

async function getState(page) {
  return await page.evaluate(() => window.__clock.STATE());
}

async function setAll(page, h, m) {
  await page.evaluate(({ h, m }) => {
    const s = window.__clock.STATE();
    s.handH = h; s.handM = m;
    s.sliderH = h; s.sliderM = m;
    // Free Play / drill1 compare the period (AM/PM) too, so align it with
    // whatever the round target needs.
    const r = window.__clock.ROUND();
    if (r) window.__clock.setPeriod(r.period);
    renderHands();
    renderSlider('hour');
    renderSlider('minute');
  }, { h, m });
}

async function setHands(page, h, m) {
  await page.evaluate(({ h, m }) => {
    const s = window.__clock.STATE();
    s.handH = h; s.handM = m;
    renderHands();
  }, { h, m });
}

async function setSliders(page, h, m) {
  await page.evaluate(({ h, m }) => {
    const s = window.__clock.STATE();
    s.sliderH = h; s.sliderM = m;
    renderSlider('hour');
    renderSlider('minute');
  }, { h, m });
}

// ───────────────────────────────────────────────────────────────
// Free Play
// ───────────────────────────────────────────────────────────────

test.describe('Free Play', () => {
  test('check button accepts an answer that matches the rolled target', async ({ page }) => {
    await setupMode(page, 'free', 'easy');
    const round = await getRound(page);
    await setAll(page, round.hour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.ok')).toBeVisible();
    await expect(page.locator('#fb .fv')).toContainText('exactly right');
  });

  test('check button rejects a wrong answer and names the bad input', async ({ page }) => {
    await setupMode(page, 'free', 'easy');
    const round = await getRound(page);
    const wrongHour = round.hour === 12 ? 1 : round.hour + 1;
    await setAll(page, wrongHour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.bad')).toBeVisible();
    await expect(page.locator('#fb .fv')).toContainText('hour hand');
  });

  test('matching hand/slider values but wrong period flags an AM/PM miss', async ({ page }) => {
    // Free Play default: handH=12, period=PM (noon). Force an AM target so the
    // player's leftover PM period is the ONLY mismatch — set state directly so
    // we don't go through the setAll helper, which auto-aligns period.
    await setupMode(page, 'free', 'easy');
    await page.evaluate(() => {
      const r = window.__clock.ROUND();
      r.hour = 1; r.minute = 0; r.hour24 = 1; r.period = 'am';
      const s = window.__clock.STATE();
      s.handH = 1; s.handM = 0; s.sliderH = 1; s.sliderM = 0;
      renderHands(); renderSlider('hour'); renderSlider('minute');
      // Do NOT call setPeriod — that's the point of this test.
    });
    await page.click('#check-btn');
    await expect(page.locator('#fb.bad')).toBeVisible();
    await expect(page.locator('#fb .fv')).toContainText('AM or PM');
  });

  test('clicking on the clock face snaps the nearest unlocked hand', async ({ page }) => {
    await setupMode(page, 'free', 'easy');
    // Both hands start at 12 (angle 0). A pointerdown on empty face area at the
    // 3-o'clock position picks the nearer hand (tie → hour) and snaps it there
    // in one shot via the svg-level handler — no drag needed.
    const clockBox = await page.locator('.clock-wrap').boundingBox();
    if (!clockBox) throw new Error('clock-wrap has no bounding box');
    const cx = clockBox.x + clockBox.width / 2;
    const cy = clockBox.y + clockBox.height / 2;
    const radius = clockBox.width * 0.30;

    // Dispatch synthetic PointerEvents directly so we don't depend on
    // Chromium's mouse→pointer conversion (unreliable for CDP synthetic input).
    await page.evaluate(({ x, y }) => {
      const svg = document.getElementById('clock');
      const opts = {
        pointerId: 1, pointerType: 'mouse',
        clientX: x, clientY: y,
        bubbles: true, cancelable: true,
      };
      svg.dispatchEvent(new PointerEvent('pointerdown', opts));
      svg.dispatchEvent(new PointerEvent('pointerup',   opts));
    }, { x: cx + radius, y: cy });

    const state = await getState(page);
    expect(state.handH).toBe(3);
  });
});

// ───────────────────────────────────────────────────────────────
// Drill 1 — Set the Clock (set hands AND sliders)
// ───────────────────────────────────────────────────────────────

test.describe('Drill 1 — Set the Clock', () => {
  test('nothing is locked', async ({ page }) => {
    await setupMode(page, 'drill1', 'medium');
    const state = await getState(page);
    expect(state.locked).toEqual({ handH: false, handM: false, sliderH: false, sliderM: false });
  });

  test('target display shows the rolled time', async ({ page }) => {
    await setupMode(page, 'drill1', 'medium');
    const round = await getRound(page);
    const expected = `${round.hour}:${String(round.minute).padStart(2, '0')}`;
    await expect(page.locator('#target-display')).toContainText(expected);
  });

  test('setting all 4 inputs to the target produces an ok feedback', async ({ page }) => {
    await setupMode(page, 'drill1', 'medium');
    const round = await getRound(page);
    await setAll(page, round.hour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.ok')).toBeVisible();
    // After a timed-mode answer, check-btn hides and next-btn shows.
    await expect(page.locator('#check-btn')).toBeHidden();
    await expect(page.locator('#next-btn')).toBeVisible();
  });

  test('forgetting to set the sliders is reported as a slider miss', async ({ page }) => {
    await setupMode(page, 'drill1', 'medium');
    const round = await getRound(page);
    await setHands(page, round.hour, round.minute);
    // leave sliders at default (12, 0)
    await page.click('#check-btn');
    await expect(page.locator('#fb.bad')).toBeVisible();
    // The first reported error should be one of the slider mismatches
    // (unless the target itself was 12:00, which would coincidentally pass).
    if (!(round.hour === 12 && round.minute === 0)) {
      await expect(page.locator('#fb .fv')).toContainText(/slider|hour/);
    }
  });
});

// ───────────────────────────────────────────────────────────────
// Drill 2 — Read the Clock (hands locked, set sliders)
// ───────────────────────────────────────────────────────────────

test.describe('Drill 2 — Read the Clock', () => {
  test('hands are locked and pre-set to the round target', async ({ page }) => {
    await setupMode(page, 'drill2', 'medium');
    const round = await getRound(page);
    const state = await getState(page);
    expect(state.locked.handH).toBe(true);
    expect(state.locked.handM).toBe(true);
    expect(state.locked.sliderH).toBe(false);
    expect(state.locked.sliderM).toBe(false);
    expect(state.handH).toBe(round.hour);
    expect(state.handM).toBe(round.minute);

    // The lock should be reflected in the DOM.
    await expect(page.locator('#hand-h')).toHaveAttribute('data-locked', 'true');
    await expect(page.locator('#hand-m')).toHaveAttribute('data-locked', 'true');
  });

  test('hint button is shown', async ({ page }) => {
    await setupMode(page, 'drill2', 'medium');
    await expect(page.locator('#hint-btn')).toBeVisible();
    await page.click('#hint-btn');
    await expect(page.locator('#fb.hint')).toBeVisible();
    await expect(page.locator('#fb')).toContainText(/minute/i);
  });

  test('matching the sliders to the locked hands produces ok', async ({ page }) => {
    await setupMode(page, 'drill2', 'medium');
    const round = await getRound(page);
    await setSliders(page, round.hour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.ok')).toBeVisible();
  });

  test('wrong slider values are reported', async ({ page }) => {
    await setupMode(page, 'drill2', 'medium');
    const round = await getRound(page);
    const wrongHour = round.hour === 12 ? 1 : round.hour + 1;
    await setSliders(page, wrongHour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.bad')).toBeVisible();
    await expect(page.locator('#fb .fv')).toContainText('hour slider');
  });
});

// ───────────────────────────────────────────────────────────────
// Drill 3 — Build from Sliders (sliders locked, set hands)
// ───────────────────────────────────────────────────────────────

test.describe('Drill 3 — Build from Sliders', () => {
  test('sliders are locked and pre-set to the round target', async ({ page }) => {
    await setupMode(page, 'drill3', 'medium');
    const round = await getRound(page);
    const state = await getState(page);
    expect(state.locked.sliderH).toBe(true);
    expect(state.locked.sliderM).toBe(true);
    expect(state.locked.handH).toBe(false);
    expect(state.locked.handM).toBe(false);
    expect(state.sliderH).toBe(round.hour);
    expect(state.sliderM).toBe(round.minute);

    await expect(page.locator('#hour-rail')).toHaveAttribute('data-locked', 'true');
    await expect(page.locator('#minute-rail')).toHaveAttribute('data-locked', 'true');
  });

  test('hint button is hidden (only drill2 shows hints)', async ({ page }) => {
    await setupMode(page, 'drill3', 'medium');
    await expect(page.locator('#hint-btn')).toBeHidden();
  });

  test('matching the hands to the locked sliders produces ok', async ({ page }) => {
    await setupMode(page, 'drill3', 'medium');
    const round = await getRound(page);
    await setHands(page, round.hour, round.minute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.ok')).toBeVisible();
  });

  test('wrong hand values are reported', async ({ page }) => {
    await setupMode(page, 'drill3', 'medium');
    const round = await getRound(page);
    const wrongMinute = round.minute === 0 ? 30 : 0;
    await setHands(page, round.hour, wrongMinute);
    await page.click('#check-btn');
    await expect(page.locator('#fb.bad')).toBeVisible();
    await expect(page.locator('#fb .fv')).toContainText(/hand/);
  });
});
