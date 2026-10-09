import { CONFIG } from '../core/config.js';
import { STATES } from '../core/stateMachine.js';

const { FIELD_WIDTH, FIELD_HEIGHT } = CONFIG;

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
}

function text(ctx, str, y, size, color = '#fff') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, FIELD_WIDTH / 2, y);
}

// Parpadeo suave para los mensajes "pulsa Enter"
function blink() {
  return Math.floor(performance.now() / 500) % 2 === 0;
}

const SCREENS = {
  [STATES.MENU]: (ctx) => {
    overlay(ctx, 0.7);
    text(ctx, 'CLAUDDER', FIELD_HEIGHT / 2 - 60, 56, '#7CFC00');
    text(ctx, 'Cruza la carretera y el río', FIELD_HEIGHT / 2, 18);
    text(ctx, 'Flechas / WASD: mover   P: pausa', FIELD_HEIGHT / 2 + 36, 14, '#aaa');
    if (blink()) text(ctx, 'Pulsa ENTER para jugar', FIELD_HEIGHT / 2 + 90, 22, '#ffd54f');
  },

  [STATES.PAUSED]: (ctx) => {
    overlay(ctx, 0.6);
    text(ctx, 'PAUSA', FIELD_HEIGHT / 2 - 10, 48);
    text(ctx, 'P o ENTER para continuar', FIELD_HEIGHT / 2 + 40, 16, '#ccc');
  },

  [STATES.GAME_OVER]: (ctx, game) => {
    overlay(ctx, 0.75);
    text(ctx, 'GAME OVER', FIELD_HEIGHT / 2 - 50, 52, '#ef5350');
    const s = game.score?.state;
    if (s) {
      text(ctx, `Puntaje: ${s.score}`, FIELD_HEIGHT / 2 + 5, 22);
      text(ctx, `Récord: ${s.highScore}`, FIELD_HEIGHT / 2 + 35, 18, '#ffd54f');
    }
    if (blink()) text(ctx, 'ENTER para volver al menú', FIELD_HEIGHT / 2 + 90, 18, '#ccc');
  },

  [STATES.WIN]: (ctx, game) => {
    overlay(ctx, 0.75);
    text(ctx, '¡GANASTE!', FIELD_HEIGHT / 2 - 50, 52, '#66bb6a');
    const s = game.score?.state;
    if (s) {
      text(ctx, `Puntaje final: ${s.score}`, FIELD_HEIGHT / 2 + 5, 22);
      text(ctx, `Récord: ${s.highScore}`, FIELD_HEIGHT / 2 + 35, 18, '#ffd54f');
    }
    if (blink()) text(ctx, 'ENTER para volver al menú', FIELD_HEIGHT / 2 + 90, 18, '#ccc');
  },
};

export function drawScreen(ctx, game) {
  SCREENS[game.state]?.(ctx, game);
}
