import { CONFIG } from '../core/config.js';
import { EVENTS } from '../core/events.js';
import { Car } from '../entities/car.js';
import { DEATH_CAUSES } from '../entities/frog.js';
import { Home } from '../entities/home.js';
import { Platform } from '../entities/platform.js';

export const STATUS = Object.freeze({
  SAFE: 'safe',
  DEAD: 'dead',
  HOME: 'home',
});

export const DEATH_REASON = Object.freeze({
  CAR: 'car',
  WATER: 'water',
  OUT_OF_BOUNDS: 'outOfBounds',
  WALL: 'wall',
  HOME_TAKEN: 'homeTaken',
  TIME: 'time', // reported by score.js when the life timer runs out
});

const CAUSE_BY_REASON = Object.freeze({
  [DEATH_REASON.CAR]: DEATH_CAUSES.HIT,
  [DEATH_REASON.WATER]: DEATH_CAUSES.DROWNED,
  [DEATH_REASON.OUT_OF_BOUNDS]: DEATH_CAUSES.SWEPT_AWAY,
  [DEATH_REASON.WALL]: DEATH_CAUSES.BLOCKED_HOME,
  [DEATH_REASON.HOME_TAKEN]: DEATH_CAUSES.BLOCKED_HOME,
  [DEATH_REASON.TIME]: DEATH_CAUSES.TIME_UP,
});

export const causeFor = (reason) => CAUSE_BY_REASON[reason] ?? DEATH_CAUSES.HIT;

const safe = (extra = {}) => ({ status: STATUS.SAFE, ...extra });
const dead = (reason) => ({ status: STATUS.DEAD, reason });


export function resolveFrog(frog, entities, { checkTerrain = !frog.isHopping } = {}) {
  const { ZONE_ROWS } = CONFIG;
  const row = frog.row;

  if (row >= ZONE_ROWS.ROAD_TOP && row <= ZONE_ROWS.ROAD_BOTTOM) {
    const hitByCar = entities.some((entity) => entity instanceof Car && entity.intersects(frog));
    return hitByCar ? dead(DEATH_REASON.CAR) : safe();
  }

  if (!checkTerrain) return safe();


  if (frog.isOutOfBounds) return dead(DEATH_REASON.OUT_OF_BOUNDS);

  if (row === ZONE_ROWS.HOME) {
    const home = entities.find((entity) => entity instanceof Home && entity.canAccept(frog));
    if (home) return { status: STATUS.HOME, home };
    const takenHome = entities.some(
      (entity) => entity instanceof Home && entity.containsPoint(frog.centerX, frog.centerY),
    );
    return dead(takenHome ? DEATH_REASON.HOME_TAKEN : DEATH_REASON.WALL);
  }

  if (row >= ZONE_ROWS.RIVER_TOP && row <= ZONE_ROWS.RIVER_BOTTOM) {
    const platform = entities.find((entity) => entity instanceof Platform && entity.canCarry(frog));
    return platform ? safe({ platform }) : dead(DEATH_REASON.WATER);
  }

  return safe();
}


export function createCollisionSystem({ getWorld }) {
  let game = null;

  function check(frog, options) {
    const result = resolveFrog(frog, getWorld().entities, options);
    system.lastResult = result;

    if (result.status === STATUS.SAFE) {
      if (!frog.isHopping) frog.ride?.(result.platform ?? null);
    } else if (result.status === STATUS.DEAD) {
      game.events.emit(EVENTS.FROG_DIED, { reason: result.reason });
    } else {
      game.events.emit(EVENTS.FROG_HOME, { home: result.home });
      frog.reset();
    }
  }

  const system = {
    lastResult: null,

    initialize(owner) {
      game = owner;
      const { events } = game;

      events.on(EVENTS.FROG_DIED, ({ reason }) => getWorld().frog?.die(causeFor(reason)));

      events.on(EVENTS.FROG_MOVED, ({ frog }) => {
        if (frog?.alive) check(frog, { checkTerrain: true });
      });
    },

    reset() {
      system.lastResult = null;
      getWorld().frog?.reset();
    },

    update() {
      const { frog } = getWorld();
      if (!frog) return;

      if (frog.alive) check(frog);
      else if (frog.isDeathAnimationDone) frog.reset();
    },
  };

  return system;
}