// Two rails (hour + minute) with draggable knobs. Each knob's position is
// computed from STATE; pointer drag → store.setSliderH/M.

const PAD = 26;  // matches CSS .rail-ticks `padding: 0 26px`.

export class Sliders {
  constructor({ hourRail, hourKnob, hourTicks, minuteRail, minuteKnob, minuteTicks, store }) {
    this.store = store;
    this._rails = {
      hour:   { rail: hourRail,   knob: hourKnob,   ticks: hourTicks,   min: 1, max: 12, step: 1, vals: [] },
      minute: { rail: minuteRail, knob: minuteKnob, ticks: minuteTicks, min: 0, max: 60, step: 5, vals: [] },
    };
  }

  build() {
    this._buildTicks('hour');
    this._buildTicks('minute');
    this._attach('hour');
    this._attach('minute');
    this.render('hour');
    this.render('minute');
  }

  _buildTicks(kind) {
    const r = this._rails[kind];
    r.ticks.innerHTML = '';
    r.vals.length = 0;
    for (let v = r.min; v <= r.max; v += r.step) r.vals.push(v);
    r.vals.forEach((v) => {
      const span = document.createElement('span');
      span.className = 'rail-tick';
      if (kind === 'minute' && v === r.max) span.textContent = '0/60';
      else if (kind === 'minute' && v % 10 !== 0 && v !== 0 && v !== 60) span.textContent = '';
      else span.textContent = String(v);
      r.ticks.appendChild(span);
    });
  }

  _attach(kind) {
    const r = this._rails[kind];
    const valueFromX = (clientX) => {
      const rect = r.rail.getBoundingClientRect();
      const usable = Math.max(1, rect.width - 2 * PAD);
      const relX = Math.max(0, Math.min(usable, clientX - rect.left - PAD));
      const frac = relX / usable;
      const idx = Math.round(frac * (r.vals.length - 1));
      return r.vals[idx];
    };

    let dragging = false;
    let pid = null;

    const setVal = (v) => {
      if (kind === 'hour') this.store.setSliderH(v);
      else this.store.setSliderM(v === 60 ? 0 : v);
    };

    const start = (e) => {
      if (!this.store.MODE || !this.store.DIFF) return;
      const lockedKey = kind === 'hour' ? 'sliderH' : 'sliderM';
      if (this.store.STATE.locked[lockedKey]) return;
      dragging = true;
      pid = e.pointerId;
      try { r.rail.setPointerCapture(pid); } catch {}
      r.rail.setAttribute('data-dragging', 'true');
      setVal(valueFromX(e.clientX));
      e.preventDefault();
    };

    const move = (e) => {
      if (!dragging || e.pointerId !== pid) return;
      setVal(valueFromX(e.clientX));
    };

    const end = (e) => {
      if (!dragging) return;
      if (e.pointerId !== pid) return;
      try { r.rail.releasePointerCapture(pid); } catch {}
      r.rail.removeAttribute('data-dragging');
      dragging = false; pid = null;
    };

    r.rail.addEventListener('pointerdown', start);
    r.rail.addEventListener('pointermove', move);
    r.rail.addEventListener('pointerup', end);
    r.rail.addEventListener('pointercancel', end);
  }

  render(kind) {
    const r = this._rails[kind];
    const rect = r.rail.getBoundingClientRect();
    if (rect.width === 0) {
      // Rail isn't laid out yet (display:none somewhere up the tree). Retry next frame.
      requestAnimationFrame(() => this.render(kind));
      return;
    }
    const usable = rect.width - 2 * PAD;
    let v, idx, total;
    if (kind === 'hour') {
      v = this.store.STATE.sliderH; idx = v - 1; total = 11;
    } else {
      v = this.store.STATE.sliderM; idx = v / 5; total = 12;
    }
    const x = PAD + (idx / total) * usable;
    r.knob.style.left = x + 'px';
    r.knob.textContent = String(v);
  }

  syncLockedAttrs() {
    this._rails.hour.rail.setAttribute('data-locked',   String(this.store.STATE.locked.sliderH));
    this._rails.minute.rail.setAttribute('data-locked', String(this.store.STATE.locked.sliderM));
  }
}
