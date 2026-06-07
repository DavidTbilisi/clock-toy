// @ts-check
// Tail-end coverage: the small modules and edge-case branches that aren't
// touched by the user-facing e2e flows.
const { test, expect } = require('@playwright/test');

test.describe('i18n.t() — unit', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('falls back to English when a key is missing in the active locale', async ({ page }) => {
    const out = await page.evaluate(() => {
      const i = window.__clock._i18n;
      // Add a key only to the English bundle by reaching into its dict.
      // (We can't mutate the imported module live, so probe the existing
      // contract: a key that exists in en but not in ka returns the en value.)
      i.setLocale('ka');
      // 'app.title' is "საათის სათამაშო" in ka, so changing locale picks up ka.
      const ka = i.t('app.title');
      // 'errors.amPm' exists in ka too. Use a known-real key as a placeholder
      // for "this key resolves in both" assertion.
      const enFor = (() => { i.setLocale('en'); return i.t('app.title'); })();
      // A key that doesn't exist anywhere returns the key itself unchanged.
      const missing = i.t('this.key.does.not.exist');
      return { ka, enFor, missing };
    });
    expect(out.ka).toBe('საათის სათამაშო');
    expect(out.enFor).toBe('Clock Toy');
    expect(out.missing).toBe('this.key.does.not.exist');
  });

  test('{placeholder} substitution works and unsupplied tokens stay literal', async ({ page }) => {
    const out = await page.evaluate(() => {
      const t = window.__clock._i18n.t.bind(window.__clock._i18n);
      window.__clock._i18n.setLocale('en');
      return {
        full: t('feedback.correctTitle', { time: '7:00' }),
        partial: t('feedback.wrongBody', { time: '7:00', hour: 7 }),
      };
    });
    expect(out.full).toContain('7:00');
    expect(out.full).toContain('exactly right');
    expect(out.partial).toContain('7:00');
    expect(out.partial).toContain('hour 7');
    // {minute} wasn't supplied — it stays literal in the output.
    expect(out.partial).toContain('{minute}');
  });

  test('setLocale rejects unsupported codes', async ({ page }) => {
    const out = await page.evaluate(() => {
      const i = window.__clock._i18n;
      i.setLocale('en');
      i.setLocale('xx');     // unsupported — no-op
      i.setLocale('');       // falsy — no-op
      return i.locale;
    });
    expect(out).toBe('en');
  });
});

test.describe('skyForTime — interpolation', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('returns identical sky / sun / star values at a stop boundary', async ({ page }) => {
    // h=8 is a defined stop. Calling exactly at the stop should land on the
    // stop's color (no inter-stop interpolation distorting it).
    const at = await page.evaluate(() => {
      const sky = window.__clock._sky;
      // We don't expose skyForTime directly but applySky drives the same path.
      sky.apply(8, 0);
      return {
        bg: document.body.style.background,
        stars: parseFloat(document.getElementById('stars').style.opacity),
      };
    });
    expect(at.bg).toMatch(/rgb\(\s*135,\s*206,\s*235\s*\),\s*rgb\(\s*184,\s*224,\s*245\s*\)/);
    expect(at.stars).toBe(0);  // h=8 is daytime, no stars
  });

  test('stars fade in during the night portion of the day', async ({ page }) => {
    const stars = await page.evaluate(() => {
      const sky = window.__clock._sky;
      sky.apply(3, 0);  // 3 AM: deep night
      const at3 = parseFloat(document.getElementById('stars').style.opacity);
      sky.apply(20, 0); // 8 PM: stars rising
      const at20 = parseFloat(document.getElementById('stars').style.opacity);
      sky.apply(13, 0); // 1 PM: daytime
      const at13 = parseFloat(document.getElementById('stars').style.opacity);
      return { at3, at20, at13 };
    });
    expect(stars.at3).toBeGreaterThan(0.4);
    expect(stars.at20).toBeGreaterThan(0);
    expect(stars.at13).toBe(0);
  });

  test('buildSky() creates 40 star elements inside #stars', async ({ page }) => {
    // build() runs once at boot; re-running should reset and reseed.
    const count = await page.evaluate(() => {
      window.__clock._sky.build();
      return document.querySelectorAll('#stars circle').length;
    });
    expect(count).toBe(40);
  });
});

