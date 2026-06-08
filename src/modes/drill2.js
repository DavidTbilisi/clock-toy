import { t } from '../i18n/index.js';

export const Drill2Mode = {
  key: 'drill2',
  icon: '👀',
  timed: true,
  showsHint: true,
  showsDice: false,

  setup(store, round) {
    store.STATE.handH = round.hour;
    store.STATE.handM = round.minute;
    store.STATE.locked.handH = true;
    store.STATE.locked.handM = true;
    // Hands are locked so the cycle detector can't reach the period from the
    // player side. Align period with the round so the sky truthfully matches
    // the locked hand time (drill2 doesn't grade period either way).
    store.setPeriod(round.period);
  },

  targetText() {
    return t('prompts.readTheClock');
  },
};
