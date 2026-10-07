import { CONFIG, rowToY } from '../core/config.js';
import { EVENTS } from '../core/events.js';

export const wrapPeriod = (width) => CONFIG.FIELD_WIDTH + width;

export function laneStats(lane) {
  const cell = CONFIG.CELL_SIZE;
  const width = lane.length * cell;
  const period = wrapPeriod(width);
  const ideal = period / ((lane.length + lane.gap) * cell);
  const rounded = lane.type === 'car' ? Math.floor(ideal) : Math.ceil(ideal);
  const mostThatFit = Math.floor(period / (width + cell));
  const count = Math.max(1, Math.min(rounded, mostThatFit));
  const spacing = period / count;
  return { width, period, count, spacing, gap: spacing - width };
}

export function layoutLane(lane, random = Math.random) {
  const { width, count, spacing } = laneStats(lane);
  const phase = random() * spacing;
  const y = rowToY(lane.row);

  return Array.from({ length: count }, (_, index) => {
    const spec = {
      type: lane.type,
      x: -width + phase + index * spacing,
      y,
      w: width,
      h: CONFIG.CELL_SIZE,
      speed: lane.speed,
    };
    if (lane.dives) spec.dives = true;
    return spec;
  });
}

export function homeSpecs() {
  return CONFIG.HOME_COLUMNS.map((column) => ({
    type: 'home',
    x: column * CONFIG.CELL_SIZE,
    y: rowToY(CONFIG.ZONE_ROWS.HOME),
    w: CONFIG.CELL_SIZE,
    h: CONFIG.CELL_SIZE,
    occupied: false,
  }));
}

export function buildEntitySpecs(level, random = Math.random) {
  return [...homeSpecs(), ...level.lanes.flatMap((lane) => layoutLane(lane, random))];
}

// Fallback movement for entities that have no update() of their own.
export function advance(entity, deltaTime) {
  entity.x += entity.speed * deltaTime;
  const period = wrapPeriod(entity.w);
  if (entity.speed > 0 && entity.x > CONFIG.FIELD_WIDTH) {
    entity.x -= period;
  } else if (entity.speed < 0 && entity.x + entity.w < 0) {
    entity.x += period;
  }
}


export function createSpawner({ createEntity = (spec) => ({ ...spec }), random = Math.random } = {}) {
  const spawner = {
    // Same array for the whole game: cleared in place, never replaced.
    entities: [],

    initialize(game) {
      game.events.on(EVENTS.LEVEL_START, ({ level }) => spawner.spawnLevel(level));
    },

    reset() {
      spawner.entities.length = 0;
    },

    spawnLevel(level) {
      spawner.entities.length = 0;
      for (const spec of buildEntitySpecs(level, random)) {
        spawner.entities.push(createEntity(spec));
      }
    },

    update(deltaTime) {
      for (const entity of spawner.entities) {
        if (typeof entity.update === 'function') entity.update(deltaTime);
        else if (entity.speed) advance(entity, deltaTime);
      }
    },
  };

  return spawner;
}