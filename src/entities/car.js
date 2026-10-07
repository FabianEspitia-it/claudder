// Cars and trucks: they drive along a road lane and kill the frog on contact.
// Whether a car hit the frog is decided by Sistemas (car.intersects(frog));
// this class only knows how to move and how to draw itself.

import { LaneEntity } from './entity.js';
import { CAR_SETTINGS } from './settings.js';

// Kept for convenience: `import { CAR_COLORS } from './car.js'`.
export const CAR_COLORS = CAR_SETTINGS.palette;

// Drawing proportions, as fractions of the car's size.
const VERTICAL_PADDING = 0.18; // empty space above and below the body
const WHEEL_WIDTH = 0.2;
const WINDSHIELD_WIDTH = 0.18;

export class Car extends LaneEntity {
  /**
   * Accepts every LaneEntity option (row, column, x, lengthInCells, speed, wrapLength), plus:
   * @param {string} [options.color]        body colour; defaults to the first palette colour
   * @param {number} [options.hitboxInset]  defaults to CAR_SETTINGS.hitboxInset
   *
   * @example a 2-cell truck in row 9 driving left at 80 px/s
   *   new Car({ row: 9, column: 4, lengthInCells: 2, speed: -80 })
   */
  constructor({
    color = CAR_SETTINGS.palette[0],
    hitboxInset = CAR_SETTINGS.hitboxInset,
    ...laneOptions
  }) {
    super({ hitboxInset, ...laneOptions });
    this.color = color;
  }

  // A flat rectangle with four wheels and a windshield on the side it's driving toward.
  draw(context) {
    const { x, y, width, height } = this;
    const { wheels, windshield } = CAR_SETTINGS.colors;

    const bodyTop = y + height * VERTICAL_PADDING;
    const bodyHeight = height * (1 - VERTICAL_PADDING * 2);

    // Wheels peek out above and below the body.
    const wheelWidth = Math.min(10, width * WHEEL_WIDTH);
    const wheelHeight = 5;
    const wheelInset = 6;
    context.fillStyle = wheels;
    for (const wheelX of [x + wheelInset, x + width - wheelInset - wheelWidth]) {
      context.fillRect(wheelX, bodyTop - wheelHeight + 2, wheelWidth, wheelHeight);
      context.fillRect(wheelX, bodyTop + bodyHeight - 2, wheelWidth, wheelHeight);
    }

    context.fillStyle = this.color;
    context.fillRect(x + 2, bodyTop, width - 4, bodyHeight);

    const windshieldWidth = Math.min(10, width * WINDSHIELD_WIDTH);
    const windshieldX = this.direction >= 0
      ? x + width - 8 - windshieldWidth // facing right → front is the right end
      : x + 8;                          // facing left  → front is the left end
    context.fillStyle = windshield;
    context.fillRect(windshieldX, bodyTop + 4, windshieldWidth, bodyHeight - 8);
  }
}
