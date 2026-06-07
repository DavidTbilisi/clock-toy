// @ts-check
// Direct exercise of the Store and its EventEmitter base, plus side-effect
// chains the main UI doesn't always hit.
const { test, expect } = require('@playwright/test');

test.describe('Store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('fresh state defaults to handH=12, handM=0, no locks, period=pm', async ({ page }) => {
    const s = await page.evaluate(() => {
      const store = window.__clock._store;
      // Tap-call reset() to get a known clean slate.
      store.reset();
      return {
        STATE: { ...store.STATE, locked: { ...store.STATE.locked } },
        period: store.period,
        MODE: store.MODE, DIFF: store.DIFF, ROUND: store.ROUND,
        cur: store.cur, results: store.results.length, streak: store.streak,
      };
    });
    expect(s.STATE).toEqual({
      handH: 12, handM: 0, sliderH: 12, sliderM: 0,
      locked: { handH: false, handM: false, sliderH: false, sliderM: false },
    });
    expect(s.period).toBe('pm');
    expect(s.MODE).toBeNull();
    expect(s.DIFF).toBeNull();
    expect(s.ROUND).toBeNull();
    expect(s.cur).toBe(0);
    expect(s.results).toBe(0);
    expect(s.streak).toBe(0);
  });

  test('setMode + setDifficulty each emit their own event', async ({ page }) => {
    const events = await page.evaluate(() => {
      const captured = [];
      const store = window.__clock._store;
      store.on('mode:change', (m) => captured.push(['mode', m]));
      store.on('difficulty:change', (d) => captured.push(['diff', d]));
      store.setMode('drill1');
      store.setDifficulty('hard');
      return captured;
    });
    expect(events).toEqual([['mode', 'drill1'], ['diff', 'hard']]);
  });

  test('setRound emits round:new and resets STATE / answered flag', async ({ page }) => {
    const result = await page.evaluate(() => {
      const store = window.__clock._store;
      store.answered = true;
      store.STATE.handH = 7;
      let payload = null;
      const off = store.on('round:new', (r) => { payload = r; });
      const round = { hour: 3, minute: 15, hour24: 3, period: 'am' };
      store.setRound(round);
      off();
      return {
        payload,
        answered: store.answered,
        handH: store.STATE.handH,  // setRound runs freshHandState → 12
      };
    });
    expect(result.payload).toEqual({ hour: 3, minute: 15, hour24: 3, period: 'am' });
    expect(result.answered).toBe(false);
    expect(result.handH).toBe(12);
  });

  test('markAnswered increments cur, appends to results, updates streak', async ({ page }) => {
    const out = await page.evaluate(() => {
      const store = window.__clock._store;
      store.reset();
      const events = [];
      store.on('round:answered', (r) => events.push(r.correct));
      store.markAnswered({ correct: true,  latency: 1000, timeout: false, type: 'drill1', errors: [] });
      store.markAnswered({ correct: true,  latency: 2000, timeout: false, type: 'drill1', errors: [] });
      store.markAnswered({ correct: false, latency: 5000, timeout: false, type: 'drill1', errors: ['hour hand'] });
      store.markAnswered({ correct: true,  latency: 1500, timeout: false, type: 'drill1', errors: [] });
      return { cur: store.cur, n: store.results.length, streak: store.streak, events };
    });
    expect(out.cur).toBe(4);
    expect(out.n).toBe(4);
    expect(out.streak).toBe(1);  // last one correct; reset to 0 after the wrong, then back to 1
    expect(out.events).toEqual([true, true, false, true]);
  });

  test('resetSession clears counters but keeps MODE/DIFF', async ({ page }) => {
    const out = await page.evaluate(() => {
      const store = window.__clock._store;
      store.setMode('drill1');
      store.setDifficulty('easy');
      store.markAnswered({ correct: false, latency: 1, timeout: false, type: 'drill1', errors: ['x'] });
      let emitted = 0;
      store.on('session:reset', () => emitted++);
      store.resetSession();
      return {
        MODE: store.MODE, DIFF: store.DIFF,
        cur: store.cur, n: store.results.length, streak: store.streak,
        answered: store.answered, emitted,
      };
    });
    expect(out).toEqual({ MODE: 'drill1', DIFF: 'easy', cur: 0, n: 0, streak: 0, answered: false, emitted: 1 });
  });

  test('reset() clears MODE/DIFF/ROUND and emits reset', async ({ page }) => {
    const out = await page.evaluate(() => {
      const store = window.__clock._store;
      store.setMode('drill2');
      store.setDifficulty('medium');
      store.setRound({ hour: 5, minute: 0, hour24: 5, period: 'am' });
      let emitted = 0;
      store.on('reset', () => emitted++);
      store.reset();
      return { MODE: store.MODE, DIFF: store.DIFF, ROUND: store.ROUND, emitted };
    });
    expect(out.MODE).toBeNull();
    expect(out.DIFF).toBeNull();
    expect(out.ROUND).toBeNull();
    expect(out.emitted).toBe(1);
  });

  test('setPeriod is idempotent: same value emits no event', async ({ page }) => {
    const count = await page.evaluate(() => {
      const store = window.__clock._store;
      store.setPeriod('pm');  // baseline (default pm)
      let emitted = 0;
      store.on('period:change', () => emitted++);
      store.setPeriod('pm');  // same — no emit
      store.setPeriod('xx');  // invalid — no emit
      store.setPeriod('am');  // change — emit
      store.setPeriod('am');  // same again — no emit
      return emitted;
    });
    expect(count).toBe(1);
  });
});

test.describe('EventEmitter', () => {
  test('unsubscribe via the returned function stops further deliveries', async ({ page }) => {
    await page.goto('/');
    const out = await page.evaluate(() => {
      const store = window.__clock._store;
      let n = 0;
      const off = store.on('mode:change', () => n++);
      store.setMode('drill1');
      store.setMode('drill2');
      off();
      store.setMode('drill3');
      return n;
    });
    expect(out).toBe(2);
  });

  test('unsubscribing inside a listener does not break iteration', async ({ page }) => {
    await page.goto('/');
    const out = await page.evaluate(() => {
      const store = window.__clock._store;
      const seen = [];
      const offA = store.on('mode:change', (m) => { seen.push(['a', m]); offA(); });
      store.on('mode:change',          (m) => { seen.push(['b', m]); });
      store.setMode('drill1');
      store.setMode('drill2');
      return seen;
    });
    // 'a' fires once and unsubscribes; 'b' fires for both calls.
    expect(out).toEqual([['a', 'drill1'], ['b', 'drill1'], ['b', 'drill2']]);
  });
});
