// Mode + difficulty pickers. Builds the cards from the registries and
// owns the visibility transitions between the two pickers and the play screen.

import { DIFFICULTIES } from '../config.js';
import { MODES } from '../modes/index.js';

export class Pickers {
  constructor({ store, els, onStartSession }) {
    this.store = store;
    this.els = els;
    this.onStartSession = onStartSession;
  }

  build() {
    Object.entries(MODES).forEach(([key, m]) => {
      const c = document.createElement('div');
      c.className = 'sel-card';
      c.addEventListener('click', () => this.pickMode(key));
      c.innerHTML =
        `<div class="sel-badge">${m.icon}</div>` +
        `<div class="sel-name">${m.name}</div>` +
        `<div class="sel-desc">${m.desc}</div>`;
      this.els.modeGrid.appendChild(c);
    });

    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
      const c = document.createElement('div');
      c.className = 'sel-card';
      c.addEventListener('click', () => this.pickDifficulty(key));
      c.innerHTML =
        `<div class="sel-badge">${d.icon}</div>` +
        `<div class="sel-name">${d.name}</div>` +
        `<div class="sel-desc">${d.desc}<br><b>${d.timer}s/round</b></div>`;
      this.els.diffGrid.appendChild(c);
    });
  }

  pickMode(key) {
    this.store.setMode(key);
    this.els.modeSel.hidden = true;
    this.els.diffSel.hidden = false;
    this.els.modePill.textContent = MODES[key].name;
  }

  pickDifficulty(key) {
    this.store.setDifficulty(key);
    this.els.diffSel.hidden = true;
    this.els.play.hidden = false;
    this.els.modePill.textContent = `${MODES[this.store.MODE].name} · ${DIFFICULTIES[key].name}`;
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
    this.els.modePill.textContent = 'Choose Mode';
  }
}
