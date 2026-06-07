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
import { i18n, t, SUPPORTED as LOCALES } from './i18n/index.js';
import { MODES } from './modes/index.js';
import { AudioPlayer } from './audio.js';

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

  localeToggle:   $('locale-toggle'),
  voiceToggle:    $('voice-toggle'),
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
const audio = new AudioPlayer({ locale: i18n.locale });
const runner = new RoundRunner({ store, clock, sliders, sky, stats, feedback, summary, audio });
const pickers = new Pickers({
  store, els,
  onStartSession: () => runner.startSession(),
});

// ── Observer wiring (Store events → side effects) ───────────
// In Free Play, dragging hands also drags the time of day. The 12-hour clock
// face is ambiguous (one "12" stands for both noon and midnight), so the
// AM/PM toggle below disambiguates explicitly into a 24-hour time.
function applySkyFromHands() {
  sky.apply(store.freePlayHour24(), store.STATE.handM);
}
store.on('hands:change', () => {
  clock.renderHands();
  if (store.MODE === 'free') applySkyFromHands();
});
store.on('sliders:change', (h, m) => {
  sliders.render('hour');
  sliders.render('minute');
});

// Cycle detector: in Free Play, two full revolutions of the hour hand = one
// full 24-hour day. The period auto-flips AM ↔ PM whenever the hand crosses
// the 11↔12 boundary on the clock face. No visible toggle; the only way to
// see the change is through the sky responding.
let prevFreeHandH = null;
store.on('mode:change', (m) => {
  prevFreeHandH = m === 'free' ? store.STATE.handH : null;
});
store.on('hands:change', (h) => {
  if (prevFreeHandH === null) return;
  if ((prevFreeHandH === 11 && h === 12) || (prevFreeHandH === 12 && h === 11)) {
    store.setPeriod(store.period === 'am' ? 'pm' : 'am');
  }
  prevFreeHandH = h;
});
store.on('period:change', () => {
  if (store.MODE === 'free') applySkyFromHands();
});

// ── DOM event binding (replaces former inline onclick=…) ────
els.rollBtn.addEventListener('click', () => runner.rollDice());
els.hintBtn.addEventListener('click', () => runner.showHint());
els.checkBtn.addEventListener('click', () => runner.checkAnswer());
els.nextBtn.addEventListener('click', () => runner.nextRound());
els.backToModes.addEventListener('click', () => pickers.resetToModes());
els.localeToggle.addEventListener('click', () => i18n.cycleLocale());
els.voiceToggle.addEventListener('click', () => { audio.toggle(); refreshVoiceToggle(); });

function refreshVoiceToggle() {
  els.voiceToggle.textContent = audio.isEnabled() ? '🔊' : '🔇';
  els.voiceToggle.setAttribute('aria-pressed', String(audio.isEnabled()));
}
refreshVoiceToggle();

// ── i18n ────────────────────────────────────────────────────
// Update every element marked with data-i18n="dotted.key", refresh dynamic
// components that own their own DOM, and reflect the current locale on the
// header toggle. Runs at boot and on every locale:change.
function applyLocale() {
  document.documentElement.lang = i18n.locale;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  els.localeToggle.textContent = i18n.locale.toUpperCase();
  pickers.refresh();
  feedback.refresh();
  summary.refresh();
  // The target display is dynamic per-round; refresh it from the active mode.
  if (store.MODE && store.ROUND) {
    const m = MODES[store.MODE];
    if (m) stats.setTargetText(m.targetText(store.ROUND));
  }
}
i18n.on('locale:change', (code) => {
  audio.setLocale(code);
  applyLocale();
});

window.addEventListener('resize', () => {
  sliders.render('hour');
  sliders.render('minute');
  if (store.ROUND) {
    if (store.MODE === 'free') {
      applySkyFromHands();
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
applyLocale();  // initial pass so static `[data-i18n]` text reflects the loaded locale

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
  period: () => store.period,
  setPeriod: (p) => store.setPeriod(p),
  freePlayHour24: () => store.freePlayHour24(),
  applySky: (h, m) => sky.apply(h, m),
  // Drive the store through its real setters so observers fire (used by tests).
  setHandH:   (h) => store.setHandH(h),
  setHandM:   (m) => store.setHandM(m),
  setSliderH: (h) => store.setSliderH(h),
  setSliderM: (m) => store.setSliderM(m),
  locale:     () => i18n.locale,
  setLocale:  (c) => i18n.setLocale(c),
  cycleLocale: () => i18n.cycleLocale(),
};
