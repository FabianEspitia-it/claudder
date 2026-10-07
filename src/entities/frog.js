// The player. The frog moves one grid cell per hop, with a short animation
// between cells. While on a log or turtle it drifts along with it.
//
// The frog does NOT decide when it dies or scores; Sistemas checks the board
// and calls frog.die(...) / frog.ride(...). The frog only reports where it
// landed, through the FROG_MOVED event.
//
// Typical lifecycle:
//   const frog = new Frog({ events: game.events });  // once
//   frog.reset();                                      // every new life
//   frog.update(deltaTime); frog.draw(context);       // every frame
//   frog.destroy();                                    // only if the frog is thrown away

import { CONFIG, columnToX, rowToY } from '../core/config.js';
import { EVENTS } from '../core/events.js';
import { ACTIONS } from '../core/input.js';
import { Entity } from './entity.js';
import { FROG_SETTINGS } from './settings.js';

// Pass one of these to frog.die(cause). The death animation changes colour
// for DROWNED; the rest are there so score/HUD code can tell deaths apart.
export const DEATH_CAUSES = Object.freeze({
  HIT: 'hit',                   // run over by a car
  DROWNED: 'drowned',           // landed in water, or the turtles dived
  SWEPT_AWAY: 'sweptAway',      // a platform carried the frog off-screen
  BLOCKED_HOME: 'blockedHome',  // reached the top row but not an empty home
  TIME_UP: 'timeUp',            // the life timer ran out
});

// How many cells each direction moves the frog. Keys match the input actions.
export const DIRECTION_OFFSETS = Object.freeze({
  [ACTIONS.UP]: Object.freeze({ columns: 0, rows: -1 }),
  [ACTIONS.DOWN]: Object.freeze({ columns: 0, rows: 1 }),
  [ACTIONS.LEFT]: Object.freeze({ columns: -1, rows: 0 }),
  [ACTIONS.RIGHT]: Object.freeze({ columns: 1, rows: 0 }),
});

// The frog is drawn facing up, then rotated to face where it last hopped.
const ROTATION_BY_DIRECTION = Object.freeze({
  [ACTIONS.UP]: 0,
  [ACTIONS.RIGHT]: Math.PI / 2,
  [ACTIONS.DOWN]: Math.PI,
  [ACTIONS.LEFT]: -Math.PI / 2,
});

const { CELL_SIZE, FIELD_WIDTH, ROWS, ZONE_ROWS } = CONFIG;

const isRiverRow = (row) => row >= ZONE_ROWS.RIVER_TOP && row <= ZONE_ROWS.RIVER_BOTTOM;
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

export class Frog extends Entity {
  #events;
  #stopListeningToInput = null;

  // The hop in progress, or null when standing still:
  // { direction, fromX, fromY, toX, toY, elapsed }
  #currentHop = null;

  // A direction pressed mid-hop, to be played when the current hop lands.
  #queuedDirection = null;

  /**
   * @param {object} [options]
   * @param {EventBus} [options.events]  if given, the frog hops on INPUT_MOVE and
   *                                     announces FROG_MOVED when it lands.
   *                                     Leave it out to control the frog by calling hop() yourself.
   * Every key in FROG_SETTINGS (hopDuration, hitboxInset, startCell, colors, ...)
   * can also be passed here to override it for this frog only.
   */
  constructor({ events = null, ...overrides } = {}) {
    const settings = { ...FROG_SETTINGS, ...overrides };
    super({ hitboxInset: settings.hitboxInset });
    this.settings = Object.freeze(settings);

    this.#events = events;
    if (events) {
      this.#stopListeningToInput = events.on(EVENTS.INPUT_MOVE, ({ direction }) => this.hop(direction));
    }

    this.reset();
  }

  // Puts the frog back at a cell (the start cell by default), alive and standing still.
  reset({ column, row } = this.settings.startCell) {
    this.x = columnToX(column);
    this.y = rowToY(row);
    this.facing = ACTIONS.UP;
    this.alive = true;
    this.riding = null;
    this.deathCause = null;
    this.timeSinceDeath = 0;
    this.#currentHop = null;
    this.#queuedDirection = null;
  }

  // Stops listening to input. Only needed if you discard this frog for a new one.
  destroy() {
    this.#stopListeningToInput?.();
    this.#stopListeningToInput = null;
  }

  get isHopping() {
    return this.#currentHop !== null;
  }

