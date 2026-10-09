import { CONFIG } from '../core/config.js';
import { Car } from '../entities/car.js';
import { Home } from '../entities/home.js';
import { Platform } from '../entities/platform.js';
import { drawFrogShape } from '../entities/frog.js';
import { drawScreen } from './screens.js';

const { CELL_SIZE, ZONE_ROWS, FIELD_WIDTH, FIELD_HEIGHT, HUD_HEIGHT, HOME_COLUMNS } = CONFIG;

const COLORS = {
  homeSlot: '#0b3d0b',  
  home: '#1b5e20',
  river: '#1565c0',
  median: '#6a4c93',
  road: '#2b2b2b',
  roadLine: 'rgba(255,255,255,0.35)',
  hud: '#000',
  timeOk: '#4caf50',
  timeLow: '#e53935',
};

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.home;
  ctx.fillRect(0, 0, FIELD_WIDTH, CELL_SIZE);

  // Huecos de las casas (libres): cuadros oscuros
  ctx.fillStyle = COLORS.homeSlot;
  for (const column of HOME_COLUMNS) {
    ctx.fillRect(column * CELL_SIZE + 4, 4, CELL_SIZE - 8, CELL_SIZE - 8);
  }

  ctx.fillStyle = COLORS.river;
  ctx.fillRect(0, ZONE_ROWS.RIVER_TOP * CELL_SIZE, FIELD_WIDTH,
    (ZONE_ROWS.RIVER_BOTTOM - ZONE_ROWS.RIVER_TOP + 1) * CELL_SIZE);

  ctx.fillStyle = COLORS.median;
  ctx.fillRect(0, ZONE_ROWS.MEDIAN * CELL_SIZE, FIELD_WIDTH, CELL_SIZE);
  ctx.fillRect(0, ZONE_ROWS.START * CELL_SIZE, FIELD_WIDTH, CELL_SIZE);

  ctx.fillStyle = COLORS.road;
  ctx.fillRect(0, ZONE_ROWS.ROAD_TOP * CELL_SIZE, FIELD_WIDTH,
    (ZONE_ROWS.ROAD_BOTTOM - ZONE_ROWS.ROAD_TOP + 1) * CELL_SIZE);

  ctx.strokeStyle = COLORS.roadLine;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  for (let row = ZONE_ROWS.ROAD_TOP + 1; row <= ZONE_ROWS.ROAD_BOTTOM; row++) {
    ctx.moveTo(0, row * CELL_SIZE);
    ctx.lineTo(FIELD_WIDTH, row * CELL_SIZE);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWorld(ctx, world) {
  const { entities, frog } = world;
  // Orden: lo de abajo se dibuja primero
  for (const e of entities) if (e instanceof Platform) e.draw(ctx);
  for (const e of entities) if (e instanceof Home) e.draw(ctx);
  for (const e of entities) if (e instanceof Car) e.draw(ctx);
  frog?.draw(ctx);
}

function drawHud(ctx, game) {
  const y = FIELD_HEIGHT;
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, y, FIELD_WIDTH, HUD_HEIGHT);

  const s = game.score?.state;
  if (!s) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ESTADO: ${game.state}`, 12, y + HUD_HEIGHT / 2);
    return;
  }

  // Barra de tiempo (franja fina arriba del HUD)
  const ratio = Math.max(0, Math.min(1, s.timeLeft / CONFIG.SECONDS_PER_LIFE));
  ctx.fillStyle = ratio > 0.25 ? COLORS.timeOk : COLORS.timeLow;
  ctx.fillRect(0, y, FIELD_WIDTH * ratio, 6);

  // Vidas: mini-ranas
  for (let i = 0; i < s.lives; i++) {
    drawFrogShape(ctx, 20 + i * 30, y + 28, 22);
  }

  // Puntaje y nivel
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${s.score}`, FIELD_WIDTH / 2, y + 28);
  ctx.textAlign = 'right';
  ctx.fillText(`NIVEL ${s.level}`, FIELD_WIDTH - 12, y + 28);
}

export const renderer = {
  render(ctx, game) {
    drawBackground(ctx);
    if (game.world && game.state !== 'menu') drawWorld(ctx, game.world);
    drawHud(ctx, game);
    drawScreen(ctx, game);   // encima de todo
  },
};
