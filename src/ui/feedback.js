// Feedback panel + check/next/hint button visibility.
// Pure DOM mutator — game logic decides what to show, this just renders it.

import { formatTime, periodIcon } from '../modes/base.js';

function nicePartOfDay(h24) {
  if (h24 >= 5  && h24 < 12) return 'morning';
  if (h24 >= 12 && h24 < 17) return 'afternoon';
  if (h24 >= 17 && h24 < 20) return 'evening';
  return 'night';
}

export class FeedbackView {
  constructor({ els }) {
    this.els = els;
  }

  hide() {
    this.els.fb.style.display = 'none';
  }

  showAnswer({ ok, timeout, round, errors }) {
    const fb = this.els.fb;
    fb.style.display = 'block';
    fb.className = ok ? 'ok' : 'bad';

    let title, body;
    if (timeout) {
      title = `⏱ Time's up! The time was ${formatTime(round)}.`;
      body  = `Try to read the clock a little quicker next round.`;
    } else if (ok) {
      title = `✓ ${formatTime(round)} — exactly right!`;
      body  = `That's ${formatTime(round)} in the ${nicePartOfDay(round.hour24)}. ${periodIcon(round)}`;
    } else {
      title = `Almost! Check the ${errors[0]}.`;
      body  = `Target was <b>${formatTime(round)}</b> (hour ${round.hour}, minute ${round.minute}).`;
      if (errors.length > 1) body += ` (${errors.length} parts to fix)`;
    }
    fb.innerHTML = `<div class="fv">${title}</div><div>${body}</div>`;
  }

  showHint() {
    const fb = this.els.fb;
    fb.className = 'hint';
    fb.style.display = 'block';
    fb.innerHTML =
      `<div class="fv">💡 Reading the minute hand</div>
       <div>The <b style="color:var(--hand-m)">blue hand</b> always points at a tick on the outer ring.<br>
       The little number (5, 10, 15… 60) at that tick is the minute — <b>not</b> the big hour bubble underneath.</div>`;
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
