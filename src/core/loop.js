import { CONFIG } from './config.js';

export class Loop {
  #update;
  #render;
  #fixedDeltaTime;
  #maxFrameTime;
  #running = false;
  #animationFrameId = 0;
  #lastTimestamp = 0;
  #accumulatedTime = 0;
  #framesThisSecond = 0;
  #timeThisSecond = 0;

  ticks = 0;
  framesPerSecond = 0;

  constructor({
    update,
    render,
    fixedDeltaTime = CONFIG.FIXED_DELTA_TIME,
    maxFrameTime = CONFIG.MAX_FRAME_TIME,
  }) {
    this.#update = update;
    this.#render = render;
    this.#fixedDeltaTime = fixedDeltaTime;
    this.#maxFrameTime = maxFrameTime;
  }

  get running() {
    return this.#running;
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#lastTimestamp = performance.now();
    this.#accumulatedTime = 0;
    this.#animationFrameId = requestAnimationFrame(this.#runFrame);
  }

  stop() {
    this.#running = false;
    cancelAnimationFrame(this.#animationFrameId);
  }

  #runFrame = (timestamp) => {
    if (!this.#running) return;

    const frameTime = Math.min((timestamp - this.#lastTimestamp) / 1000, this.#maxFrameTime);
    this.#lastTimestamp = timestamp;
    this.#accumulatedTime += frameTime;

    while (this.#accumulatedTime >= this.#fixedDeltaTime) {
      this.#update(this.#fixedDeltaTime);
      this.#accumulatedTime -= this.#fixedDeltaTime;
      this.ticks++;
    }

    this.#render(this.#accumulatedTime / this.#fixedDeltaTime);
    this.#measureFramesPerSecond(frameTime);

    this.#animationFrameId = requestAnimationFrame(this.#runFrame);
  };

  #measureFramesPerSecond(frameTime) {
    this.#framesThisSecond++;
    this.#timeThisSecond += frameTime;
    if (this.#timeThisSecond >= 1) {
      this.framesPerSecond = Math.round(this.#framesThisSecond / this.#timeThisSecond);
      this.#framesThisSecond = 0;
      this.#timeThisSecond = 0;
    }
  }
}
