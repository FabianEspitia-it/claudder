import { CONFIG } from '../core/config.js';
import { EVENTS } from '../core/events.js';
import { Car } from '../entities/car.js';
import { Home } from '../entities/home.js';
import { Platform, PLATFORM_KINDS } from '../entities/platform.js';
import { CAR_SETTINGS, PLATFORM_SETTINGS } from '../entities/settings.js';

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
  const diveCycle = PLATFORM_SETTINGS.dive.surfacedTime + PLATFORM_SETTINGS.dive.submergedTime;

  return Array.from({ length: count }, (_, index) => {
    const spec = {
      type: lane.type,
      row: lane.row,
      x: -width + phase + index * spacing,
      lengthInCells: lane.length,
      speed: lane.speed,
      wrapLength: wrapPeriod(width),
    };
    if (lane.type === 'car') spec.colorIndex = lane.row + index;
    if (lane.dives) {
      spec.dives = true;

      spec.diveOffset = (index / count) * diveCycle;
    }
    return spec;
  });
}

export function homeSpecs() {
  return CONFIG.HOME_COLUMNS.map((column) => ({ type: 'home', column }));
}

export function buildEntitySpecs(level, random = Math.random) {
  return [...homeSpecs(), ...level.lanes.flatMap((lane) => layoutLane(lane, random))];
}

export function createEntityFromSpec(spec) {
  const { palette } = CAR_SETTINGS;
  const laneOptions = {
    row: spec.row,
    x: spec.x,
    lengthInCells: spec.lengthInCells,
    speed: spec.speed,
    wrapLength: spec.wrapLength,
  };

  switch (spec.type) {
    case 'home':
      return new Home({ column: spec.column });
    case 'car':
      return new Car({ ...laneOptions, color: palette[(spec.colorIndex ?? 0) % palette.length] });
    case 'log':
      return new Platform({ ...laneOptions, kind: PLATFORM_KINDS.LOG });
    case 'turtle':
      return new Platform({
        ...laneOptions,
        kind: PLATFORM_KINDS.TURTLES,
        dive: spec.dives ? { offset: spec.diveOffset } : false,
      });
    default:
      throw new Error(`[spawner] unknown entity type "${spec.type}"`);
  }
}


export function createSpawner({ createEntity = createEntityFromSpec, random = Math.random } = {}) {
  const spawner = {
    entities: [],

    get homes() {
      return spawner.entities.filter((entity) => entity instanceof Home);
    },

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
      for (const entity of spawner.entities) entity.update?.(deltaTime);
    },
  };

  return spawner;
}