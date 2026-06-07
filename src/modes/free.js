import { formatTime, periodIcon } from './base.js';

export const FreeMode = {
  key: 'free',
  icon: '🎲',
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
