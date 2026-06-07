import { formatTime, periodIcon } from './base.js';

export const FreeMode = {
  key: 'free',
  name: 'Free Play',
  icon: '🎲',
  desc: 'No timer. Roll, set, play around.',
  timed: false,
  showsHint: false,
  showsDice: true,

  setup() {
    // Nothing locked — player drives everything.
  },

  targetText(round) {
    return `${formatTime(round)} ${periodIcon(round)}`;
  },
};
