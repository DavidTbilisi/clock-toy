// Static configuration — modes, difficulties, palette, thresholds.
// Pure data: no DOM, no state, no side effects.

export const STORAGE_KEY = 'clock-toy-gym';
export const ROUNDS_PER_SESSION = 10;
export const HISTORY_CAP = 20;

// Names and descriptions live in src/i18n/*.js under `difficulties.<key>`.
export const DIFFICULTIES = {
  easy:   { key: 'easy',   icon: '🌱', timer: 25, plateau: 14000, minuteStep: 30, hourDrift: false },
  medium: { key: 'medium', icon: '🌿', timer: 15, plateau:  9000, minuteStep:  5, hourDrift: false },
  hard:   { key: 'hard',   icon: '🌳', timer: 10, plateau:  6000, minuteStep:  1, hourDrift: true  },
};

// Verdict thresholds for the summary screen.
export const PASS = 0.80;
export const PROMOTE = 0.90;
export const FALLBACK = 0.60;

// Stroke-dasharray totals for the two progress rings (smaller stat ring, bigger summary ring).
export const STAT_RING_CIRC = 170;
export const SUMMARY_RING_CIRC = 220;

// Hour-bubble palette — dusty risograph rainbow, in order 1..12.
export const HOUR_COLORS = [
  '#c44a3e', '#d97843', '#d9a44a', '#b8a548',
  '#8a9a47', '#5d8a4e', '#4e9c91', '#4a8aa3',
  '#6b7bb8', '#9069b8', '#b85e9c', '#a84b48',
];
