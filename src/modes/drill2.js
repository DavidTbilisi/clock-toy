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
  },

  targetText() {
    return t('prompts.readTheClock');
  },
};
