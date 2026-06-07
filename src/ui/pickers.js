// Mode + difficulty pickers. Builds the cards from the registries, looks up
// human-readable names through i18n, and re-renders whenever the locale flips.

import { DIFFICULTIES } from '../config.js';
import { MODES } from '../modes/index.js';
import { t } from '../i18n/index.js';

export class Pickers {
  constructor({ store, els, onStartSession }) {
    this.store = store;
    this.els = els;
    this.onStartSession = onStartSession;
  }

  build() {
    this.refresh();
  }

  // Re-create the picker cards from the current locale. Cheap — only runs on
  // mount + locale changes, never per-frame.
  refresh() {
    this.els.modeGrid.innerHTML = '';
    Object.entries(MODES).forEach(([key, m]) => {
      const c = document.createElement('div');
      c.className = 'sel-card';
      c.addEventListener('click', () => this.pickMode(key));
      c.innerHTML =
        `<div class="sel-badge">${m.icon}</div>` +
        `<div class="sel-name">${t(`modes.${key}.name`)}</div>` +
        `<div class="sel-desc">${t(`modes.${key}.desc`)}</div>`;
      this.els.modeGrid.appendChild(c);
    });

    this.els.diffGrid.innerHTML = '';
    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
      const c = document.createElement('div');
      c.className = 'sel-card';
      c.addEventListener('click', () => this.pickDifficulty(key));
      c.innerHTML =
        `<div class="sel-badge">${d.icon}</div>` +
        `<div class="sel-name">${t(`difficulties.${key}.name`)}</div>` +
        `<div class="sel-desc">${t(`difficulties.${key}.desc`)}<br><b>${t('picker.perRound', { n: d.timer })}</b></div>`;
      this.els.diffGrid.appendChild(c);
    });

    // The mode pill keeps a localised label whenever a mode is already chosen.
    if (this.store.MODE && this.store.DIFF) {
      this.els.modePill.textContent =
        `${t(`modes.${this.store.MODE}.name`)} · ${t(`difficulties.${this.store.DIFF}.name`)}`;
    } else if (this.store.MODE) {
      this.els.modePill.textContent = t(`modes.${this.store.MODE}.name`);
    } else {
      this.els.modePill.textContent = t('app.chooseMode');
    }
  }

  pickMode(key) {
    this.store.setMode(key);
    this.els.modeSel.hidden = true;
    this.els.diffSel.hidden = false;
    this.els.modePill.textContent = t(`modes.${key}.name`);
  }

  pickDifficulty(key) {
    this.store.setDifficulty(key);
    this.els.diffSel.hidden = true;
    this.els.play.hidden = false;
    this.els.modePill.textContent =
      `${t(`modes.${this.store.MODE}.name`)} · ${t(`difficulties.${key}.name`)}`;
    this.onStartSession();
  }

  // Return to mode picker without changing existing MODE/DIFF.
  showModes() {
    this.els.diffSel.hidden = true;
    this.els.play.hidden = true;
    this.els.summary.hidden = true;
    this.els.modeSel.hidden = false;
  }

  // Full reset — clear MODE/DIFF and return to mode picker.
  resetToModes() {
    this.store.reset();
    this.showModes();
    this.els.modePill.textContent = t('app.chooseMode');
  }
}
