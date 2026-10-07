// Base classes for everything that lives on the board.
//
//   Entity      – a rectangle with a position, a collision box, update() and draw().
//   LaneEntity  – an Entity that slides along one lane and wraps around the
//                 screen edges. Cars, logs and turtles all extend this.

import { CONFIG, columnToX, rowToY, xToColumn, yToRow } from '../core/config.js';

export class Entity {
  /**
   * @param {object} [options]
   * @param {number} [options.x=0]            left edge, in pixels
   * @param {number} [options.y=0]            top edge, in pixels
   * @param {number} [options.width]          defaults to one cell
   * @param {number} [options.height]         defaults to one cell
   * @param {number} [options.hitboxInset=0]  pixels trimmed from each side of the collision box
   */
  constructor({
    x = 0,
    y = 0,
    width = CONFIG.CELL_SIZE,
    height = CONFIG.CELL_SIZE,
    hitboxInset = 0,
  } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hitboxInset = hitboxInset;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  // Grid cell under the entity's centre. For a 3-cell log this is the middle cell.
  get column() {
    return xToColumn(this.centerX);
  }

  get row() {
    return yToRow(this.centerY);
  }

  // The rectangle used for collisions: the drawn rectangle shrunk by hitboxInset.
  getHitbox() {
    const inset = this.hitboxInset;
    return {
      left: this.x + inset,
      top: this.y + inset,
      right: this.x + this.width - inset,
      bottom: this.y + this.height - inset,
    };
  }

  // Axis-aligned bounding box (AABB) overlap test between two hitboxes.
  intersects(other) {
    const mine = this.getHitbox();
    const theirs = other.getHitbox();
    const overlapsHorizontally = mine.left < theirs.right && mine.right > theirs.left;
    const overlapsVertically = mine.top < theirs.bottom && mine.bottom > theirs.top;
    return overlapsHorizontally && overlapsVertically;
  }

  containsPoint(x, y) {
    const { left, top, right, bottom } = this.getHitbox();
    return x >= left && x < right && y >= top && y < bottom;
  }

  // Subclasses override these. deltaTime is in seconds.
  update(deltaTime) {}

  draw(context) {}
}

export class LaneEntity extends Entity {
  /**
   * @param {object} options
   * @param {number} options.row                which lane (grid row) it drives along
   * @param {number} [options.column=0]         starting column; ignored if x is given
   * @param {number} [options.x]                starting left edge in pixels, for sub-cell placement
   * @param {number} [options.lengthInCells=1]  2–3 for trucks and long logs
   * @param {number} [options.speed=0]          pixels per second; positive → right, negative → left
   * @param {number} [options.wrapLength]       distance travelled before it comes back around (see below)
   * @param {number} [options.hitboxInset=0]
   *
   * Wrap-around: the entity moves on a loop of `wrapLength` pixels. The
   * smallest allowed loop is the field width plus the entity's own width, so
   * it fully leaves one side before reappearing on the other.
   *
   * Give every entity in a lane the SAME wrapLength and the gaps between them
   * never change. A longer loop means more empty road between them, which is
   * how the spawner can control lane density.
   */
  constructor({
    row,
    column = 0,
    x = columnToX(column),
    lengthInCells = 1,
    speed = 0,
    wrapLength = 0,
    hitboxInset = 0,
  }) {
    const width = lengthInCells * CONFIG.CELL_SIZE;
    super({ x, y: rowToY(row), width, height: CONFIG.CELL_SIZE, hitboxInset });

    this.lengthInCells = lengthInCells;
    this.speed = speed;

    const shortestLoop = CONFIG.FIELD_WIDTH + width;
    this.wrapLength = Math.max(wrapLength, shortestLoop);

    this.#wrapAround();
  }

  // +1 moving right, -1 moving left, 0 stopped.
  get direction() {
    return Math.sign(this.speed);
  }

  update(deltaTime) {
    this.x += this.speed * deltaTime;
    this.#wrapAround();
  }

  // Keep x inside [FIELD_WIDTH - wrapLength, FIELD_WIDTH).
  // Below that range the entity is fully off the left edge; at FIELD_WIDTH it
  // is fully off the right edge. Either way it is invisible when it jumps.
  #wrapAround() {
    const loopStart = CONFIG.FIELD_WIDTH - this.wrapLength;
    const distanceIntoLoop = positiveModulo(this.x - loopStart, this.wrapLength);
    this.x = loopStart + distanceIntoLoop;
  }
}

// JavaScript's % keeps the sign of the left side (-1 % 5 === -1); this doesn't.
function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