  // 0 at take-off, 1 on landing, 0 while standing still.
  get hopProgress() {
    if (!this.#currentHop) return 0;
    return Math.min(this.#currentHop.elapsed / this.settings.hopDuration, 1);
  }

  // True once a platform has carried the frog's centre past either screen edge.
  get isOutOfBounds() {
    return this.centerX < 0 || this.centerX >= FIELD_WIDTH;
  }

  // True when the frog is dead and its death animation has finished playing.
  get isDeathAnimationDone() {
    return !this.alive && this.timeSinceDeath >= this.settings.deathDuration;
  }

  /**
   * Starts a one-cell hop. Returns true if the frog will move.
   * Returns false if it's dead, the direction is unknown, or the hop would leave the board.
   * @param {string} direction  'up' | 'down' | 'left' | 'right' (ACTIONS.UP etc.)
   */
  hop(direction) {
    if (!this.alive || !DIRECTION_OFFSETS[direction]) return false;

    if (this.isHopping) {
      if (!this.settings.bufferInputDuringHop) return false;
      this.#queuedDirection = direction;
      return true;
    }

    this.facing = direction;
    const { x: toX, y: toY } = this.#landingSpotFor(direction);
    const wouldStayInPlace = toX === this.x && toY === this.y;
    if (wouldStayInPlace) return false;

    // Leaving a platform: Sistemas will set a new one (or kill the frog) on landing.
    this.riding = null;
    this.#currentHop = { direction, fromX: this.x, fromY: this.y, toX, toY, elapsed: 0 };
    return true;
  }

  // Called by Sistemas when the frog is standing on a platform (or null to stop).
  ride(platform) {
    this.riding = platform;
  }

  // Kills the frog and starts the death animation. Returns false if it was already dead.
  die(cause) {
    if (!this.alive) return false;
    this.alive = false;
    this.deathCause = cause;
    this.timeSinceDeath = 0;
    this.riding = null;
    this.#currentHop = null;
    this.#queuedDirection = null;
    return true;
  }

  update(deltaTime) {
    if (!this.alive) {
      this.timeSinceDeath += deltaTime;
    } else if (this.isHopping) {
      this.#continueHop(deltaTime);
    } else if (this.riding) {
      this.x += this.riding.speed * deltaTime;
    }
  }

  draw(context) {
    if (!this.alive) {
      this.#drawDeath(context);
      return;
    }
    // The frog grows a little mid-hop and shrinks back on landing, which reads as a jump.
    const { bodyScale, hopGrowth, colors } = this.settings;
    const jumpHeight = Math.sin(this.hopProgress * Math.PI);
    const size = this.width * (bodyScale + jumpHeight * hopGrowth);
    drawFrogShape(context, this.centerX, this.centerY, size, this.facing, colors);
  }

  // Where a hop in this direction would land, in pixels.
  #landingSpotFor(direction) {
    const offset = DIRECTION_OFFSETS[direction];
    const toRow = clamp(this.row + offset.rows, 0, ROWS - 1);
    let toX = this.x + offset.columns * CELL_SIZE;

    // On a log the frog can sit between grid columns. Once it lands on solid
    // ground again, snap it to the nearest column so it lines up with the lanes.
    if (!isRiverRow(toRow)) toX = columnToX(Math.round(toX / CELL_SIZE));

    toX = clamp(toX, 0, FIELD_WIDTH - this.width);
    return { x: toX, y: rowToY(toRow) };
  }

  #continueHop(deltaTime) {
    const hop = this.#currentHop;
    hop.elapsed += deltaTime;

    const progress = this.hopProgress;
    this.x = hop.fromX + (hop.toX - hop.fromX) * progress;
    this.y = hop.fromY + (hop.toY - hop.fromY) * progress;

    if (progress >= 1) this.#land(hop.direction);
  }

  #land(direction) {
    this.#currentHop = null;
    this.#events?.emit(EVENTS.FROG_MOVED, {
      frog: this,
      direction,
      column: this.column,
      row: this.row,
    });

    // A FROG_MOVED listener may have killed the frog, so check before hopping again.
    const queuedDirection = this.#queuedDirection;
    this.#queuedDirection = null;
    if (queuedDirection && this.alive) this.hop(queuedDirection);
  }

  // A cross that grows and fades out: light blue when drowned, red otherwise.
  #drawDeath(context) {
    const { deathDuration, colors } = this.settings;
    const progress = Math.min(this.timeSinceDeath / deathDuration, 1);
    const halfSize = (this.width * (0.5 + progress * 0.4)) / 2;
    const { centerX, centerY } = this;

    context.save();
    context.globalAlpha = 1 - progress;
    context.strokeStyle = this.deathCause === DEATH_CAUSES.DROWNED ? colors.deathDrowned : colors.deathHit;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(centerX - halfSize, centerY - halfSize);
    context.lineTo(centerX + halfSize, centerY + halfSize);
    context.moveTo(centerX + halfSize, centerY - halfSize);
    context.lineTo(centerX - halfSize, centerY + halfSize);
    context.stroke();
    context.restore();
  }
}

/**
 * Draws a top-down frog centred on (centerX, centerY). Exported so Home can draw
 * a resting frog and Presentación can reuse it (e.g. for the lives counter).
 * @param {number} size  overall width in pixels
 */
export function drawFrogShape(context, centerX, centerY, size, facing = ACTIONS.UP, colors = FROG_SETTINGS.colors) {
  const half = size / 2;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(ROTATION_BY_DIRECTION[facing] ?? 0);

  // Four legs: front pair near the top, back pair near the bottom.
  const legWidth = half * 0.3;
  const legHeight = half * 0.45;
  context.fillStyle = colors.legs;
  for (const side of [-1, 1]) {
    const legX = side * half * 0.95 - legWidth / 2;
    context.fillRect(legX, -half * 0.75, legWidth, legHeight);
    context.fillRect(legX, half * 0.3, legWidth, legHeight);
  }

  context.fillStyle = colors.body;
  context.beginPath();
  context.ellipse(0, 0, half * 0.72, half * 0.85, 0, 0, Math.PI * 2);
  context.fill();

  // Eyes near the front, pupils looking forward.
  for (const side of [-1, 1]) {
    const eyeX = side * half * 0.35;
    context.fillStyle = colors.eyeWhite;
    context.beginPath();
    context.arc(eyeX, -half * 0.55, half * 0.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = colors.pupil;
    context.beginPath();
    context.arc(eyeX, -half * 0.6, half * 0.1, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}
