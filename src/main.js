import { CONFIG } from './core/config.js';
import { Game } from './core/game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

game.start();
canvas.focus();

if (CONFIG.DEBUG) window.game = game;
