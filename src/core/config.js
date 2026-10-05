const DEBUG =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

const CELL_SIZE = 48;
const COLUMNS = 13;
const ROWS = 13;
const HUD_HEIGHT = 48;

export const CONFIG = Object.freeze({
  DEBUG,

  CELL_SIZE,
  COLUMNS,
  ROWS,
  FIELD_WIDTH: COLUMNS * CELL_SIZE,
  FIELD_HEIGHT: ROWS * CELL_SIZE,
  HUD_HEIGHT,
  CANVAS_WIDTH: COLUMNS * CELL_SIZE,
  CANVAS_HEIGHT: ROWS * CELL_SIZE + HUD_HEIGHT,

  ZONE_ROWS: Object.freeze({
    HOME: 0,
    RIVER_TOP: 1,
    RIVER_BOTTOM: 5,
    MEDIAN: 6,
    ROAD_TOP: 7,
    ROAD_BOTTOM: 11,
    START: 12,
  }),

  HOME_COLUMNS: Object.freeze([0, 3, 6, 9, 12]),
  FROG_START: Object.freeze({ column: 6, row: 12 }),

  LIVES: 3,
  SECONDS_PER_LIFE: 30,

  FIXED_DELTA_TIME: 1 / 60,
  MAX_FRAME_TIME: 0.25,
});

export const columnToX = (column) => column * CELL_SIZE;
export const rowToY = (row) => row * CELL_SIZE;
export const xToColumn = (x) => Math.floor(x / CELL_SIZE);
export const yToRow = (y) => Math.floor(y / CELL_SIZE);
