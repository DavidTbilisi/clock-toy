// Feedback panel + check/next/hint button visibility.
// Pure DOM mutator — game logic decides what to show, this just renders it.
// Last-shown state is cached so refresh() can re-render in a new locale.

import { formatTime, periodIcon } from '../modes/base.js';
import { t } from '../i18n/index.js';

const ERROR_KEY = {
  'hour hand':     'hourHand',
  'minute hand':   'minuteHand',
  'hour slider':   'hourSlider',
  'minute slider': 'minuteSlider',
  'ran out of time': 'ranOutOfTime',
};

function partOfDayKey(h24) {
  if (h24 >= 5  && h24 < 12) return 'morning';
  if (h24 >= 12 && h24 < 17) return 'afternoon';
  if (h24 >= 17 && h24 < 20) return 'evening';
  return 'night';
}

export class FeedbackView {
  constructor({ els }) {
    this.els = els;
    /** @type {null | {kind:'answer', args:object} | {kind:'hint'}} */
    this._last = null;
  }

  hide() {
    this.els.fb.style.display = 'none';
    this._last = null;
  }

  showAnswer({ ok, timeout, round, errors }) {
    this._last = { kind: 'answer', args: { ok, timeout, round, errors } };
    this._renderAnswer({ ok, timeout, round, errors });
  }

  showHint() {
    this._last = { kind: 'hint' };
    this._renderHint();
  }

  // Re-render the current panel content in the latest locale.
  refresh() {
    if (!this._last) return;
    if (this._last.kind === 'answer') this._renderAnswer(this._last.args);
    else if (this._last.kind === 'hint') this._renderHint();
  }

  _renderAnswer({ ok, timeout, round, errors }) {
    const fb = this.els.fb;
    fb.style.display = 'block';
    fb.className = ok ? 'ok' : 'bad';

    const time = formatTime(round);
    let title, body;
    if (timeout) {
      title = t('feedback.timeoutTitle', { time });
      body  = t('feedback.timeoutBody');
    } else if (ok) {
      title = t('feedback.correctTitle', { time });
      body  = t('feedback.correctBody', {
        time,
        partOfDay: t(`parts.${partOfDayKey(round.hour24)}`),
        icon: periodIcon(round),
      });
    } else {
      const errKey = ERROR_KEY[errors[0]] || 'hourHand';
      title = t('feedback.wrongTitle', { error: t(`errors.${errKey}`) });
      body  = t('feedback.wrongBody', { time, hour: round.hour, minute: round.minute });
      if (errors.length > 1) body += t('feedback.moreErrors', { n: errors.length });
    }
    fb.innerHTML = `<div class="fv">${title}</div><div>${body}</div>`;
  }

  _renderHint() {
    const fb = this.els.fb;
    fb.className = 'hint';
    fb.style.display = 'block';
    fb.innerHTML =
      `<div class="fv">${t('feedback.hintTitle')}</div>` +
      `<div>${t('feedback.hintBody')}</div>`;
  }

  setCheckMode() {
    this.els.checkBtn.style.display = '';
    this.els.nextBtn.style.display  = 'none';
  }

  setNextMode() {
    this.els.checkBtn.style.display = 'none';
    this.els.nextBtn.style.display  = 'block';
  }

  setHintVisible(visible) {
    this.els.hintBtn.style.display = visible ? '' : 'none';
  }
}
