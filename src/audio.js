// Plays pre-generated MP3 clips from audio/<locale>/<key>.mp3.
// Knows about: current locale (so the right voice plays), an on/off toggle
// persisted to localStorage, and a tiny queue so we never overlap clips.

const STORAGE_KEY = 'clock-toy-voice';

export class AudioPlayer {
  constructor({ locale = 'en' } = {}) {
    this._locale = locale;
    this._enabled = this._loadEnabled();
    this._current = null;
  }

  _loadEnabled() {
    try {
      const v = globalThis.localStorage?.getItem(STORAGE_KEY);
      // Default ON. Only flip off if the user explicitly disabled it.
      return v !== '0';
    } catch {
      return true;
    }
  }

  setLocale(code) { this._locale = code; }

  isEnabled() { return this._enabled; }

  setEnabled(on) {
    this._enabled = !!on;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, on ? '1' : '0'); } catch {}
    if (!on) this.stop();
  }

  toggle() { this.setEnabled(!this._enabled); return this._enabled; }

  // Stop whatever is playing right now (used when toggling off, or when a new
  // clip arrives that should preempt the previous one).
  stop() {
    if (this._current) {
      try {
        this._current.pause();
        this._current.currentTime = 0;
      } catch {}
      this._current = null;
    }
  }

  // Fire-and-forget. Silently no-ops when disabled or when autoplay is blocked.
  play(key) {
    if (!this._enabled || !key) return;
    this.stop();
    const audio = new Audio(`audio/${this._locale}/${key}.mp3`);
    this._current = audio;
    audio.addEventListener('ended', () => {
      if (this._current === audio) this._current = null;
    });
    audio.play().catch(() => {
      // Autoplay-blocked or asset missing — silent fail; the game still works.
      if (this._current === audio) this._current = null;
    });
  }
}
