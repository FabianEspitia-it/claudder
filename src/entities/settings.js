// Tuning knobs for everything in src/entities/.
//
// Change a value here to retune every entity of that type. To change a single
// instance instead, pass the same option to its constructor, e.g.
//   new Frog({ hopDuration: 0.2 })
//   new Car({ row: 9, speed: 120, color: '#fff' })
//
// Grid sizes, lives and timers live in src/core/config.js (owned by Núcleo).

import { CONFIG } from '../core/config.js';

export const FROG_SETTINGS = Object.freeze({
  // Where the frog appears at the start of every life.
  startCell: CONFIG.FROG_START,

  // Seconds a hop takes to travel one cell. Lower = snappier.
  hopDuration: 0.12,

  // If the player presses a direction mid-hop, remember it and hop again on
  // landing. Turn off for strict arcade behaviour (input ignored mid-hop).
  bufferInputDuringHop: true,

  // Pixels trimmed from each side of the frog's collision box, so a car that
  // only grazes the frog's edge doesn't kill it.
  hitboxInset: 8,

  // Seconds the death animation plays before the frog can be reset.
  deathDuration: 0.8,

  // Drawing: resting size (fraction of a cell) and extra size at the top of a hop.
  bodyScale: 0.8,
  hopGrowth: 0.2,

  colors: Object.freeze({
    body: '#4cd04c',
    legs: '#2f8f2f',
    eyeWhite: '#ffffff',
    pupil: '#111111',
    deathHit: '#ff5a4a',
    deathDrowned: '#bfe3ff',
  }),
});

export const CAR_SETTINGS = Object.freeze({
  // Collision box trim in pixels (see FROG_SETTINGS.hitboxInset).
  hitboxInset: 3,

  // A car gets the first colour unless one is passed in; the spawner can
  // cycle through this list for variety.
  palette: Object.freeze(['#e0533f', '#f2c14e', '#4fa3e0', '#d97ad0', '#e8e8e8']),

  colors: Object.freeze({
    wheels: '#111111',
    windshield: 'rgba(20, 30, 50, 0.75)',
  }),
});

export const PLATFORM_SETTINGS = Object.freeze({
  // Default diving rhythm for turtles created with `dive: true`.
  // offset shifts where in the cycle a group starts, so groups don't all dive together.
  dive: Object.freeze({
    surfacedTime: 3,
    submergedTime: 1.5,
    offset: 0,
  }),

  // Seconds before going under during which turtles visibly start sinking,
  // so the player gets a warning.
  diveWarningTime: 0.75,

  colors: Object.freeze({
    logBark: '#7a4a22',
    logGrain: '#5a3416',
    logEnd: '#c08a52',
    turtleShell: '#b8402f',
    turtleShellRing: '#7d2418',
    turtleHead: '#3d8f4a',
  }),
});

export const HOME_SETTINGS = Object.freeze({
  // Collision box trim in pixels; bigger = the frog must land more precisely.
  hitboxInset: 4,

  // Size of the frog drawn in a filled home, as a fraction of a cell.
  occupiedFrogScale: 0.75,
});
