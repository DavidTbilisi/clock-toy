// End-of-session summary screen. Renders the score ring, stats, error chart,
// verdict banner, and two restart buttons. Pushes a summary entry to history.
// Re-renders on locale change via refresh().

import { DIFFICULTIES, PROMOTE, PASS, FALLBACK, SUMMARY_RING_CIRC } from '../config.js';
import { t } from '../i18n/index.js';

// raw error labels emitted by checkAnswer/onTimeout → i18n key suffixes
const ERROR_KEY = {
  'hour hand':     'hourHand',
  'minute hand':   'minuteHand',
  'hour slider':   'hourSlider',
  'minute slider': 'minuteSlider',
};

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
    return t('summary.verdictPromote', { next: t(`difficulties.${nextD}.name`) });
  }
  if (acc >= PASS) {
    return t('summary.verdictPass', { current: t(`difficulties.${diff}.name`) });
  }
  if (acc >= FALLBACK) {
    return t('summary.verdictKeepGoing', { current: t(`difficulties.${diff}.name`) });
  }
  return t('summary.verdictTryEasy');
}

export class SummaryView {
  constructor({ store, history, els, onRestartSame, onChooseMode }) {
    this.store = store;
    this.history = history;
    this.els = els;
    this.onRestartSame = onRestartSame;
    this.onChooseMode = onChooseMode;
    this._visible = false;
    this._pushed = false;  // history.push() should only happen on the original show(), not refreshes
  }

  show() {
    this.els.play.hidden = true;
    this._visible = true;
    this._pushed = false;
    this._render();

    if (!this._pushed) {
      const { results, MODE, DIFF } = this.store;
      const n = results.length;
      const c = results.filter((r) => r.correct).length;
      const acc = c / n;
      const avgLat = results.reduce((s, r) => s + r.latency, 0) / n;
      this.history.push({
        date: new Date().toISOString(),
        mode: MODE,
        difficulty: DIFF,
        correct: c,
        total: n,
        acc: Math.round(acc * 100),
        avgLatMs: Math.round(avgLat),
      });
      this._pushed = true;
    }
  }

  refresh() {
    if (this._visible) this._render();
  }

  _render() {
    const { results, DIFF } = this.store;
    const n = results.length;
    const c = results.filter((r) => r.correct).length;
    const acc = c / n;
    const avgLat = results.reduce((s, r) => s + r.latency, 0) / n;
    const timeouts = results.filter((r) => r.timeout).length;
    const ms = bestStreak(results);

    const errorCounts = Object.fromEntries(Object.keys(ERROR_KEY).map((k) => [k, 0]));
    results.forEach((r) =>
      (r.errors || []).forEach((e) => {
        if (errorCounts[e] !== undefined) errorCounts[e]++;
      })
    );
    const errorRows = Object.entries(errorCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => {
        const kind = t(`errors.${ERROR_KEY[k]}`);
        return `<div class="error-row"><div class="error-key">${t('summary.missesOf', { kind })}</div>` +
               `<div class="error-cnt">${v}</div></div>`;
      })
      .join('') ||
      `<div class="error-row"><div class="error-key">${t('summary.noMisses')}</div>` +
      `<div class="error-cnt" style="color:var(--ok)">✓</div></div>`;

    const sColor = acc >= PASS ? 'var(--ok)' : acc >= FALLBACK ? 'var(--warn)' : 'var(--bad)';
    const sumEl = this.els.summary;
    sumEl.innerHTML = `
      <h2>${t('summary.title')}</h2>
      <div class="sum-hero">
        <div class="sum-ring">
          <svg viewBox="0 0 96 96">
            <circle class="sr-bg" cx="48" cy="48" r="35"/>
            <circle class="sr-fill" id="sr-fill" cx="48" cy="48" r="35"
                    style="stroke:${sColor};stroke-dashoffset:${SUMMARY_RING_CIRC}"/>
          </svg>
          <div class="sum-ring-label">
            <div class="srl-pct" style="color:${sColor}">${c}/${n}</div>
            <div class="srl-sub">${t('summary.correct')}</div>
          </div>
        </div>
        <div class="sum-stats">
          <div class="ss-row"><span class="ss-k">${t('summary.accuracy')}</span><span class="ss-v" style="color:${sColor}">${Math.round(acc * 100)}%</span></div>
          <div class="ss-row"><span class="ss-k">${t('summary.avgTime')}</span><span class="ss-v">${(avgLat / 1000).toFixed(1)}s</span></div>
          <div class="ss-row"><span class="ss-k">${t('summary.bestStreak')}</span><span class="ss-v">${ms}</span></div>
          <div class="ss-row"><span class="ss-k">${t('summary.timeouts')}</span><span class="ss-v" style="color:${timeouts > 0 ? 'var(--bad)' : 'var(--ok)'}">${timeouts}</span></div>
        </div>
      </div>
      <div class="error-chart">${errorRows}</div>
      <div class="vbanner">${verdictText(DIFF, acc, avgLat)}</div>
      <button class="restart-btn" data-action="restart-same">${t('buttons.tryAgain')}</button>
      <button class="restart-btn" data-action="choose-mode">${t('buttons.chooseMode')}</button>
    `;
    sumEl.hidden = false;

    sumEl.querySelector('[data-action="restart-same"]').addEventListener('click', this.onRestartSame);
    sumEl.querySelector('[data-action="choose-mode"]').addEventListener('click', this.onChooseMode);

    setTimeout(() => {
      const f = document.getElementById('sr-fill');
      if (f) f.style.strokeDashoffset = String(SUMMARY_RING_CIRC * (1 - acc));
    }, 50);
  }

  hide() {
    this.els.summary.hidden = true;
    this._visible = false;
  }
}
