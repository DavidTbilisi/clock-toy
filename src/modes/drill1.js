import { formatTime, periodIcon } from './base.js';

export const Drill1Mode = {
  key: 'drill1',
  icon: '🎯',
  timed: true,
  showsHint: false,
  showsDice: true,

  setup() {
    // Nothing locked — player sets all four inputs.
  },

  targetText(round) {
    return `${formatTime(round)} ${periodIcon(round)}`;
  },
};
