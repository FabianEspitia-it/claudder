import { CONFIG } from '../core/config.js';

const { CELL_SIZE, ZONE_ROWS, FIELD_WIDTH, FIELD_HEIGHT, HUD_HEIGHT, HOME_COLUMNS } = CONFIG;

const COLORS = {
  home: '#1b5e20',
  homeSlot: '#0b3d0b',
  river: '#1565c0',
  median: '#6a4c93',
  road: '#2b2b2b',
  roadLine: 'rgba(255,255,255,0.35)',
  hud: '#000',
};

function drawBackground(ctx) {
  // Casas (fila 0)
  ctx.fillStyle = COLORS.home;
  ctx.fillRect(0, 0, FIELD_WIDTH, CELL_SIZE);
  ctx.fillStyle = COLORS.homeSlot;
  for (const column of HOME_COLUMNS) {
    ctx.fillRect(column * CELL_SIZE + 4, 4, CELL_SIZE - 8, CELL_SIZE - 8);
  }

  // Río
  ctx.fillStyle = COLORS.river;
  ctx.fillRect(
    0,
    ZONE_ROWS.RIVER_TOP * CELL_SIZE,
    FIELD_WIDTH,
    (ZONE_ROWS.RIVER_BOTTOM - ZONE_ROWS.RIVER_TOP + 1) * CELL_SIZE,
  );

  // Mediana y zona de inicio
  ctx.fillStyle = COLORS.median;
  ctx.fillRect(0, ZONE_ROWS.MEDIAN * CELL_SIZE, FIELD_WIDTH, CELL_SIZE);
  ctx.fillRect(0, ZONE_ROWS.START * CELL_SIZE, FIELD_WIDTH, CELL_SIZE);

  // Carretera
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(
    0,
    ZONE_ROWS.ROAD_TOP * CELL_SIZE,
    FIELD_WIDTH,
    (ZONE_ROWS.ROAD_BOTTOM - ZONE_ROWS.ROAD_TOP + 1) * CELL_SIZE,
  );

  // Líneas discontinuas entre carriles
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

function drawHud(ctx, game) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, FIELD_HEIGHT, FIELD_WIDTH, HUD_HEIGHT);

  // Placeholder: luego se conecta al score real
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ESTADO: ${game.state}`, 12, FIELD_HEIGHT + HUD_HEIGHT / 2);
}

export const renderer = {
  render(ctx, game) {
    drawBackground(ctx);
    // TODO: plataformas, carros y rana cuando existan los módulos de los demás
    drawHud(ctx, game);
  },
};