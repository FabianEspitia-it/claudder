// The five goal slots on the top row. A frog that lands in an empty one is
// saved; landing anywhere else on that row is a death (decided by Sistemas).

import { CONFIG, columnToX, rowToY } from '../core/config.js';
import { Entity } from './entity.js';
import { drawFrogShape } from './frog.js';
import { HOME_SETTINGS } from './settings.js';

export class Home extends Entity {
  /**
   * @param {object} options
   * @param {number} options.column                one of CONFIG.HOME_COLUMNS
   * @param {number} [options.hitboxInset]         defaults to HOME_SETTINGS.hitboxInset
   * @param {number} [options.occupiedFrogScale]   size of the resting frog drawn inside
   */
  constructor({
    column,
    hitboxInset = HOME_SETTINGS.hitboxInset,
    occupiedFrogScale = HOME_SETTINGS.occupiedFrogScale,
  }) {
    super({ x: columnToX(column), y: rowToY(CONFIG.ZONE_ROWS.HOME), hitboxInset });
    this.occupiedFrogScale = occupiedFrogScale;
    this.occupied = false;
  }

  // One Home per column in CONFIG.HOME_COLUMNS, left to right.
  static createAll(options = {}) {
    return CONFIG.HOME_COLUMNS.map((column) => new Home({ ...options, column }));
  }

  // The frog can enter if the slot is still empty and the frog's centre is inside it.
  canAccept(frog) {
    return !this.occupied && this.containsPoint(frog.centerX, frog.centerY);
  }

  // Marks the slot as filled. Returns false if it already was.
  occupy() {
    if (this.occupied) return false;
    this.occupied = true;
    return true;
  }

  // Empties the slot, e.g. at the start of a new level.
  reset() {
    this.occupied = false;
  }

  // Empty slots draw nothing (the background shows them); filled ones show a resting frog.
  draw(context) {
    if (!this.occupied) return;
    drawFrogShape(context, this.centerX, this.centerY, this.width * this.occupiedFrogScale);
  }
}
