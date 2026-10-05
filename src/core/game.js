import { CONFIG } from './config.js';
import { EventBus, EVENTS } from './events.js';
import { Input, ACTIONS, MOVE_ACTIONS } from './input.js';
import { StateMachine, STATES } from './stateMachine.js';
import { Loop } from './loop.js';

export class Game {
  #lastAction = null;

  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.events = new EventBus();
    this.input = new Input(this.events);
    this.modules = [];

    this.stateMachine = new StateMachine(this.events, STATES.MENU, {
      [STATES.PLAYING]: { update: (deltaTime) => this.#updateModules(deltaTime) },
    });

    this.loop = new Loop({
      update: (deltaTime) => this.#tick(deltaTime),
      render: (interpolation) => this.#render(interpolation),
    });

    this.#subscribeToEvents();
  }

  get state() {
    return this.stateMachine.currentState;
  }

  use(module) {
    this.modules.push(module);
    module.initialize?.(this);
    return this;
  }

  start() {
    this.input.attach();
    this.stateMachine.start();
    this.loop.start();
  }

  stop() {
    this.loop.stop();
    this.input.detach();
  }

  newGame() {
    for (const module of this.modules) module.reset?.(this);
    this.events.emit(EVENTS.GAME_NEW);
    this.stateMachine.transition(STATES.PLAYING);
  }

  #tick(deltaTime) {
    this.input.flush();
    this.stateMachine.update(deltaTime);
  }

  #updateModules(deltaTime) {
    for (const module of this.modules) module.update?.(deltaTime, this);
  }

  #render(interpolation) {
    const { context } = this;
    context.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    let anyModuleRendered = false;
    for (const module of this.modules) {
      if (module.render) {
        module.render(context, this, interpolation);
        anyModuleRendered = true;
      }
    }
    if (!anyModuleRendered || CONFIG.DEBUG) this.#renderDebug(context, !anyModuleRendered);
  }

  #subscribeToEvents() {
    const { events } = this;
    events.on(EVENTS.INPUT_ACTION, ({ action }) => this.#handleAction(action));
    events.on(EVENTS.LIVES_DEPLETED, () => this.stateMachine.transition(STATES.GAME_OVER));
    events.on(EVENTS.GAME_COMPLETE, () => this.stateMachine.transition(STATES.WIN));
    events.on(EVENTS.WINDOW_BLUR, () => {
      if (this.stateMachine.is(STATES.PLAYING)) this.stateMachine.transition(STATES.PAUSED);
    });
  }

  #handleAction(action) {
    this.#lastAction = action;

    switch (this.state) {
      case STATES.MENU:
        if (action === ACTIONS.CONFIRM) this.newGame();
        break;

      case STATES.PLAYING:
        if (MOVE_ACTIONS.has(action)) {
          this.events.emit(EVENTS.INPUT_MOVE, { direction: action });
        } else if (action === ACTIONS.PAUSE) {
          this.stateMachine.transition(STATES.PAUSED);
        } else if (action === ACTIONS.DEBUG_LOSE) {
          this.stateMachine.transition(STATES.GAME_OVER);
        } else if (action === ACTIONS.DEBUG_WIN) {
          this.stateMachine.transition(STATES.WIN);
        }
        break;

      case STATES.PAUSED:
        if (action === ACTIONS.PAUSE || action === ACTIONS.CONFIRM) {
          this.stateMachine.transition(STATES.PLAYING);
        }
        break;

      case STATES.GAME_OVER:
      case STATES.WIN:
        if (action === ACTIONS.CONFIRM) this.stateMachine.transition(STATES.MENU);
        break;
    }
  }

  #renderDebug(context, drawFullView) {
    const {
      CELL_SIZE,
      COLUMNS,
      ROWS,
      ZONE_ROWS,
      FIELD_WIDTH,
      FIELD_HEIGHT,
      HUD_HEIGHT,
      HOME_COLUMNS,
    } = CONFIG;

    if (drawFullView) {
      for (let row = 0; row < ROWS; row++) {
        context.fillStyle =
          row === ZONE_ROWS.HOME ? '#0b3d0b'
          : row <= ZONE_ROWS.RIVER_BOTTOM ? '#123a6b'
          : row === ZONE_ROWS.MEDIAN || row === ZONE_ROWS.START ? '#4a2d6b'
          : '#222';
        context.fillRect(0, row * CELL_SIZE, FIELD_WIDTH, CELL_SIZE);
      }
      context.fillStyle = '#1f7a1f';
      for (const column of HOME_COLUMNS) {
        context.fillRect(column * CELL_SIZE + 4, 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }

      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.beginPath();
      for (let column = 0; column <= COLUMNS; column++) {
        context.moveTo(column * CELL_SIZE + 0.5, 0);
        context.lineTo(column * CELL_SIZE + 0.5, FIELD_HEIGHT);
      }
      for (let row = 0; row <= ROWS; row++) {
        context.moveTo(0, row * CELL_SIZE + 0.5);
        context.lineTo(FIELD_WIDTH, row * CELL_SIZE + 0.5);
      }
      context.stroke();

      context.fillStyle = '#000';
      context.fillRect(0, FIELD_HEIGHT, FIELD_WIDTH, HUD_HEIGHT);

      const hintByState = {
        [STATES.MENU]: 'Enter: play',
        [STATES.PLAYING]: 'Arrows/WASD: move · P/Esc: pause',
        [STATES.PAUSED]: 'P/Enter: resume',
        [STATES.GAME_OVER]: 'Enter: back to menu',
        [STATES.WIN]: 'Enter: back to menu',
      };
      context.fillStyle = '#fff';
      context.font = 'bold 28px monospace';
      context.textAlign = 'center';
      context.fillText(this.state.toUpperCase(), FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
      context.font = '16px monospace';
      context.fillText(hintByState[this.state], FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 30);
    }

    context.fillStyle = '#0f0';
    context.font = '12px monospace';
    context.textAlign = 'left';
    context.fillText(
      `state=${this.state}  framesPerSecond=${this.loop.framesPerSecond}  ticks=${this.loop.ticks}  lastAction=${this.#lastAction ?? '-'}`,
      8,
      FIELD_HEIGHT + 28,
    );
  }
}
