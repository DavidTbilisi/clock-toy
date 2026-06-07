// Mode registry — central lookup. Keep insertion order; the mode picker iterates
// over Object.values() and renders cards in this order.

import { FreeMode }   from './free.js';
import { Drill1Mode } from './drill1.js';
import { Drill2Mode } from './drill2.js';
import { Drill3Mode } from './drill3.js';

export const MODES = {
  free:   FreeMode,
  drill1: Drill1Mode,
  drill2: Drill2Mode,
  drill3: Drill3Mode,
};
