// @ts-check
const { test, expect } = require('@playwright/test');

// Extract `scale(N)` from a transform like `matrix(1.5, 0, 0, 1.5, ...)` or
// `translate(-50%, -50%) scale(1.5)`. We set both translate+scale in inline
// style, but getComputedStyle returns a matrix() — so handle both forms.
function parseScale(transform) {
  const matrixMatch = transform.match(/^matrix\(\s*([-\d.]+)/);
  if (matrixMatch) return parseFloat(matrixMatch[1]);
  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch) return parseFloat(scaleMatch[1]);
  return null;
}

// Pull a `brightness(N)` value out of a CSS filter string.
function parseBrightness(filter) {
  const m = filter.match(/brightness\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : null;
}

async function readSunState(page) {
  return await page.evaluate(() => {
    const sun = document.getElementById('sun');
    const stars = document.getElementById('stars');
    const cs = getComputedStyle(sun);
    return {
      transform: cs.transform,
      filter: cs.filter,
      starsOpacity: parseFloat(getComputedStyle(stars).opacity),
      bodyBg: document.body.style.background,
      hidden: sun.classList.contains('hidden'),
    };
  });
}

test.describe('sky transition 11:00 → 12:00 (noon)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Disable the .8s/1.2s CSS transition on the sun + stars so
    // getComputedStyle reflects the *target* state immediately — otherwise the
    // test races the in-flight tween from the boot applySky(roundTarget) and
    // reads an interpolated transform/filter/opacity.
    await page.addStyleTag({
      content: `
        .celestial-body { transition: none !important; }
        #stars { transition: none !important; }
      `,
    });
    await page.evaluate(() => { pickMode('free'); pickDifficulty('easy'); });
  });

  test('at 11:00 the sun is bright and large, with no visible stars', async ({ page }) => {
    await page.evaluate(() => window.__clock.applySky(11, 0));
    const s = await readSunState(page);

    expect(s.hidden).toBe(false);
    expect(s.starsOpacity).toBe(0);

    const scale = parseScale(s.transform);
    // dayFactor at t=11 is sin(11/24 * π) ≈ 0.991 → scale ≈ 0.65 + 0.85*0.991 ≈ 1.493
    expect(scale).toBeGreaterThan(1.4);
    expect(scale).toBeLessThan(1.5);

    const brightness = parseBrightness(s.filter);
    // 0.7 + 0.8 * 0.991 ≈ 1.493
    expect(brightness).toBeGreaterThan(1.4);
  });

  test('at 12:00 the sun is at peak scale and brightness', async ({ page }) => {
    await page.evaluate(() => window.__clock.applySky(12, 0));
    const s = await readSunState(page);

    expect(s.hidden).toBe(false);
    expect(s.starsOpacity).toBe(0);

    const scale = parseScale(s.transform);
    // dayFactor = 1 → scale = 0.65 + 0.85 = 1.50
    expect(scale).toBeCloseTo(1.5, 2);

    const brightness = parseBrightness(s.filter);
    // 0.7 + 0.8 = 1.50
    expect(brightness).toBeCloseTo(1.5, 2);
  });

  test('12:00 strictly exceeds 11:00 in scale and brightness', async ({ page }) => {
    await page.evaluate(() => window.__clock.applySky(11, 0));
    const a = await readSunState(page);
    await page.evaluate(() => window.__clock.applySky(12, 0));
    const b = await readSunState(page);

    const scaleA = parseScale(a.transform);
    const scaleB = parseScale(b.transform);
    const brightA = parseBrightness(a.filter);
    const brightB = parseBrightness(b.filter);

    expect(scaleB).toBeGreaterThan(scaleA);
    expect(brightB).toBeGreaterThan(brightA);
    // Both daytime — sky should be a non-dark gradient on both.
    expect(a.bodyBg).toContain('rgb(');
    expect(b.bodyBg).toContain('rgb(');
  });

  test('11:30 lies strictly between 11:00 and 12:00 (smooth interpolation)', async ({ page }) => {
    await page.evaluate(() => window.__clock.applySky(11, 0));
    const at11 = await readSunState(page);
    await page.evaluate(() => window.__clock.applySky(11, 30));
    const at1130 = await readSunState(page);
    await page.evaluate(() => window.__clock.applySky(12, 0));
    const at12 = await readSunState(page);

    const s11 = parseScale(at11.transform);
    const s1130 = parseScale(at1130.transform);
    const s12 = parseScale(at12.transform);

    expect(s1130).toBeGreaterThan(s11);
    expect(s12).toBeGreaterThan(s1130);

    const b11 = parseBrightness(at11.filter);
    const b1130 = parseBrightness(at1130.filter);
    const b12 = parseBrightness(at12.filter);

    expect(b1130).toBeGreaterThan(b11);
    expect(b12).toBeGreaterThan(b1130);

    // Stars stay invisible through the whole interval.
    expect(at11.starsOpacity).toBe(0);
    expect(at1130.starsOpacity).toBe(0);
    expect(at12.starsOpacity).toBe(0);
  });

  test('Free Play: hand at 12 with PM (default) reads as noon (peak sun)', async ({ page }) => {
    // Default fresh STATE has handH=12, handM=0, period='pm'. Free Play opens
    // at exact noon — peak sun, no stars. If someone changes the default to AM
    // or breaks the freePlayHour24 math, this fires immediately.
    const s = await readSunState(page);

    expect(s.hidden).toBe(false);
    expect(s.starsOpacity).toBe(0);

    const scale = parseScale(s.transform);
    expect(scale).toBeCloseTo(1.5, 2);

    const brightness = parseBrightness(s.filter);
    expect(brightness).toBeCloseTo(1.5, 2);
  });

  test('Free Play: dragging the hour hand 11 → 12 flips PM → AM (and the sky goes from noon to midnight)', async ({ page }) => {
    // Default: handH=12, period=PM. Walk forward 12 → 1 → 2 → … → 11 so we
    // approach the boundary cleanly without triggering the 12 ↔ 11 flip on
    // the way out. Then drag 11 → 12 to fire the actual cross-under-test.
    await page.evaluate(() => {
      for (const h of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) window.__clock.setHandH(h);
    });
    expect(await page.evaluate(() => window.__clock.period())).toBe('pm');
    const before = await readSunState(page);
    // handH=11, period=PM ⇒ freePlayHour24 = 23 (11 PM): deep night, stars > 0.5.
    expect(before.starsOpacity).toBeGreaterThan(0.5);

    // Cross 11 → 12. Period must flip PM → AM; the sky lands at h=0 (midnight).
    await page.evaluate(() => window.__clock.setHandH(12));
    expect(await page.evaluate(() => window.__clock.period())).toBe('am');

    const after = await readSunState(page);
    expect(after.starsOpacity).toBe(1);  // exact midnight → stars at full
    expect(parseScale(after.transform)).toBeCloseTo(0.65, 2);  // sun at smallest
  });

  test('Free Play: dragging 12 → 11 also flips the period (the boundary is symmetric)', async ({ page }) => {
    // Start at handH=12, PM. Drag backward to 11.
    await page.evaluate(() => window.__clock.setHandH(12));
    expect(await page.evaluate(() => window.__clock.period())).toBe('pm');

    await page.evaluate(() => window.__clock.setHandH(11));
    expect(await page.evaluate(() => window.__clock.period())).toBe('am');
    // freePlayHour24 = 11 + 0 = 11. So sky should be 11 AM — bright morning.
    const s = await readSunState(page);
    expect(s.starsOpacity).toBe(0);
    expect(parseScale(s.transform)).toBeGreaterThan(1.4);
  });

  test('Free Play: dragging through 12 → 1 does NOT flip the period (no boundary crossed)', async ({ page }) => {
    // Start at handH=12, PM. Drag forward to 1 (which is the next hour mark
    // clockwise from 12). No 11↔12 boundary is crossed, so the period stays.
    await page.evaluate(() => window.__clock.setHandH(12));
    expect(await page.evaluate(() => window.__clock.period())).toBe('pm');

    await page.evaluate(() => window.__clock.setHandH(1));
    expect(await page.evaluate(() => window.__clock.period())).toBe('pm');
    // freePlayHour24 = 1 + 12 = 13 (1 PM, early afternoon, bright daytime).
    const s = await readSunState(page);
    expect(s.starsOpacity).toBe(0);
  });

  test('Free Play: two full revolutions take the sky through a complete 24-hour cycle', async ({ page }) => {
    // Start at default handH=12, period=PM (noon). Sweep the hand through one
    // full clockwise revolution: 12 → 1 → 2 → ... → 11 → 12. That should
    // traverse PM hours and then flip period at the 11 → 12 boundary.
    const path = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const periods = [];
    for (const h of path) {
      await page.evaluate((h) => window.__clock.setHandH(h), h);
      periods.push(await page.evaluate(() => window.__clock.period()));
    }
    // PM throughout the revolution; flip to AM only at the final 11 → 12 step.
    expect(periods).toEqual([
      'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'pm', 'am',
    ]);

    // Second revolution: same path again. Now we sweep through AM and flip
    // back to PM at the closing 11 → 12 step.
    const periods2 = [];
    for (const h of path) {
      await page.evaluate((h) => window.__clock.setHandH(h), h);
      periods2.push(await page.evaluate(() => window.__clock.period()));
    }
    expect(periods2).toEqual([
      'am', 'am', 'am', 'am', 'am', 'am', 'am', 'am', 'am', 'am', 'am', 'am', 'pm',
    ]);
  });

  test('Free Play: freePlayHour24 math is correct across hand × period', async ({ page }) => {
    // Probe each (handH, period) pair in isolation. We mutate STATE.handH
    // directly so we don't trip the boundary-crossing observer between probes
    // — this is a math check on the Store's pure-function freePlayHour24(),
    // not a behavioural check of the crossing detector.
    const cases = await page.evaluate(() => {
      const state = window.__clock.STATE();
      // Cross to AM via 12 → 1 → … → 11 → 12 (one boundary crossing only).
      for (const h of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        window.__clock.setHandH(h);
      }
      // We are now at handH=12, period=AM.
      const am = [1, 6, 11, 12].map((h) => {
        state.handH = h;
        return { h, period: window.__clock.period(), h24: window.__clock.freePlayHour24() };
      });
      // Now walk back through the boundary to PM. setHandH(11) here triggers
      // the symmetric 12 → 11 crossing (we are currently at handH=12).
      window.__clock.setHandH(11);  // 12 → 11 boundary: flips AM → PM
      const pm = [1, 6, 11, 12].map((h) => {
        state.handH = h;
        return { h, period: window.__clock.period(), h24: window.__clock.freePlayHour24() };
      });
      return [...am, ...pm];
    });

    expect(cases).toEqual([
      { h: 1,  period: 'am', h24: 1  },
      { h: 6,  period: 'am', h24: 6  },
      { h: 11, period: 'am', h24: 11 },
      { h: 12, period: 'am', h24: 0  },
      { h: 1,  period: 'pm', h24: 13 },
      { h: 6,  period: 'pm', h24: 18 },
      { h: 11, period: 'pm', h24: 23 },
      { h: 12, period: 'pm', h24: 12 },
    ]);
  });

  test('sun arc position moves left-to-right between 11:00 and 12:00', async ({ page }) => {
    // arcCoords: angle = (t/24) * 180. From t=11 (angle 82.5°) to t=12 (angle 90°)
    // the sun should move slightly to the right along the half-ellipse.
    await page.evaluate(() => window.__clock.applySky(11, 0));
    const x11 = await page.evaluate(() => parseFloat(document.getElementById('sun').style.left));
    await page.evaluate(() => window.__clock.applySky(12, 0));
    const x12 = await page.evaluate(() => parseFloat(document.getElementById('sun').style.left));

    // Sun moves slightly right between 11 and 12.
    expect(x12).toBeGreaterThan(x11);

    // At 12:00 the sun sits at viewport center (within a few px tolerance).
    const cx = await page.evaluate(() => window.innerWidth / 2);
    expect(Math.abs(x12 - cx)).toBeLessThan(5);
  });
});
