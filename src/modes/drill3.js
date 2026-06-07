export const Drill3Mode = {
  key: 'drill3',
  name: 'Build from Sliders',
  icon: '🔧',
  desc: 'Sliders are set. Place the hands to match.',
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
    return 'Match the sliders!';
  },
};
