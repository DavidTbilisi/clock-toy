import { t } from '../i18n/index.js';

export const Drill3Mode = {
  key: 'drill3',
  icon: '🔧',
  timed: true,
  showsHint: false,
  showsDice: false,

  setup(store, round) {
    store.STATE.sliderH = round.hour;
    store.STATE.sliderM = round.minute;
    store.STATE.locked.sliderH = true;
    store.STATE.locked.sliderM = true;
  },

  targetText() {
    return t('prompts.matchTheSliders');
  },
};
