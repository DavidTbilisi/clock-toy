// Minimal event emitter — Observer pattern's pub side.
// Listeners receive emitted args; `on` returns an unsubscribe fn.

export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  emit(event, ...args) {
    const set = this._listeners.get(event);
    if (!set) return;
    // Copy so listeners that unsubscribe during emit don't disturb iteration.
    for (const fn of [...set]) fn(...args);
  }
}
