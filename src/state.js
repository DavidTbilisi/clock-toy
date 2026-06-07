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

    // Session-level (resets each new session)
    this.cur = 0;
    this.results = [];
    this.streak = 0;
    this.timerStart = 0;
    this.answered = false;
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
  setHandH(h) {
    this.STATE.handH = h;
    this.emit('hands:change', this.STATE.handH, this.STATE.handM);
  }

  setHandM(m) {
    this.STATE.handM = m;
    this.emit('hands:change', this.STATE.handH, this.STATE.handM);
  }

  setSliderH(h) {
    this.STATE.sliderH = h;
    this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
  }

  setSliderM(m) {
    this.STATE.sliderM = m;
    this.emit('sliders:change', this.STATE.sliderH, this.STATE.sliderM);
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
