#!/usr/bin/env node
// Regenerate README screenshots. Spawns its own http-server so it's
// self-contained: `npm run screenshots`.

const { chromium } = require('@playwright/test');
const httpServer = require('http-server');
const path = require('path');
const fs = require('fs');

const PORT = 5523;
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'screenshots');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Disable sky / stars CSS transitions so a screenshot taken right after
// applySky reflects the target state, not an in-flight tween.
const FREEZE_TRANSITIONS = `
  .celestial-body { transition: none !important; }
  #stars { transition: none !important; }
  /* The dice has a 0.9s rotate animation on round start; freeze it too. */
  .dice.rolling { animation: none !important; }
`;

async function shot(page, file, label) {
  const out = path.join(OUT_DIR, file);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  ✓ ${file}  (${label})`);
}

(async () => {
  const server = httpServer.createServer({ root: ROOT, cache: -1, showDir: false });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const baseURL = `http://127.0.0.1:${PORT}/index.html`;

  // ── 01 — Mode picker (entry screen, English) ──────────────
  await page.goto(baseURL);
  await page.addStyleTag({ content: FREEZE_TRANSITIONS });
  await page.evaluate(() => { localStorage.removeItem('clock-toy-locale'); window.__clock.setLocale('en'); });
  await page.waitForTimeout(150);
  await shot(page, '01-modes.png', 'mode picker (EN)');

  // ── 1a/1b — Same screen, in ka and ru ─────────────────────
  await page.evaluate(() => window.__clock.setLocale('ka'));
  await page.waitForTimeout(150);
  await shot(page, '01-modes-ka.png', 'mode picker (KA)');

  await page.evaluate(() => window.__clock.setLocale('ru'));
  await page.waitForTimeout(150);
  await shot(page, '01-modes-ru.png', 'mode picker (RU)');

  await page.evaluate(() => window.__clock.setLocale('en'));
  await page.waitForTimeout(100);

  // ── 02 — Free Play at noon (bright midday sun) ────────────
  await page.evaluate(() => { pickMode('free'); pickDifficulty('easy'); });
  await page.evaluate(() => window.__clock.applySky(12, 0));
  await page.waitForTimeout(150);
  await shot(page, '02-noon.png', 'Free Play • noon');

  // ── 03 — Free Play at sunset ──────────────────────────────
  await page.evaluate(() => window.__clock.applySky(18, 0));
  await page.waitForTimeout(150);
  await shot(page, '03-sunset.png', 'Free Play • sunset');

  // ── 04 — Free Play at midnight (stars, sun behind clock) ──
  await page.evaluate(() => window.__clock.applySky(0, 0));
  await page.waitForTimeout(150);
  await shot(page, '04-midnight.png', 'Free Play • midnight');

  // ── 05 — Drill 1 in progress ──────────────────────────────
  await page.goto(baseURL);
  await page.addStyleTag({ content: FREEZE_TRANSITIONS });
  await page.evaluate(() => { pickMode('drill1'); pickDifficulty('medium'); });
  await page.waitForTimeout(150);
  await shot(page, '05-drill1.png', 'drill 1 round');

  // ── 06 — Summary after a completed session ────────────────
  await page.evaluate(() => localStorage.removeItem('clock-toy-gym'));
  await page.goto(baseURL);
  await page.addStyleTag({ content: FREEZE_TRANSITIONS });
  await page.evaluate(() => { pickMode('drill1'); pickDifficulty('medium'); });
  // Answer 10 rounds: 8 right, 2 wrong, for a realistic-looking summary.
  for (let i = 0; i < 10; i++) {
    const round = await page.evaluate(() => window.__clock.ROUND());
    const correct = i < 8;
    const h = correct ? round.hour   : ((round.hour   % 12) + 1);
    const m = correct ? round.minute : ((round.minute + 5) % 60);
    await page.evaluate(({ h, m }) => {
      const s = window.__clock.STATE();
      s.handH = h; s.handM = m;
      s.sliderH = h; s.sliderM = m;
      renderHands();
      renderSlider('hour');
      renderSlider('minute');
    }, { h, m });
    await page.click('#check-btn');
    await page.click('#next-btn');
  }
  await page.waitForTimeout(1000);  // let the summary ring animate in
  await shot(page, '06-summary.png', 'session summary');

  await browser.close();
  server.close();
  console.log('done.');
})().catch((err) => { console.error(err); process.exit(1); });
