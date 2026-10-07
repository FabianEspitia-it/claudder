import { CONFIG, yToRow } from '../core/config.js';
import { EVENTS } from '../core/events.js';

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
});

// Fraction of the frog's size ignored on each side when checking cars, so a
// near miss does not kill the player.
const FROG_HITBOX_INSET = 0.15;

const PLATFORM_TYPES = new Set(['log', 'turtle']);

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function containsPoint(box, x, y) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

function frogHitbox(frog) {
  const insetX = frog.w * FROG_HITBOX_INSET;
  const insetY = frog.h * FROG_HITBOX_INSET;
  return {
    x: frog.x + insetX,
    y: frog.y + insetY,
    w: frog.w - 2 * insetX,
    h: frog.h - 2 * insetY,
  };
}

const safe = (extra = {}) => ({ status: STATUS.SAFE, ...extra });
const dead = (reason) => ({ status: STATUS.DEAD, reason });

export function resolveFrog(frog, entities) {
  const { ZONE_ROWS, FIELD_WIDTH } = CONFIG;
  const centerX = frog.x + frog.w / 2;
  const centerY = frog.y + frog.h / 2;

  if (centerX < 0 || centerX > FIELD_WIDTH) return dead(DEATH_REASON.OUT_OF_BOUNDS);

  const row = yToRow(centerY);

  if (row === ZONE_ROWS.HOME) {
    const home = entities.find((e) => e.type === 'home' && containsPoint(e, centerX, centerY));
    if (!home) return dead(DEATH_REASON.WALL);
    if (home.occupied) return dead(DEATH_REASON.HOME_TAKEN);
    return { status: STATUS.HOME, home };
  }

  if (row >= ZONE_ROWS.RIVER_TOP && row <= ZONE_ROWS.RIVER_BOTTOM) {
    const platform = entities.find(
      (e) => PLATFORM_TYPES.has(e.type) && !e.submerged && containsPoint(e, centerX, centerY),
    );
    return platform ? safe({ platform }) : dead(DEATH_REASON.WATER);
  }

  if (row >= ZONE_ROWS.ROAD_TOP && row <= ZONE_ROWS.ROAD_BOTTOM) {
    const hitbox = frogHitbox(frog);
    const car = entities.find((e) => e.type === 'car' && overlaps(hitbox, e));
    return car ? dead(DEATH_REASON.CAR) : safe();
  }

  return safe();
}

export function createCollisionSystem({ getWorld }) {
  let game = null;
  let latched = false;

  const system = {
    lastResult: null,

    initialize(owner) {
      game = owner;
    },

    reset() {
      latched = false;
      system.lastResult = null;
    },

    update() {
      const { frog, entities } = getWorld();
      if (!frog || frog.alive === false) return;

      const result = resolveFrog(frog, entities);
      system.lastResult = result;

      if (result.status === STATUS.SAFE) {
        latched = false;
        return;
      }
      if (latched) return;
      latched = true;

      if (result.status === STATUS.DEAD) {
        game.events.emit(EVENTS.FROG_DIED, { reason: result.reason });
      } else {
        game.events.emit(EVENTS.FROG_HOME, { home: result.home });
      }
    },
  };

  return system;
}