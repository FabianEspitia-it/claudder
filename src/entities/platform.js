// River platforms: logs and groups of turtles. The frog survives the river
// only while standing on one, and drifts along with it (see Frog.ride).
//
// Turtles can optionally dive: they sink for a while on a fixed rhythm, and
// a submerged platform can't carry the frog.

import { LaneEntity } from './entity.js';
import { PLATFORM_SETTINGS } from './settings.js';

export const PLATFORM_KINDS = Object.freeze({
  LOG: 'log',
  TURTLES: 'turtles',
});

export class Platform extends LaneEntity {
  // Seconds since this platform's dive cycle started (plus its offset).
  #diveClock;

  /**
   * Accepts every LaneEntity option (row, column, x, lengthInCells, speed, wrapLength), plus:
   * @param {string}         [options.kind]   PLATFORM_KINDS.LOG (default) or PLATFORM_KINDS.TURTLES
   * @param {boolean|object} [options.dive]   false = never dives (default).
   *                                          true  = dive with PLATFORM_SETTINGS.dive.
   *                                          { surfacedTime, submergedTime, offset } = custom rhythm;
   *                                          missing fields fall back to the defaults.
   * @param {number} [options.diveWarningTime]  seconds of visible sinking before going under
   *
   * @example 3 turtles that stay up 2s, under 1s
   *   new Platform({ kind: PLATFORM_KINDS.TURTLES, row: 4, lengthInCells: 3, speed: -60,
   *                  dive: { surfacedTime: 2, submergedTime: 1 } })
   */
  constructor({
    kind = PLATFORM_KINDS.LOG,
    dive = false,
    diveWarningTime = PLATFORM_SETTINGS.diveWarningTime,
    ...laneOptions
  }) {
    super(laneOptions);
    this.kind = kind;
    this.diveWarningTime = diveWarningTime;
    this.dive = buildDiveRhythm(dive);
    this.#diveClock = this.dive?.offset ?? 0;
  }

  get divesUnderwater() {
    return this.dive !== null;
  }

  get isSubmerged() {
    return this.divesUnderwater && this.#timeInCurrentCycle() >= this.dive.surfacedTime;
  }

  get isSolid() {
    return !this.isSubmerged;
  }

  // How far under the turtles are, for drawing: 0 = fully up, 1 = fully under.
  // Rises from 0 to 1 during the warning window just before they go under.
  get diveDepth() {
    if (!this.divesUnderwater) return 0;
    if (this.isSubmerged) return 1;

    const timeUntilDive = this.dive.surfacedTime - this.#timeInCurrentCycle();
    if (timeUntilDive > this.diveWarningTime) return 0;
    return 1 - timeUntilDive / this.diveWarningTime;
  }

  // True when this platform is above water and the entity's centre stands on it.
  // Sistemas uses this to decide whether the frog is safe on a river row.
  canCarry(entity) {
    return this.isSolid && this.containsPoint(entity.centerX, entity.centerY);
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.divesUnderwater) this.#diveClock += deltaTime;
  }

  draw(context) {
    if (this.kind === PLATFORM_KINDS.TURTLES) this.#drawTurtles(context);
    else this.#drawLog(context);
  }

  #timeInCurrentCycle() {
    const { surfacedTime, submergedTime } = this.dive;
    return this.#diveClock % (surfacedTime + submergedTime);
  }

  // A rounded brown bar with a few grain lines and a lighter cut end.
  #drawLog(context) {
    const { x, y, width, height } = this;
    const colors = PLATFORM_SETTINGS.colors;
    const verticalPadding = height * 0.15;
    const top = y + verticalPadding;
    const bottom = y + height - verticalPadding;
    const radius = (bottom - top) / 2;

    context.fillStyle = colors.logBark;
    context.beginPath();
    context.roundRect(x + 1, top, width - 2, bottom - top, radius);
    context.fill();

    // Short grain lines every 22px, staggered between the top and bottom halves.
    context.strokeStyle = colors.logGrain;
    context.lineWidth = 2;
    context.beginPath();
    for (let grainX = x + 18; grainX < x + width - 12; grainX += 22) {
      context.moveTo(grainX, top + 6);
      context.lineTo(grainX + 8, top + 6);
      context.moveTo(grainX + 6, bottom - 6);
      context.lineTo(grainX + 14, bottom - 6);
    }
    context.stroke();

    context.fillStyle = colors.logEnd;
    context.beginPath();
    context.ellipse(x + width - radius * 0.6, y + height / 2, radius * 0.5, radius * 0.85, 0, 0, Math.PI * 2);
    context.fill();
  }

  // One turtle per cell: a red shell with a ring, and a head pointing where they swim.
  // While diving they shrink and fade; fully under, nothing is drawn.
  #drawTurtles(context) {
    const depth = this.diveDepth;
    if (depth >= 1) return;

    const colors = PLATFORM_SETTINGS.colors;
    const cellWidth = this.width / this.lengthInCells;
    const centerY = this.y + this.height / 2;
    const shellRadius = this.height * 0.34 * (1 - depth * 0.35);
    const headSide = this.direction >= 0 ? 1 : -1;

    context.save();
    context.globalAlpha = 1 - depth * 0.6;
    for (let turtle = 0; turtle < this.lengthInCells; turtle++) {
      const centerX = this.x + cellWidth * (turtle + 0.5);

      context.fillStyle = colors.turtleHead;
      context.beginPath();
      context.arc(centerX + headSide * shellRadius * 1.05, centerY, shellRadius * 0.38, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = colors.turtleShell;
      context.beginPath();
      context.arc(centerX, centerY, shellRadius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = colors.turtleShellRing;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(centerX, centerY, shellRadius * 0.55, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
}

// Turns the `dive` constructor option into a frozen rhythm object, or null.
function buildDiveRhythm(dive) {
  if (!dive) return null;
  const custom = dive === true ? {} : dive;
  return Object.freeze({ ...PLATFORM_SETTINGS.dive, ...custom });
}
