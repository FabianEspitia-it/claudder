import { EVENTS } from '../core/events.js';

let ctx = null;
let muted = false;

// El navegador bloquea el sonido hasta que el usuario interactúa.
// Creamos el AudioContext en la primera tecla o clic.
function ensureContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Una nota: frecuencia, duración, tipo de onda, volumen, retraso y glissando opcional
function tone({ freq, duration = 0.1, type = 'square', volume = 0.08, delay = 0, slideTo = null }) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;

  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);

  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
}

const SOUNDS = {
  jump() {
    tone({ freq: 300, slideTo: 600, duration: 0.09, type: 'square' });
  },
  hit() {
    // Atropello: golpe grave
    tone({ freq: 180, slideTo: 40, duration: 0.3, type: 'sawtooth', volume: 0.12 });
  },
  splash() {
    // Agua: caída suave
    tone({ freq: 500, slideTo: 120, duration: 0.35, type: 'sine', volume: 0.12 });
  },
  timeUp() {
    tone({ freq: 220, duration: 0.15, type: 'square' });
    tone({ freq: 165, duration: 0.25, type: 'square', delay: 0.17 });
  },
  home() {
    tone({ freq: 523, duration: 0.1, type: 'triangle', volume: 0.12 });
    tone({ freq: 659, duration: 0.1, type: 'triangle', volume: 0.12, delay: 0.1 });
    tone({ freq: 784, duration: 0.18, type: 'triangle', volume: 0.12, delay: 0.2 });
  },
  levelComplete() {
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, duration: 0.15, type: 'triangle', volume: 0.12, delay: i * 0.13 }),
    );
  },
  gameOver() {
    [392, 330, 262, 196].forEach((freq, i) =>
      tone({ freq, duration: 0.28, type: 'sawtooth', volume: 0.1, delay: i * 0.25 }),
    );
  },
  win() {
    [523, 659, 784, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, duration: 0.16, type: 'triangle', volume: 0.12, delay: i * 0.14 }),
    );
  },
};

// Motivos de muerte que manda collision.js en FROG_DIED { reason }
const WATER_REASONS = new Set(['water', 'outOfBounds']);

export const audio = {
  initialize(game) {
    const { events } = game;

    // Activar el audio con la primera interacción
    const unlock = () => ensureContext();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    // Tecla M = silenciar / activar
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') muted = !muted;
    });

    events.on(EVENTS.FROG_MOVED, () => SOUNDS.jump());

    events.on(EVENTS.FROG_DIED, ({ reason }) => {
      if (reason === 'time') SOUNDS.timeUp();
      else if (WATER_REASONS.has(reason)) SOUNDS.splash();
      else SOUNDS.hit();
    });

    events.on(EVENTS.FROG_HOME, () => SOUNDS.home());
    events.on(EVENTS.LEVEL_COMPLETE, () => SOUNDS.levelComplete());
    events.on(EVENTS.LIVES_DEPLETED, () => SOUNDS.gameOver());
    events.on(EVENTS.GAME_COMPLETE, () => SOUNDS.win());
  },
};
