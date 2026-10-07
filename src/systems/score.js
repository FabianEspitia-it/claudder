import { CONFIG } from '../core/config.js';
import { EVENTS } from '../core/events.js';

export const POINTS = Object.freeze({
  FORWARD_ROW: 10,
  HOME: 50,
  TIME_BONUS_PER_SECOND: 10,
  LEVEL_COMPLETE: 1000,
});

export function createScoreSystem() {
  let game = null;
  let bestRow = CONFIG.FROG_START.row;

  const state = {
    score: 0,
    highScore: 0,
    lives: CONFIG.LIVES,
    level: 1,
    timeLeft: CONFIG.SECONDS_PER_LIFE,
    homesFilled: 0,
  };

  function startLifeClock() {
    state.timeLeft = CONFIG.SECONDS_PER_LIFE;
    bestRow = CONFIG.FROG_START.row;
  }

  function addPoints(amount, reason) {
    if (amount <= 0) return;
    state.score += amount;
    state.highScore = Math.max(state.highScore, state.score);
    game.events.emit(EVENTS.SCORE_CHANGE, { score: state.score, delta: amount, reason });
  }

  // Points only for rows the frog has not reached yet during this life.
  function onFrogMoved({ row }) {
    if (!Number.isInteger(row) || row >= bestRow) return;
    addPoints((bestRow - row) * POINTS.FORWARD_ROW, 'forward');
    bestRow = row;
  }

  function onFrogHome({ home }) {
    if (home?.occupied) return;
    if (home) home.occupied = true;

    state.homesFilled++;
    addPoints(
      POINTS.HOME + Math.floor(state.timeLeft) * POINTS.TIME_BONUS_PER_SECOND,
      'home',
    );
    startLifeClock();

    if (state.homesFilled >= CONFIG.HOME_COLUMNS.length) {
      addPoints(POINTS.LEVEL_COMPLETE, 'level');
      game.events.emit(EVENTS.LEVEL_COMPLETE, { level: state.level });
    }
  }

  function onFrogDied({ reason }) {
    if (state.lives <= 0) return;
    state.lives--;
    startLifeClock();
    game.events.emit(EVENTS.LIFE_LOST, { lives: state.lives, reason });
    if (state.lives <= 0) game.events.emit(EVENTS.LIVES_DEPLETED);
  }

  function onLevelStart({ level }) {
    state.level = level?.number ?? state.level;
    state.homesFilled = 0;
    startLifeClock();
  }

  return {
    state,

    initialize(owner) {
      game = owner;
      const { events } = game;
      events.on(EVENTS.FROG_MOVED, onFrogMoved);
      events.on(EVENTS.FROG_HOME, onFrogHome);
      events.on(EVENTS.FROG_DIED, onFrogDied);
      events.on(EVENTS.LEVEL_START, onLevelStart);
    },

    reset() {
      state.score = 0;
      state.lives = CONFIG.LIVES;
      state.level = 1;
      state.homesFilled = 0;
      startLifeClock();
    },

    update(deltaTime) {
      if (state.lives <= 0) return;
      state.timeLeft -= deltaTime;
      if (state.timeLeft > 0) return;

      // The timeout goes through FROG_DIED so every listener (frog animation,
      // sound) reacts the same way as to any other death.
      game.events.emit(EVENTS.TIME_UP);
      game.events.emit(EVENTS.FROG_DIED, { reason: 'time' });
    },
  };
}