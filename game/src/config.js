// VAULT RUSH tuning and palette in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** First side to bank this much wins the game. */
export const TARGET = 600;

/**
 * The shared vault deck: 18 loot cards and 6 alarms, composition fixed and public, so the
 * RISK meter's percentage is exact information, not a guess.
 */
export const LOOT_VALUES = [10, 10, 10, 10, 20, 20, 20, 20, 30, 30, 30, 50, 50, 50, 80, 80, 120, 120];
export const ALARM_COUNT = 6;
export const LAMPS = 3;

/** The rival robber's nerve: it banks once its pending reaches a threshold that drops as its
 * lamps light and as the deck's alarm risk climbs. */
export const RIVAL = {
  name: 'VEX',
  baseThreshold: 115,
  lampDrop: 32,
  riskDrop: 70,
  drawInterval: 0.62,
  startDelay: 0.85,
};

/** How long the BANKED / BUST banner holds before the turn passes. */
export const SWITCH_SECONDS = 1.15;

export const PALETTE = {
  backdrop: '#04060d',
  bg: '#070b18',
  bgGlow: '#0d1730',
  panel: '#0b1122',
  panelEdge: '#1d2c52',
  cyan: '#22e6ff',
  cyanDim: '#0e7d99',
  magenta: '#ff2e88',
  magentaDim: '#8f1450',
  gold: '#ffd23e',
  goldDeep: '#c78f12',
  green: '#2ee66b',
  amber: '#ffb52e',
  red: '#ff3b5c',
  orange: '#ff7a1a',
  text: '#eef6ff',
  muted: '#8fa3c8',
  cardFace: '#0d1531',
  cardBack: '#131f42',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Clickable layout, in logical coordinates: the deck stack and the three action buttons. */
export const LAYOUT = {
  deck: { x: 48, y: 452, w: 88, h: 122 },
  buttons: {
    draw: { x: 400, y: 624, w: 170, h: 56 },
    bank: { x: 586, y: 624, w: 170, h: 56 },
    overdrive: { x: 772, y: 624, w: 210, h: 56 },
  },
};
