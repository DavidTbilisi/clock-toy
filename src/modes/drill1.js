import { formatTime, periodIcon } from './base.js';

export const Drill1Mode = {
  key: 'drill1',
  name: 'Set the Clock',
  icon: '🎯',
  desc: 'Roll. Match the time with hands AND sliders.',
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
