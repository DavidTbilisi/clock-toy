// Clock SVG: face + 60 ticks + 12 colored hour bubbles + two hands + pivot.
// Owns hand-drag input. Pure DOM/SVG concerns — no game-mode awareness;
// it takes a Store and a difficulty lookup so it can snap to minuteStep.

import { HOUR_COLORS, DIFFICULTIES } from './config.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 200, CY = 200, R = 170;

export class Clock {
  constructor({ svg, store }) {
    this.svg = svg;
    this.store = store;
    this._handH = null;
    this._handM = null;
  }

  build() {
    this.svg.innerHTML = '';

    const face = document.createElementNS(NS, 'circle');
    face.setAttribute('class', 'face');
    face.setAttribute('cx', CX); face.setAttribute('cy', CY); face.setAttribute('r', R);
    this.svg.appendChild(face);

    // 60 ticks; every 5th gets a label.
    for (let i = 0; i < 60; i++) {
      const th = (i * 6 - 90) * Math.PI / 180;
      const tx = CX + (R - 14) * Math.cos(th);
      const ty = CY + (R - 14) * Math.sin(th);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', tx.toFixed(1));
      c.setAttribute('cy', ty.toFixed(1));
      c.setAttribute('r', i % 5 === 0 ? 3.5 : 1.4);
      c.setAttribute('class', 'tick' + (i % 5 === 0 ? ' big' : ''));
      this.svg.appendChild(c);
      if (i % 5 === 0) {
        const num = i === 0 ? 60 : i;
        const lx = CX + (R - 30) * Math.cos(th);
        const ly = CY + (R - 30) * Math.sin(th);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', lx.toFixed(1));
        t.setAttribute('y', ly.toFixed(1));
        t.setAttribute('class', 'tick-num');
        t.textContent = num;
        this.svg.appendChild(t);
      }
    }

    // 12 colored hour bubbles.
    for (let h = 1; h <= 12; h++) {
      const th = (h * 30 - 90) * Math.PI / 180;
      const bx = CX + (R - 62) * Math.cos(th);
      const by = CY + (R - 62) * Math.sin(th);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'hour-bubble');
      const disc = document.createElementNS(NS, 'circle');
      disc.setAttribute('cx', bx.toFixed(1));
      disc.setAttribute('cy', by.toFixed(1));
      disc.setAttribute('r', 19);
      disc.setAttribute('fill', HOUR_COLORS[h - 1]);
      disc.setAttribute('class', 'hour-disc');
      g.appendChild(disc);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', bx.toFixed(1));
      t.setAttribute('y', by.toFixed(1));
      t.setAttribute('class', 'hour-num');
      t.textContent = h;
      g.appendChild(t);
      this.svg.appendChild(g);
    }

    // Minute hand (drawn first so the hour hand sits visually on top).
    this._handM = document.createElementNS(NS, 'line');
    this._handM.setAttribute('id', 'hand-m');
    this._handM.setAttribute('x1', CX); this._handM.setAttribute('y1', CY);
    this._handM.setAttribute('x2', CX); this._handM.setAttribute('y2', CY - 132);
    this.svg.appendChild(this._handM);

    this._handH = document.createElementNS(NS, 'line');
    this._handH.setAttribute('id', 'hand-h');
    this._handH.setAttribute('x1', CX); this._handH.setAttribute('y1', CY);
    this._handH.setAttribute('x2', CX); this._handH.setAttribute('y2', CY - 78);
    this.svg.appendChild(this._handH);

    const pivot = document.createElementNS(NS, 'circle');
    pivot.setAttribute('class', 'pivot');
    pivot.setAttribute('cx', CX); pivot.setAttribute('cy', CY); pivot.setAttribute('r', 8.5);
    this.svg.appendChild(pivot);

    this.attachDrag();
  }

  // Hard mode bleeds minute progress into hour-hand angle.
  hourDisplayAngle() {
    const drift = DIFFICULTIES[this.store.DIFF || 'easy'].hourDrift;
    const Hmod = this.store.STATE.handH % 12;
    return 30 * Hmod + (drift ? 0.5 * this.store.STATE.handM : 0);
  }

  renderHands() {
    if (this._handH) this._handH.setAttribute('transform', `rotate(${this.hourDisplayAngle().toFixed(2)} ${CX} ${CY})`);
    if (this._handM) this._handM.setAttribute('transform', `rotate(${(6 * this.store.STATE.handM).toFixed(2)} ${CX} ${CY})`);
  }

  syncLockedAttrs() {
    if (this._handH) this._handH.setAttribute('data-locked', String(this.store.STATE.locked.handH));
    if (this._handM) this._handM.setAttribute('data-locked', String(this.store.STATE.locked.handM));
  }

  attachDrag() {
    const svg = this.svg;
    const handH = this._handH;
    const handM = this._handM;
    let dragKind = null;
    let pid = null;

    const angleFrom = (e) => {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      let deg = Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180 / Math.PI;
      if (deg < 0) deg += 360;
      return deg;
    };
    const angleDist = (a, b) => {
      const d = Math.abs(a - b) % 360;
      return Math.min(d, 360 - d);
    };

    const begin = (kind, e) => {
      if (!this.store.MODE || !this.store.DIFF) return;
      const lockedKey = kind === 'hour' ? 'handH' : 'handM';
      if (this.store.STATE.locked[lockedKey]) return;
      dragKind = kind;
      pid = e.pointerId;
      try { svg.setPointerCapture(pid); } catch {}
      (kind === 'hour' ? handH : handM).setAttribute('data-dragging', 'true');
      e.preventDefault();
    };

    const apply = (kind, angle) => {
      if (kind === 'hour') {
        const drift = DIFFICULTIES[this.store.DIFF].hourDrift;
        const offset = drift ? 0.5 * this.store.STATE.handM : 0;
        let H = Math.round((angle - offset) / 30);
        H = ((H - 1) % 12 + 12) % 12 + 1;
        this.store.setHandH(H);
      } else {
        const step = DIFFICULTIES[this.store.DIFF].minuteStep;
        const stepDeg = step * 6;
        let M = Math.round(angle / stepDeg) * step;
        if (M >= 60) M = 0;
        this.store.setHandM(M);
      }
    };

    const end = (e) => {
      if (dragKind === null) return;
      if (e.pointerId !== pid) return;
      try { svg.releasePointerCapture(pid); } catch {}
      handH.removeAttribute('data-dragging');
      handM.removeAttribute('data-dragging');
      dragKind = null; pid = null;
    };

    handH.addEventListener('pointerdown', (e) => begin('hour', e));
    handM.addEventListener('pointerdown', (e) => begin('minute', e));

    // Click on empty face area: pick nearest unlocked hand and snap it there.
    svg.addEventListener('pointerdown', (e) => {
      if (dragKind !== null) return;
      if (!this.store.MODE || !this.store.DIFF) return;
      if (e.target === handH || e.target === handM) return;
      const angle = angleFrom(e);
      const hourAvail = !this.store.STATE.locked.handH;
      const minAvail  = !this.store.STATE.locked.handM;
      if (!hourAvail && !minAvail) return;
      const dH = hourAvail ? angleDist(angle, this.hourDisplayAngle()) : Infinity;
      const dM = minAvail  ? angleDist(angle, 6 * this.store.STATE.handM) : Infinity;
      const pick = dH <= dM ? 'hour' : 'minute';
      begin(pick, e);
      apply(pick, angle);
    });

    svg.addEventListener('pointermove', (e) => {
      if (dragKind === null || e.pointerId !== pid) return;
      apply(dragKind, angleFrom(e));
    });
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }
}
