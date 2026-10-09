import { CONFIG } from './core/config.js';
import { Game } from './core/game.js';
import { Frog } from './entities/frog.js';
import { createSpawner } from './systems/spawner.js';
import { createCollisionSystem } from './systems/collision.js';
import { createScoreSystem } from './systems/score.js';
import { createLevelManager } from './levels/levels.js';
import { renderer } from './render/renderer.js';
import { audio } from './audio/audio.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

const frog = new Frog({ events: game.events });
const spawner = createSpawner();
const score = createScoreSystem();
const levels = createLevelManager();

// Lo que lee el renderer
game.world = { frog, entities: spawner.entities };
game.score = score;

const collision = createCollisionSystem({ getWorld: () => game.world });
const frogModule = { update: (dt) => frog.update(dt) };

game
  .use(levels)
  .use(spawner)
  .use(score)
  .use(frogModule)
  .use(collision)
  .use(renderer)
  .use(audio);
game.start();
canvas.focus();

if (CONFIG.DEBUG) window.game = game;