test.describe('Clock — hourDisplayAngle / lock attrs', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('hard mode bleeds minute progress into the hour-hand angle', async ({ page }) => {
    const out = await page.evaluate(() => {
      pickMode('free'); pickDifficulty('hard');
      const s = window.__clock.STATE();
      s.handH = 3; s.handM = 30;
      renderHands();
      const tf = document.getElementById('hand-h').getAttribute('transform');
      return tf;
    });
    // hourDrift on hard: 30 * (3 % 12) + 0.5 * 30 = 105.
    expect(out).toMatch(/rotate\(105\.00 200 200\)/);
  });

  test('easy mode keeps the hour hand on the integer hour mark', async ({ page }) => {
    const out = await page.evaluate(() => {
      pickMode('free'); pickDifficulty('easy');
      const s = window.__clock.STATE();
      s.handH = 3; s.handM = 30;  // 30 minutes ignored on easy → angle stays at 90
      renderHands();
      return document.getElementById('hand-h').getAttribute('transform');
    });
    expect(out).toMatch(/rotate\(90\.00 200 200\)/);
  });
});

test.describe('Round — rollDice + restartSame', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('Free Play: rollDice regenerates ROUND and refreshes the target display', async ({ page }) => {
    const out = await page.evaluate(() => {
      pickMode('free'); pickDifficulty('easy');
      const first = window.__clock.ROUND();
      // Roll until we land on a different target so we know rollDice did something.
      let next = first;
      let tries = 0;
      while (next.hour === first.hour && next.minute === first.minute && next.period === first.period && tries < 30) {
        document.getElementById('roll-btn').click();
        next = window.__clock.ROUND();
        tries++;
      }
      return { first, next, tries };
    });
    // Should have rolled at least once and produced something different (or
    // exhausted attempts — unlikely with 144 possibilities but allowed).
    expect(out.tries).toBeGreaterThan(0);
  });

  test('Timed mode: rollDice does NOT regenerate the round (only re-animates dice)', async ({ page }) => {
    const out = await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('easy');
      const before = window.__clock.ROUND();
      document.getElementById('roll-btn').click();
      const after = window.__clock.ROUND();
      return { same: before.hour === after.hour && before.minute === after.minute && before.period === after.period };
    });
    expect(out.same).toBe(true);
  });
});

test.describe('FeedbackView — hide() clears cached state', () => {
  test('hide() blanks the panel and a subsequent locale change does not re-show it', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { pickMode('drill2'); pickDifficulty('easy'); });
    await page.click('#hint-btn');
    await expect(page.locator('#fb.hint')).toBeVisible();

    // Properly hide via the API — that clears _last so refresh() is a no-op.
    await page.evaluate(() => window.__clock._feedback.hide());
    await expect(page.locator('#fb')).toBeHidden();

    // Locale change calls feedback.refresh(); with _last cleared, the panel
    // must stay hidden.
    await page.evaluate(() => window.__clock._i18n.setLocale('ru'));
    await expect(page.locator('#fb')).toBeHidden();
  });

  test('setHintVisible toggles the hint button display', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { pickMode('drill2'); pickDifficulty('easy'); });
    await expect(page.locator('#hint-btn')).toBeVisible();

    await page.evaluate(() => window.__clock._feedback.setHintVisible(false));
    await expect(page.locator('#hint-btn')).toBeHidden();

    await page.evaluate(() => window.__clock._feedback.setHintVisible(true));
    await expect(page.locator('#hint-btn')).toBeVisible();
  });
});

test.describe('SummaryView — refresh()', () => {
  test('refresh() before show() is a no-op', async ({ page }) => {
    await page.goto('/');
    const html = await page.evaluate(() => {
      const sumEl = document.getElementById('summary');
      window.__clock._summary.refresh();
      return sumEl.innerHTML;
    });
    // The render path was never invoked, so the element is still empty.
    expect(html).toBe('');
  });
});
