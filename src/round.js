// RoundRunner — orchestrates a play session. Generates targets, drives the
// round lifecycle, and delegates UI updates to injected view modules.
//
// Strategy pattern: every "what does mode X do?" question is answered by the
// mode object itself (MODES[store.MODE]), not by an if/else chain here.

import { DIFFICULTIES, ROUNDS_PER_SESSION, PROMOTE, PASS, FALLBACK } from './config.js';
import { MODES } from './modes/index.js';

const ERROR_AUDIO_KEY = {
  'hour hand':     'wrong-hour-hand',
  'minute hand':   'wrong-minute-hand',
  'hour slider':   'wrong-hour-slider',
  'minute slider': 'wrong-minute-slider',
  'period':        'wrong-am-pm',
};

export class RoundRunner {
  constructor({ store, clock, sliders, sky, stats, feedback, summary, audio }) {
    this.store = store;
    this.clock = clock;
    this.sliders = sliders;
    this.sky = sky;
    this.stats = stats;
    this.feedback = feedback;
    this.summary = summary;
    this.audio = audio;
    this._tInterval = null;
  }

  // ── Target generation ──────────────────────────────────────
  nextTarget() {
    const step = DIFFICULTIES[this.store.DIFF].minuteStep;
    const period = Math.random() < 0.5 ? 'am' : 'pm';
    const hour = 1 + Math.floor(Math.random() * 12);
    let minute;
    if (step === 30)     minute = Math.random() < 0.5 ? 0 : 30;
    else if (step === 5) minute = Math.floor(Math.random() * 12) * 5;
    else                 minute = Math.floor(Math.random() * 60);
    const hour24 = period === 'am'
      ? (hour === 12 ? 0 : hour)
      : (hour === 12 ? 12 : hour + 12);
    return { hour, minute, hour24, period, mode: this.store.MODE, difficulty: this.store.DIFF };
  }

  // ── Session lifecycle ──────────────────────────────────────
  startSession() {
    const mode = this._mode();
    this.stats.setTimedChromeVisible(mode.timed);
    if (mode.timed) {
      this.stats.buildProgressDots();
    }
    this.stats.buildStreakDots();
    this.store.resetSession();
    this.stats.resetProgress();
    this.newRound();
  }

  newRound() {
    const round = this.nextTarget();
    this.store.setRound(round);

    const mode = this._mode();
    mode.setup(this.store, round);
    this.clock.syncLockedAttrs();
    this.sliders.syncLockedAttrs();
    this.clock.renderHands();
    this.sliders.render('hour');
    this.sliders.render('minute');

    this.stats.setDiceVisible(mode.showsDice);
    this.stats.setTargetText(mode.targetText(round));
    if (mode.showsDice) this.stats.animateDiceTo(round);

    this.feedback.setHintVisible(mode.showsHint);
    this.feedback.hide();
    this.feedback.setCheckMode();

    if (mode.timed) this.stats.updateProgress();

    this._applySkyForRound();

    if (mode.timed) this._startTimer();
    else            this._stopTimer();
  }

  // ── Check / timeout / next ─────────────────────────────────
  checkAnswer() {
    const mode = this._mode();
    if (this.store.answered && mode.timed) return;

    const { ROUND, STATE } = this.store;
    const errors = [];
    if (!STATE.locked.handH   && STATE.handH   !== ROUND.hour)   errors.push('hour hand');
    if (!STATE.locked.handM   && STATE.handM   !== ROUND.minute) errors.push('minute hand');
    if (!STATE.locked.sliderH && STATE.sliderH !== ROUND.hour)   errors.push('hour slider');
    if (!STATE.locked.sliderM && STATE.sliderM !== ROUND.minute) errors.push('minute slider');
    // The 12-hour clock face can't show AM/PM on its own, so we only enforce
    // period when the player can actually drive it — i.e., when the hour hand
    // is unlocked and they can cross the 11↔12 boundary. drill2 locks the
    // hands, so we don't hold the player to the period there.
    if (!STATE.locked.handH && this.store.period !== ROUND.period) {
      errors.push('period');
    }
    const ok = errors.length === 0;

    if (mode.timed) {
      this._stopTimer();
      const lat = Date.now() - this.store.timerStart;
      this.store.markAnswered({
        correct: ok, latency: lat, timeout: false,
        type: this.store.MODE, errors: errors.slice(),
      });
      this.stats.updateAccuracyAndLatency();
      this.feedback.setNextMode();
    }

    this.feedback.showAnswer({ ok, timeout: false, round: ROUND, errors });

    if (this.audio) {
      if (ok) this.audio.play('correct');
      else    this.audio.play(ERROR_AUDIO_KEY[errors[0]] || 'wrong-hour-hand');
    }
  }

