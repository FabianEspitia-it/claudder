import { EVENTS } from './events.js';

export const STATES = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  WIN: 'win',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [STATES.MENU]: [STATES.PLAYING],
  [STATES.PLAYING]: [STATES.PAUSED, STATES.GAME_OVER, STATES.WIN, STATES.MENU],
  [STATES.PAUSED]: [STATES.PLAYING, STATES.MENU],
  [STATES.GAME_OVER]: [STATES.MENU, STATES.PLAYING],
  [STATES.WIN]: [STATES.MENU, STATES.PLAYING],
});

export class StateMachine {
  #eventBus;
  #currentState = null;
  #initialState;
  #handlersByState;

  constructor(eventBus, initialState, handlersByState = {}) {
    this.#eventBus = eventBus;
    this.#initialState = initialState;
    this.#handlersByState = handlersByState;
  }

  get currentState() {
    return this.#currentState;
  }

  is(state) {
    return this.#currentState === state;
  }

  canTransitionTo(nextState) {
    return ALLOWED_TRANSITIONS[this.#currentState]?.includes(nextState) ?? false;
  }

  start() {
    this.#currentState = this.#initialState;
    this.#handlersByState[this.#currentState]?.enter?.(null);
    this.#eventBus.emit(EVENTS.STATE_CHANGE, { from: null, to: this.#currentState });
  }

  transition(nextState) {
    if (!this.canTransitionTo(nextState)) {
      console.warn(`[stateMachine] invalid transition: ${this.#currentState} → ${nextState}`);
      return false;
    }
    const previousState = this.#currentState;
    this.#handlersByState[previousState]?.exit?.(nextState);
    this.#currentState = nextState;
    this.#handlersByState[nextState]?.enter?.(previousState);
    this.#eventBus.emit(EVENTS.STATE_CHANGE, { from: previousState, to: nextState });
    return true;
  }

  update(deltaTime) {
    this.#handlersByState[this.#currentState]?.update?.(deltaTime);
  }
}
