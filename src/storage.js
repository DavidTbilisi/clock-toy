// Repository pattern over localStorage. Hides the storage backend so the rest
// of the app can save/load session history without thinking about JSON or keys.

import { STORAGE_KEY, HISTORY_CAP } from './config.js';

export class HistoryStore {
  constructor({ backend = globalThis.localStorage, key = STORAGE_KEY, cap = HISTORY_CAP } = {}) {
    this.backend = backend;
    this.key = key;
    this.cap = cap;
  }

  load() {
    try {
      return JSON.parse(this.backend.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  }

  push(entry) {
    const hist = this.load();
    hist.push(entry);
    const trimmed = hist.slice(-this.cap);
    this.backend.setItem(this.key, JSON.stringify(trimmed));
    return trimmed;
  }

  clear() {
    this.backend.removeItem(this.key);
  }
}
