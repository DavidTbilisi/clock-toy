export const Drill2Mode = {
  key: 'drill2',
  name: 'Read the Clock',
  icon: '👀',
  desc: 'Hands are set. Slide the sliders to read the time.',
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
    return 'Read the clock!';
  },
};