  onTimeout() {
    this._stopTimer();
    const lat = DIFFICULTIES[this.store.DIFF].timer * 1000;
    this.store.markAnswered({
      correct: false, latency: lat, timeout: true,
      type: this.store.MODE, errors: ['ran out of time'],
    });
    this.stats.updateAccuracyAndLatency();
    this.feedback.showAnswer({ ok: false, timeout: true, round: this.store.ROUND, errors: [] });
    this.feedback.setNextMode();
    if (this.audio) this.audio.play('timeout');
  }

  nextRound() {
    const mode = this._mode();
    if (mode.timed && this.store.cur >= ROUNDS_PER_SESSION) {
      this._showSummary();
    } else {
      this.newRound();
    }
  }

  rollDice() {
    // In Free Play, rolling generates a fresh target. In timed modes the
    // target is fixed per round — the roll just re-animates the dice.
    if (this.store.MODE === 'free') {
      const round = this.nextTarget();
      this.store.setRound(round);
      this.stats.setTargetText(this._mode().targetText(round));
      this._applySkyForRound();
      this.feedback.hide();
    }
    this.stats.animateDiceTo(this.store.ROUND);
  }

  showHint() {
    if (!this._mode().showsHint) return;
    this.feedback.showHint();
    if (this.audio) this.audio.play('hint');
  }

  // ── Restart paths ──────────────────────────────────────────
  restartSame(els) {
    this.summary.hide();
    els.play.hidden = false;
    this.store.resetSession();
    this.stats.resetProgress();
    this.newRound();
  }

  // ── Internals ──────────────────────────────────────────────
  _mode() { return MODES[this.store.MODE]; }

  _applySkyForRound() {
    if (this.store.MODE === 'free') {
      this.sky.apply(this.store.freePlayHour24(), this.store.STATE.handM);
    } else {
      this.sky.apply(this.store.ROUND.hour24, this.store.ROUND.minute);
    }
  }

  _startTimer() {
    this.store.timerStart = Date.now();
    this._stopTimer();
    this._tInterval = setInterval(() => this._tick(), 100);
    this.stats.setTimerBar(1);
  }

  _stopTimer() {
    if (this._tInterval) {
      clearInterval(this._tInterval);
      this._tInterval = null;
    }
  }

  _tick() {
    if (this.store.answered) return;
    const T = DIFFICULTIES[this.store.DIFF].timer;
    const f = Math.max(0, 1 - (Date.now() - this.store.timerStart) / 1000 / T);
    this.stats.setTimerBar(f);
    if (f <= 0) {
      this._stopTimer();
      this.onTimeout();
    }
  }

  _showSummary() {
    this._stopTimer();
    this.summary.show();

    if (!this.audio) return;
    // Speak the verdict that matches the result (mirrors summary.js logic).
    const { results, DIFF } = this.store;
    const n = results.length;
    const c = results.filter((r) => r.correct).length;
    const acc = c / n;
    const avgLat = results.reduce((s, r) => s + r.latency, 0) / n;
    const plateau = DIFFICULTIES[DIFF].plateau;
    let verdictKey;
    if (acc >= PROMOTE && avgLat <= plateau) verdictKey = 'verdict-promote';
    else if (acc >= PASS)                    verdictKey = 'verdict-pass';
    else if (acc >= FALLBACK)                verdictKey = 'verdict-keep-going';
    else                                     verdictKey = 'verdict-try-easy';
    this.audio.play(verdictKey);
  }
}
