// Single source of truth. Holds session state and emits change events.
// Observers (Clock, Sky, Sliders, UI) subscribe and react.

import { EventEmitter } from './events.js';

export function freshHandState() {
  return {
    handH: 12, handM: 0,
    sliderH: 12, sliderM: 0,
    locked: { handH: false, handM: false, sliderH: false, sliderM: false },
  };
}

export class Store extends EventEmitter {
  constructor() {
    super();
    this.MODE = null;
    this.DIFF = null;
    this.ROUND = null;
    this.STATE = freshHandState();

    // Default PM so Free Play opens with the bright noon sun (handH=12 + PM = 12:00).
    // The 12-hour clock face is intrinsically ambiguous (one "12" stands for both
    // midnight and noon); the AM/PM toggle in Free Play is what makes it explicit.
    this.period = 'pm';

    // Session-level (resets each new session)
    this.cur = 0;
    this.results = [];
    this.streak = 0;
    this.timerStart = 0;
    this.answered = false;
  }

  // Translate the 12-hour hand position + period into a 24-hour hour. Standard
  // AM/PM math: 12 AM = 0, 12 PM = 12, 1..11 AM = 1..11, 1..11 PM = 13..23.
  freePlayHour24() {
    const h = this.STATE.handH;
    if (h === 12) return this.period === 'am' ? 0 : 12;
    return h + (this.period === 'pm' ? 12 : 0);
  }

  setPeriod(p) {
    if (p !== 'am' && p !== 'pm') return;
    if (this.period === p) return;
    this.period = p;
    this.emit('period:change', p);
  }

  // ── Mode/Difficulty ─────────────────────────────────────────
  setMode(m) {
    this.MODE = m;
    this.emit('mode:change', m);
  }

  setDifficulty(d) {
    this.DIFF = d;
    this.emit('difficulty:change', d);
  }

  // ── Round ───────────────────────────────────────────────────
  setRound(round) {
    this.ROUND = round;
    this.STATE = freshHandState();
    this.answered = false;
    this.emit('round:new', round);
  }

  markAnswered(result) {
    this.answered = true;
    this.results.push(result);
    this.streak = result.correct ? this.streak + 1 : 0;
    this.cur += 1;
    this.emit('round:answered', result);
  }

  // ── Hand/slider state ───────────────────────────────────────
  // The four setters are paired: moving a hand drives the matching slider
  // (and vice-versa) so the two controls always show the same time. Locks
  // are respected, so drill2 (hands locked) and drill3 (sliders locked)
  // keep their pre-filled side intact when the player drives the other.
  // No recursion: each setter emits its own event after mirroring, but
  // never calls a peer setter — observers handle the resulting render.
  setHandH(h) {
    this.STATE.handH = h;
    this.emit('hands:change', this.STATE.handH, this.STATE.handM);
    if (!this.STATE.locked.sliderH && this.STATE.sliderH !== h) {
      this.STATE.sliderH = h;
      this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
    }
  }

  setHandM(m) {
    this.STATE.handM = m;
    this.emit('hands:change', this.STATE.handH, this.STATE.handM);
    if (!this.STATE.locked.sliderM && this.STATE.sliderM !== m) {
      this.STATE.sliderM = m;
      this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
    }
  }

  setSliderH(h) {
    this.STATE.sliderH = h;
    this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
    if (!this.STATE.locked.handH && this.STATE.handH !== h) {
      this.STATE.handH = h;
      this.emit('hands:change', this.STATE.handH, this.STATE.handM);
    }
  }

  setSliderM(m) {
    this.STATE.sliderM = m;
    this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
    if (!this.STATE.locked.handM && this.STATE.handM !== m) {
      this.STATE.handM = m;
      this.emit('hands:change', this.STATE.handH, this.STATE.handM);
    }
  }

  // ── Session lifecycle ───────────────────────────────────────
  resetSession() {
    this.cur = 0;
    this.results = [];
    this.streak = 0;
    this.answered = false;
    this.emit('session:reset');
  }

  reset() {
    this.MODE = null;
    this.DIFF = null;
    this.ROUND = null;
    this.STATE = freshHandState();
    this.resetSession();
    this.emit('reset');
  }
}
