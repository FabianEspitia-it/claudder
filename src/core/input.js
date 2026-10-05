import { CONFIG } from './config.js';
import { EVENTS } from './events.js';

export const ACTIONS = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  CONFIRM: 'confirm',
  PAUSE: 'pause',
  DEBUG_LOSE: 'debugLose',
  DEBUG_WIN: 'debugWin',
});

export const MOVE_ACTIONS = Object.freeze(
  new Set([ACTIONS.UP, ACTIONS.DOWN, ACTIONS.LEFT, ACTIONS.RIGHT]),
);

const DEBUG_ACTIONS = new Set([ACTIONS.DEBUG_LOSE, ACTIONS.DEBUG_WIN]);

const ACTION_BY_KEY_CODE = Object.freeze({
  ArrowUp: ACTIONS.UP,
  KeyW: ACTIONS.UP,
  ArrowDown: ACTIONS.DOWN,
  KeyS: ACTIONS.DOWN,
  ArrowLeft: ACTIONS.LEFT,
  KeyA: ACTIONS.LEFT,
  ArrowRight: ACTIONS.RIGHT,
  KeyD: ACTIONS.RIGHT,
  Enter: ACTIONS.CONFIRM,
  NumpadEnter: ACTIONS.CONFIRM,
  KeyP: ACTIONS.PAUSE,
  Escape: ACTIONS.PAUSE,
  KeyG: ACTIONS.DEBUG_LOSE,
  KeyV: ACTIONS.DEBUG_WIN,
});

export class Input {
  #eventBus;
  #target;
  #pendingActions = [];
  #pressedKeyCodes = new Set();

  constructor(eventBus, target = window) {
    this.#eventBus = eventBus;
    this.#target = target;
  }

  attach() {
    this.#target.addEventListener('keydown', this.#handleKeyDown);
    this.#target.addEventListener('keyup', this.#handleKeyUp);
    window.addEventListener('blur', this.#handleWindowBlur);
  }

  detach() {
    this.#target.removeEventListener('keydown', this.#handleKeyDown);
    this.#target.removeEventListener('keyup', this.#handleKeyUp);
    window.removeEventListener('blur', this.#handleWindowBlur);
    this.#pendingActions.length = 0;
    this.#pressedKeyCodes.clear();
  }

  flush() {
    const actions = this.#pendingActions.splice(0);
    for (const action of actions) {
      this.#eventBus.emit(EVENTS.INPUT_ACTION, { action });
    }
  }

  isDown(action) {
    for (const keyCode of this.#pressedKeyCodes) {
      if (ACTION_BY_KEY_CODE[keyCode] === action) return true;
    }
    return false;
  }

  #handleKeyDown = (event) => {
    const action = ACTION_BY_KEY_CODE[event.code];
    if (!action) return;
    if (DEBUG_ACTIONS.has(action) && !CONFIG.DEBUG) return;
    event.preventDefault();
    if (event.repeat) return;
    this.#pressedKeyCodes.add(event.code);
    this.#pendingActions.push(action);
  };

  #handleKeyUp = (event) => {
    this.#pressedKeyCodes.delete(event.code);
  };

  #handleWindowBlur = () => {
    this.#pressedKeyCodes.clear();
    this.#eventBus.emit(EVENTS.WINDOW_BLUR);
  };
}
