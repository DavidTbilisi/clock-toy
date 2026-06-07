// In-session telemetry: progress dots, timer bar, accuracy ring, latency bar,
// streak dots, dice display + animation, target display.
//
// Owns its own DOM refs and re-renders on demand from store snapshots.

import { DIFFICULTIES, STAT_RING_CIRC, ROUNDS_PER_SESSION, PASS, FALLBACK } from '../config.js';
import { formatTime, periodIcon } from '../modes/base.js';

export class StatsView {
  constructor({ store, els }) {
    this.store = store;
    this.els = els;
  }

  buildProgressDots() {
    this.els.progTrack.innerHTML = '';
    for (let i = 0; i < ROUNDS_PER_SESSION; i++) {
      const e = document.createElement('div');
      e.className = 'pd';
      e.id = 'pd' + i;
      this.els.progTrack.appendChild(e);
    }
  }

  buildStreakDots() {
    this.els.sdots.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const e = document.createElement('div');
      e.className = 'sdot';
      e.id = 'sd' + i;
      this.els.sdots.appendChild(e);
    }
  }

  updateProgress() {
    for (let i = 0; i < ROUNDS_PER_SESSION; i++) {
      const e = document.getElementById('pd' + i);
      if (!e) continue;
      if (i < this.store.cur)        e.className = this.store.results[i]?.correct ? 'pd done-ok' : 'pd done-bad';
      else if (i === this.store.cur) e.className = 'pd cur';
      else                           e.className = 'pd';
    }
  }

  resetProgress() {
    for (let i = 0; i < ROUNDS_PER_SESSION; i++) {
      const d = document.getElementById('pd' + i);
      if (d) d.className = 'pd';
    }
    for (let i = 0; i < 5; i++) {
      const d = document.getElementById('sd' + i);
      if (d) d.className = 'sdot';
    }
    this.els.rPct.textContent = '—';
    this.els.rFill.style.strokeDashoffset = STAT_RING_CIRC;
    this.els.latBar.style.width = '0%';
    this.els.latTxt.textContent = '—';
  }

  setTimerBar(fraction) {
    this.els.timerBar.style.width = (fraction * 100) + '%';
    this.els.timerBar.style.background =
      fraction > 0.5  ? 'var(--ok)' :
      fraction > 0.25 ? 'var(--warn)' :
                        'var(--bad)';
  }

  updateAccuracyAndLatency() {
    const n = this.store.results.length;
    if (!n) return;
    const c = this.store.results.filter((r) => r.correct).length;
    const acc = c / n;
    const avgLat = this.store.results.reduce((s, r) => s + r.latency, 0) / n;

    this.els.rFill.style.strokeDashoffset = STAT_RING_CIRC * (1 - acc);
    this.els.rFill.style.stroke = acc >= PASS ? 'var(--ok)' : acc >= FALLBACK ? 'var(--warn)' : 'var(--bad)';
    this.els.rPct.textContent = Math.round(acc * 100) + '%';

    const T = DIFFICULTIES[this.store.DIFF].timer;
    const P = DIFFICULTIES[this.store.DIFF].plateau;
    const maxLat = T * 1000;
    this.els.latBar.style.width = (Math.min(avgLat / maxLat, 1) * 100) + '%';
    this.els.latBar.style.background = avgLat <= P ? 'var(--ok)' : avgLat <= maxLat * 0.9 ? 'var(--warn)' : 'var(--bad)';
    this.els.latTxt.textContent = (avgLat / 1000).toFixed(1) + 's';

    for (let i = 0; i < 5; i++) {
      const e = document.getElementById('sd' + i);
      if (e) e.className = i < this.store.streak ? 'sdot lit' : 'sdot';
    }
  }

  setTargetText(text) {
    this.els.targetDisplay.textContent = text;
  }

  animateDiceTo(round) {
    const dice = this.els.dice;
    dice.classList.remove('rolling');
    void dice.offsetWidth;
    dice.classList.add('rolling');
    setTimeout(() => {
      dice.innerHTML =
        `<div class="dice-time">${formatTime(round)}</div>` +
        `<div class="dice-period">${periodIcon(round)} ${round.period.toUpperCase()}</div>`;
    }, 450);
  }

  setDiceVisible(visible) {
    this.els.dice.style.visibility = visible ? '' : 'hidden';
    this.els.rollBtn.style.visibility = visible ? '' : 'hidden';
  }

  setTimedChromeVisible(visible) {
    this.els.progTrack.style.display = visible ? '' : 'none';
    this.els.timerWrap.style.display = visible ? '' : 'none';
    this.els.statsRow.style.display  = visible ? '' : 'none';
  }
}
