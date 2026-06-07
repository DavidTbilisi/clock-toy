// Tiny i18n: register locale dictionaries, look up by dotted key, sub {placeholders}.
// `t('feedback.correctTitle', { time: '3:25' })` → "✓ 3:25 — exactly right!"
//
// A `locale:change` event is emitted on the (singleton) i18n instance so the
// UI can re-render whenever the active locale flips.

import { EventEmitter } from '../events.js';
import en from './en.js';
import ka from './ka.js';
import ru from './ru.js';

const STORAGE_KEY = 'clock-toy-locale';
export const SUPPORTED = /** @type {const} */ (['en', 'ka', 'ru']);

const dicts = { en, ka, ru };

function dottedGet(obj, key) {
  return key.split('.').reduce((o, part) => (o == null ? undefined : o[part]), obj);
}

function interpolate(str, params) {
  if (!params) return str;
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
}

export class I18n extends EventEmitter {
  constructor() {
    super();
    this.locale = this._loadInitial();
  }

  _loadInitial() {
    try {
      const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch {}
    // Fall back to browser language if it matches one of our supported locales.
    const nav = (globalThis.navigator?.language || '').toLowerCase();
    for (const code of SUPPORTED) {
      if (nav.startsWith(code)) return code;
    }
    return 'en';
  }

  setLocale(code) {
    if (!SUPPORTED.includes(code)) return;
    if (this.locale === code) return;
    this.locale = code;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, code); } catch {}
    this.emit('locale:change', code);
  }

  cycleLocale() {
    const i = SUPPORTED.indexOf(this.locale);
    this.setLocale(SUPPORTED[(i + 1) % SUPPORTED.length]);
  }

  t(key, params) {
    // Try the current locale, then fall back to English so a missing key
    // never crashes the UI — it just shows the English fallback.
    const value = dottedGet(dicts[this.locale], key) ?? dottedGet(dicts.en, key) ?? key;
    return interpolate(value, params);
  }
}

export const i18n = new I18n();
export const t = (key, params) => i18n.t(key, params);
