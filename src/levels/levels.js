import { CONFIG } from '../core/config.js';
import { EVENTS } from '../core/events.js';

const { ZONE_ROWS } = CONFIG;

const ROAD_LANES = Object.freeze([
  { type: 'car', direction: 1, speed: 60, length: 1, gap: 3 },
  { type: 'car', direction: -1, speed: 80, length: 1, gap: 3 },
  { type: 'car', direction: 1, speed: 55, length: 2, gap: 3 },
  { type: 'car', direction: -1, speed: 110, length: 1, gap: 3.5 },
  { type: 'car', direction: 1, speed: 70, length: 2, gap: 3.5 },
]);

const RIVER_LANES = Object.freeze([
  { type: 'log', direction: -1, speed: 50, length: 3, gap: 2 },
  { type: 'turtle', direction: 1, speed: 60, length: 2, gap: 2.5 },
  { type: 'log', direction: -1, speed: 80, length: 5, gap: 2.5 },
  { type: 'log', direction: 1, speed: 40, length: 3, gap: 2 },
  { type: 'turtle', direction: -1, speed: 70, length: 3, gap: 2.5 },
]);

const TUNING = Object.freeze([
  { speed: 1.0, roadGap: 1.0, riverGap: 1.0, dives: false },
  { speed: 1.15, roadGap: 0.92, riverGap: 1.05, dives: false },
  { speed: 1.3, roadGap: 0.85, riverGap: 1.1, dives: true },
  { speed: 1.5, roadGap: 0.78, riverGap: 1.15, dives: true },
  { speed: 1.75, roadGap: 0.72, riverGap: 1.2, dives: true },
]);

export const LEVEL_COUNT = TUNING.length;

const ROAD_LANE_COUNT = ZONE_ROWS.ROAD_BOTTOM - ZONE_ROWS.ROAD_TOP + 1;
const RIVER_LANE_COUNT = ZONE_ROWS.RIVER_BOTTOM - ZONE_ROWS.RIVER_TOP + 1;

if (ROAD_LANES.length !== ROAD_LANE_COUNT || RIVER_LANES.length !== RIVER_LANE_COUNT) {
  throw new Error('[levels] the lane templates do not match the rows defined in config.js');
}

function buildLane(template, row, tuning, gapScale, canDive) {
  return Object.freeze({
    row,
    type: template.type,
    direction: template.direction,
    speed: template.direction * template.speed * tuning.speed,
    length: template.length,
    gap: template.gap * gapScale,
    dives: canDive && template.type === 'turtle' && tuning.dives,
  });
}

export function getLevel(number) {
  if (!Number.isInteger(number) || number < 1 || number > LEVEL_COUNT) {
    throw new RangeError(`[levels] level ${number} does not exist (1-${LEVEL_COUNT})`);
  }
  const tuning = TUNING[number - 1];

  const roadLanes = ROAD_LANES.map((template, index) =>
    buildLane(template, ZONE_ROWS.ROAD_BOTTOM - index, tuning, tuning.roadGap, false),
  );
  const riverLanes = RIVER_LANES.map((template, index) =>
    buildLane(template, ZONE_ROWS.RIVER_BOTTOM - index, tuning, tuning.riverGap, true),
  );

  return Object.freeze({
    number,
    isLast: number === LEVEL_COUNT,
    lanes: Object.freeze([...roadLanes, ...riverLanes]),
  });
}

// Decides which level comes next. It starts level 1 on GAME_NEW, moves on when
// the score system reports LEVEL_COMPLETE, and ends the game after the last one.
export function createLevelManager() {
  let game = null;
  let current = 0;

  const manager = {
    get current() {
      return current;
    },

    initialize(owner) {
      game = owner;
      game.events.on(EVENTS.GAME_NEW, () => manager.start(1));
      game.events.on(EVENTS.LEVEL_COMPLETE, () => manager.advance());
    },

    reset() {
      current = 0;
    },

    start(number) {
      current = number;
      game.events.emit(EVENTS.LEVEL_START, { level: getLevel(number) });
    },

    advance() {
      if (current >= LEVEL_COUNT) {
        game.events.emit(EVENTS.GAME_COMPLETE);
      } else {
        manager.start(current + 1);
      }
    },
  };

  return manager;
}