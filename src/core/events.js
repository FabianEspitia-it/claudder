import { CONFIG } from './config.js';

export const EVENTS = Object.freeze({
  INPUT_ACTION: 'input:action',
  INPUT_MOVE: 'input:move',
  WINDOW_BLUR: 'window:blur',
  STATE_CHANGE: 'state:change',
  GAME_NEW: 'game:new',

  FROG_MOVED: 'frog:moved',

  FROG_DIED: 'frog:died',
  FROG_HOME: 'frog:home',
  SCORE_CHANGE: 'score:change',
  LIFE_LOST: 'life:lost',
  TIME_UP: 'time:up',
  LEVEL_START: 'level:start',
  LEVEL_COMPLETE: 'level:complete',
  LIVES_DEPLETED: 'lives:depleted',
  GAME_COMPLETE: 'game:complete',
});

const KNOWN_EVENT_NAMES = new Set(Object.values(EVENTS));

export class EventBus {
  #handlersByEventName = new Map();

  on(eventName, handler) {
    this.#warnIfUnknown(eventName);
    if (!this.#handlersByEventName.has(eventName)) {
      this.#handlersByEventName.set(eventName, new Set());
    }
    this.#handlersByEventName.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off(eventName, handler) {
    this.#handlersByEventName.get(eventName)?.delete(handler);
  }

  emit(eventName, payload = {}) {
    this.#warnIfUnknown(eventName);
    const handlers = this.#handlersByEventName.get(eventName);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[events] a handler for "${eventName}" failed`, error);
      }
    }
  }

  clear() {
    this.#handlersByEventName.clear();
  }

  #warnIfUnknown(eventName) {
    if (CONFIG.DEBUG && !KNOWN_EVENT_NAMES.has(eventName)) {
      console.warn(`[events] unknown event "${eventName}". Did you forget to add it to EVENTS?`);
    }
  }
}
