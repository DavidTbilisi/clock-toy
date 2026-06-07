// @ts-check
// AudioPlayer coverage. We don't actually play audio in the test browser
// (autoplay would be blocked anyway). Instead we monkey-patch the Audio
// constructor on the page so we can inspect which src and which methods were
// invoked, and assert the locale-aware key→path mapping + the wiring from
// game events to play() calls.
const { test, expect } = require('@playwright/test');

const VOICE_KEY = 'clock-toy-voice';

/** Install a recorder that captures every Audio()-created instance. */
async function installAudioRecorder(page) {
  await page.evaluate(() => {
    window.__audioCalls = [];
    const RealAudio = window.Audio;
    window.Audio = function (src) {
      const calls = window.__audioCalls;
      const fake = {
        src,
        currentTime: 0,
        paused: false,
        listeners: {},
        addEventListener: (e, fn) => { fake.listeners[e] = fn; },
        play: () => { calls.push({ src, action: 'play' }); return Promise.resolve(); },
        pause: () => { calls.push({ src, action: 'pause' }); fake.paused = true; },
      };
      calls.push({ src, action: 'create' });
      return fake;
    };
    window.Audio.prototype = RealAudio.prototype;
  });
}

test.describe('AudioPlayer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((k) => localStorage.removeItem(k), VOICE_KEY);
    await page.reload();  // pick up the fresh default-on state
  });

  test('isEnabled() defaults to true with nothing in localStorage', async ({ page }) => {
    const on = await page.evaluate(() => window.__clock._audio.isEnabled());
    expect(on).toBe(true);
  });

  test('setEnabled(false) persists and stops playback; toggle flips it back', async ({ page }) => {
    const out = await page.evaluate(() => {
      const a = window.__clock._audio;
      a.setEnabled(false);
      const stored1 = localStorage.getItem('clock-toy-voice');
      const e1 = a.isEnabled();
      const e2 = a.toggle();  // → true
      const stored2 = localStorage.getItem('clock-toy-voice');
      return { stored1, e1, e2, stored2 };
    });
    expect(out).toEqual({ stored1: '0', e1: false, e2: true, stored2: '1' });
  });

  test('play() composes the locale-aware file path', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      const a = window.__clock._audio;
      a.setLocale('ka');
      a.play('correct');
    });
    const calls = await page.evaluate(() => window.__audioCalls);
    const created = calls.filter((c) => c.action === 'create').map((c) => c.src);
    expect(created).toEqual(['audio/ka/correct.mp3']);
    expect(calls.filter((c) => c.action === 'play').map((c) => c.src)).toEqual(['audio/ka/correct.mp3']);
  });

  test('play() is a no-op when audio is disabled', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      const a = window.__clock._audio;
      a.setEnabled(false);
      a.play('correct');  // should not Audio() anything
    });
    const created = await page.evaluate(() => window.__audioCalls.filter((c) => c.action === 'create'));
    expect(created).toEqual([]);
  });

  test('play() preempts: a new clip pauses the previous one', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      const a = window.__clock._audio;
      a.play('correct');
      a.play('hint');
    });
    const calls = await page.evaluate(() => window.__audioCalls);
    // Two creates, one pause for the first clip, two plays.
    expect(calls.filter((c) => c.action === 'create').map((c) => c.src)).toEqual([
      'audio/en/correct.mp3', 'audio/en/hint.mp3',
    ]);
    expect(calls.find((c) => c.action === 'pause')?.src).toBe('audio/en/correct.mp3');
  });

  test('locale change rewires audio to the new locale', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      window.__clock.setLocale('ru');
      window.__clock._audio.play('timeout');
    });
    const created = await page.evaluate(() => window.__audioCalls.filter((c) => c.action === 'create').map((c) => c.src));
    expect(created).toEqual(['audio/ru/timeout.mp3']);
  });

  test('check-correct triggers the "correct" clip', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('easy');
      const r = window.__clock.ROUND();
      const s = window.__clock.STATE();
      s.handH = r.hour; s.handM = r.minute;
      s.sliderH = r.hour; s.sliderM = r.minute;
      window.__clock.setPeriod(r.period);
      renderHands(); renderSlider('hour'); renderSlider('minute');
    });
    await page.click('#check-btn');
    const created = await page.evaluate(() => window.__audioCalls.filter((c) => c.action === 'create').map((c) => c.src));
    expect(created).toContain('audio/en/correct.mp3');
  });

  test('check-wrong triggers a "wrong-..." clip matching the first error', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => {
      pickMode('drill1'); pickDifficulty('easy');
      const r = window.__clock.ROUND();
      // Hour wrong, everything else right — first error is "hour hand".
      const wrong = r.hour === 12 ? 1 : r.hour + 1;
      const s = window.__clock.STATE();
      s.handH = wrong; s.handM = r.minute;
      s.sliderH = r.hour; s.sliderM = r.minute;
      window.__clock.setPeriod(r.period);
      renderHands(); renderSlider('hour'); renderSlider('minute');
    });
    await page.click('#check-btn');
    const created = await page.evaluate(() => window.__audioCalls.filter((c) => c.action === 'create').map((c) => c.src));
    expect(created).toContain('audio/en/wrong-hour-hand.mp3');
  });

  test('hint button triggers the "hint" clip', async ({ page }) => {
    await installAudioRecorder(page);
    await page.evaluate(() => { pickMode('drill2'); pickDifficulty('easy'); });
    await page.click('#hint-btn');
    const created = await page.evaluate(() => window.__audioCalls.filter((c) => c.action === 'create').map((c) => c.src));
    expect(created).toContain('audio/en/hint.mp3');
  });
});
