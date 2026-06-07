// End-of-session summary screen. Renders the score ring, stats, error chart,
// verdict banner, and two restart buttons. Pushes a summary entry to history.

import { DIFFICULTIES, PROMOTE, PASS, FALLBACK, SUMMARY_RING_CIRC } from '../config.js';
import { MODES } from '../modes/index.js';

const ERROR_KEYS = ['hour hand', 'minute hand', 'hour slider', 'minute slider'];

function bestStreak(results) {
  return results.reduce(
    (s, r) => r.correct
      ? { max: Math.max(s.max, s.cur + 1), cur: s.cur + 1 }
      : { max: s.max, cur: 0 },
    { max: 0, cur: 0 }
  ).max;
}

function verdictText(diff, acc, avgLat) {
  const P = DIFFICULTIES[diff].plateau;
  const nextD = diff === 'easy' ? 'medium' : 'hard';
  if (acc >= PROMOTE && avgLat <= P) {
    return `<strong>🎉 Promote!</strong> Ready for <b>${DIFFICULTIES[nextD].name}</b>.`;
  }
  if (acc >= PASS) {
    return `<strong>✓ Pass.</strong> Repeat <b>${DIFFICULTIES[diff].name}</b> to build speed.`;
  }
  if (acc >= FALLBACK) {
    return `<strong>Keep going!</strong> Repeat <b>${DIFFICULTIES[diff].name}</b> and study the misses.`;
  }
  return `<strong>Try Easy mode first</strong> to lock in the basics.`;
}

export class SummaryView {
  constructor({ store, history, els, onRestartSame, onChooseMode }) {
    this.store = store;
    this.history = history;
    this.els = els;
    this.onRestartSame = onRestartSame;
    this.onChooseMode = onChooseMode;
  }

  show() {
    // #summary and #play are mutually exclusive views; toggle both here.
    this.els.play.hidden = true;
    const { results, MODE, DIFF } = this.store;
    const n = results.length;
    const c = results.filter((r) => r.correct).length;
    const acc = c / n;
    const avgLat = results.reduce((s, r) => s + r.latency, 0) / n;
    const timeouts = results.filter((r) => r.timeout).length;
    const ms = bestStreak(results);

    const errorCounts = Object.fromEntries(ERROR_KEYS.map((k) => [k, 0]));
    results.forEach((r) =>
      (r.errors || []).forEach((e) => {
        if (errorCounts[e] !== undefined) errorCounts[e]++;
      })
    );
    const errorRows = Object.entries(errorCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) =>
        `<div class="error-row"><div class="error-key">${k} misses</div>` +
        `<div class="error-cnt">${v}</div></div>`)
      .join('') ||
      `<div class="error-row"><div class="error-key">No misses</div>` +
      `<div class="error-cnt" style="color:var(--ok)">✓</div></div>`;

    const sColor = acc >= PASS ? 'var(--ok)' : acc >= FALLBACK ? 'var(--warn)' : 'var(--bad)';
    const sumEl = this.els.summary;
    sumEl.innerHTML = `
      <h2>Session Complete!</h2>
      <div class="sum-hero">
        <div class="sum-ring">
          <svg viewBox="0 0 96 96">
            <circle class="sr-bg" cx="48" cy="48" r="35"/>
            <circle class="sr-fill" id="sr-fill" cx="48" cy="48" r="35"
                    style="stroke:${sColor};stroke-dashoffset:${SUMMARY_RING_CIRC}"/>
          </svg>
          <div class="sum-ring-label">
            <div class="srl-pct" style="color:${sColor}">${c}/${n}</div>
            <div class="srl-sub">correct</div>
          </div>
        </div>
        <div class="sum-stats">
          <div class="ss-row"><span class="ss-k">Accuracy</span><span class="ss-v" style="color:${sColor}">${Math.round(acc * 100)}%</span></div>
          <div class="ss-row"><span class="ss-k">Avg time</span><span class="ss-v">${(avgLat / 1000).toFixed(1)}s</span></div>
          <div class="ss-row"><span class="ss-k">Best streak</span><span class="ss-v">${ms}</span></div>
          <div class="ss-row"><span class="ss-k">Timeouts</span><span class="ss-v" style="color:${timeouts > 0 ? 'var(--bad)' : 'var(--ok)'}">${timeouts}</span></div>
        </div>
      </div>
      <div class="error-chart">${errorRows}</div>
      <div class="vbanner">${verdictText(DIFF, acc, avgLat)}</div>
      <button class="restart-btn" data-action="restart-same">↻ Try again</button>
      <button class="restart-btn" data-action="choose-mode">↩ Choose mode</button>
    `;
    sumEl.hidden = false;

    sumEl.querySelector('[data-action="restart-same"]').addEventListener('click', this.onRestartSame);
    sumEl.querySelector('[data-action="choose-mode"]').addEventListener('click', this.onChooseMode);

    // Animate the ring after layout.
    setTimeout(() => {
      const f = document.getElementById('sr-fill');
      if (f) f.style.strokeDashoffset = String(SUMMARY_RING_CIRC * (1 - acc));
    }, 50);

    this.history.push({
      date: new Date().toISOString(),
      mode: MODE,
      difficulty: DIFF,
      correct: c,
      total: n,
      acc: Math.round(acc * 100),
      avgLatMs: Math.round(avgLat),
    });
  }

  hide() {
    this.els.summary.hidden = true;
  }
}
