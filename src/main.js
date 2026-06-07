// Composition root. Builds module instances, wires Observer subscriptions,
// binds DOM event handlers, exposes a small global surface for tests/debug.

import { Store } from './state.js';
import { HistoryStore } from './storage.js';
import { Sky } from './sky.js';
import { Clock } from './clock.js';
import { Sliders } from './sliders.js';
import { StatsView } from './ui/stats.js';
import { FeedbackView } from './ui/feedback.js';
import { Pickers } from './ui/pickers.js';
import { SummaryView } from './ui/summary.js';
import { RoundRunner } from './round.js';

const $ = (id) => document.getElementById(id);

// ── DOM refs (single point of lookup) ────────────────────────
const els = {
  body:           document.body,
  sun:            $('sun'),
  moon:           $('moon'),
  stars:          $('stars'),

  modeSel:        $('mode-sel'),
  modeGrid:       $('mode-grid'),
  diffSel:        $('diff-sel'),
  diffGrid:       $('diff-grid'),
  play:           $('play'),
  summary:        $('summary'),
  modePill:       $('mode-pill'),
  backToModes:    document.querySelector('#diff-sel .restart-btn'),

  progTrack:      $('prog-track'),
  timerWrap:      $('timer-wrap'),
  timerBar:       $('timer-bar'),
  statsRow:       $('stats-row'),
  rFill:          $('r-fill'),
  rPct:           $('r-pct'),
  latBar:         $('lat-bar'),
  latTxt:         $('lat-txt'),
  sdots:          $('sdots'),

  dice:           $('dice'),
  rollBtn:        $('roll-btn'),
  targetDisplay:  $('target-display'),
  clockSvg:       $('clock'),

  hourRail:       $('hour-rail'),
  hourKnob:       $('hour-knob'),
  hourTicks:      $('hour-ticks'),
  minuteRail:     $('minute-rail'),
  minuteKnob:     $('minute-knob'),
  minuteTicks:    $('minute-ticks'),

  hintBtn:        $('hint-btn'),
  checkBtn:       $('check-btn'),
  nextBtn:        $('next-btn'),
  fb:             $('fb'),
};

// ── Module instances ────────────────────────────────────────
const store = new Store();
const history = new HistoryStore();
const sky = new Sky({ body: els.body, sun: els.sun, stars: els.stars });
const clock = new Clock({ svg: els.clockSvg, store });
const sliders = new Sliders({
  hourRail: els.hourRail, hourKnob: els.hourKnob, hourTicks: els.hourTicks,
  minuteRail: els.minuteRail, minuteKnob: els.minuteKnob, minuteTicks: els.minuteTicks,
  store,
});
const stats = new StatsView({ store, els });
const feedback = new FeedbackView({ els });
const summary = new SummaryView({
  store, history, els,
  onRestartSame: () => runner.restartSame(els),
  onChooseMode: () => pickers.resetToModes(),
});
const runner = new RoundRunner({ store, clock, sliders, sky, stats, feedback, summary });
const pickers = new Pickers({
  store, els,
  onStartSession: () => runner.startSession(),
});

// ── Observer wiring (Store events → side effects) ───────────
// In Free Play, dragging hands also drags the time of day.
store.on('hands:change', () => {
  clock.renderHands();
  if (store.MODE === 'free') {
    const h = store.STATE.handH === 12 ? 0 : store.STATE.handH;
    sky.apply(h, store.STATE.handM);
  }
});
store.on('sliders:change', (h, m) => {
  // The store has already updated STATE; re-render the affected rail only.
  // Both rails subscribe to the same event but render() reads from STATE so
  // re-rendering both is fine (cheap; just sets `left` + `textContent`).
  sliders.render('hour');
  sliders.render('minute');
});

// ── DOM event binding (replaces former inline onclick=…) ────
els.rollBtn.addEventListener('click', () => runner.rollDice());
els.hintBtn.addEventListener('click', () => runner.showHint());
els.checkBtn.addEventListener('click', () => runner.checkAnswer());
els.nextBtn.addEventListener('click', () => runner.nextRound());
els.backToModes.addEventListener('click', () => pickers.resetToModes());

window.addEventListener('resize', () => {
  sliders.render('hour');
  sliders.render('minute');
  if (store.ROUND) {
    if (store.MODE === 'free') {
      const h = store.STATE.handH === 12 ? 0 : store.STATE.handH;
      sky.apply(h, store.STATE.handM);
    } else {
      sky.apply(store.ROUND.hour24, store.ROUND.minute);
    }
  } else {
    sky.apply(12, 0);
  }
});

// ── Boot ────────────────────────────────────────────────────
pickers.build();
sky.build();
clock.build();
sliders.build();

// ── Test/debug surface ──────────────────────────────────────
// Keeps the existing Playwright suite green without test changes.
window.pickMode       = (m) => pickers.pickMode(m);
window.pickDifficulty = (d) => pickers.pickDifficulty(d);
window.renderHands    = () => clock.renderHands();
window.renderSlider   = (kind) => sliders.render(kind);

window.__clock = {
  STATE: () => store.STATE,
  ROUND: () => store.ROUND,
  MODE:  () => store.MODE,
  DIFF:  () => store.DIFF,
  applySky: (h, m) => sky.apply(h, m),
};
