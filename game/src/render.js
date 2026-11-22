// Drawing only: the game state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour.
// Everything is drawn on canvas — no images, no fonts to load — in a dark cyber-neon style:
// a vault door centre stage that cracks open as the player's banked total climbs to $600,
// alarm lamps, a live ALARM RISK meter, and a pending pile big enough to read across the room.
import { FIELD, FONT, LAMPS, LAYOUT, PALETTE, TARGET } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const PLAYER_PANEL = { x: 24, y: 130, w: 392, h: 300 };
const RIVAL_PANEL = { x: 864, y: 130, w: 392, h: 300 };
const VAULT = { x: 640, y: 272, r: 130 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function font(size, weight) {
    const key = `${weight} ${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align = 'left', weight = 700, glow = 0) {
    context.font = font(size, weight);
    context.fillStyle = color;
    context.textAlign = align;
    if (glow > 0) {
      context.shadowColor = color;
      context.shadowBlur = glow;
    }
    context.fillText(value, x, y);
    context.shadowBlur = 0;
  }

  function rr(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function circle(x, y, r) {
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
  }

  // ---------- backdrop ----------

  function drawBackground(t) {
    context.fillStyle = PALETTE.bg;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const glow = context.createRadialGradient(VAULT.x, VAULT.y, 60, VAULT.x, VAULT.y, 560);
    glow.addColorStop(0, PALETTE.bgGlow);
    glow.addColorStop(1, 'rgba(7,11,24,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = 'rgba(70,110,200,0.13)';
    for (let gx = 32; gx < FIELD.width; gx += 64) {
      for (let gy = 32; gy < FIELD.height; gy += 64) {
        context.fillRect(gx, gy, 2, 2);
      }
    }
    // A slow scanline sweep, so even a still frame feels alive.
    const scanY = ((t * 46) % (FIELD.height + 160)) - 80;
    const scan = context.createLinearGradient(0, scanY - 60, 0, scanY + 60);
    scan.addColorStop(0, 'rgba(34,230,255,0)');
    scan.addColorStop(0.5, 'rgba(34,230,255,0.045)');
    scan.addColorStop(1, 'rgba(34,230,255,0)');
    context.fillStyle = scan;
    context.fillRect(0, scanY - 60, FIELD.width, 120);
  }

  // ---------- vault door ----------

  /** One half of the split door: a true semicircle (dir -1 = left, +1 = right) with spokes. */
  function drawDoorHalf(cx, cy, r, dir) {
    context.beginPath();
    if (dir < 0) context.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5);
    else context.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    context.closePath();
    context.fillStyle = '#101b3a';
    context.fill();
    context.save();
    context.clip();
    context.strokeStyle = 'rgba(34,230,255,0.35)';
    context.lineWidth = 5;
    for (let spoke = 0; spoke < 3; spoke += 1) {
      const angle = (spoke * Math.PI) / 3 + 0.5;
      context.beginPath();
      context.moveTo(cx - Math.cos(angle) * r * 0.82, cy - Math.sin(angle) * r * 0.82);
      context.lineTo(cx + Math.cos(angle) * r * 0.82, cy + Math.sin(angle) * r * 0.82);
      context.stroke();
    }
    circle(cx, cy, r * 0.3);
    context.strokeStyle = 'rgba(34,230,255,0.5)';
    context.lineWidth = 3;
    context.stroke();
    context.restore();
    context.beginPath();
    if (dir < 0) context.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5);
    else context.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    context.closePath();
    context.strokeStyle = PALETTE.cyanDim;
    context.lineWidth = 2;
    context.stroke();
  }

  /** The door splits down the middle; the halves slide apart as `openFrac` (banked / target) grows. */
  function drawVault(openFrac, t) {
    const { x, y, r } = VAULT;
    if (openFrac > 0.02) {
      const gold = context.createRadialGradient(x, y, 8, x, y, r);
      gold.addColorStop(0, '#fff3b0');
      gold.addColorStop(0.55, PALETTE.gold);
      gold.addColorStop(1, 'rgba(199,143,18,0.15)');
      circle(x, y, r - 10);
      context.fillStyle = gold;
      context.globalAlpha = 0.35 + openFrac * 0.65;
      context.fill();
      context.globalAlpha = 1;
      text('$$$', x, y - 24, 44, '#5c3d00', 'center', 800);
    }
    context.save();
    circle(x, y, r);
    context.clip();
    const slide = openFrac * r * 0.62;
    drawDoorHalf(x - slide, y, r, -1);
    drawDoorHalf(x + slide, y, r, 1);
    context.restore();
    circle(x, y, r);
    context.strokeStyle = PALETTE.cyan;
    context.lineWidth = 3;
    context.shadowColor = PALETTE.cyan;
    context.shadowBlur = 14;
    context.stroke();
    context.shadowBlur = 0;
    circle(x, y, r + 9);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 5;
    context.stroke();
    // Rivets around the rim.
    context.fillStyle = PALETTE.muted;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index * Math.PI) / 6 + t * 0.05;
      circle(x + Math.cos(angle) * (r + 9), y + Math.sin(angle) * (r + 9), 2.6);
      context.fill();
    }
  }

  // ---------- cards, lamps, panels ----------

  function drawCard(x, y, w, h, card) {
    rr(x, y, w, h, 7);
    if (card.type === 'alarm') {
      context.fillStyle = '#2a0a16';
      context.fill();
      context.strokeStyle = PALETTE.red;
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      context.moveTo(x + w / 2, y + 9);
      context.lineTo(x + w - 9, y + h * 0.52);
      context.lineTo(x + 9, y + h * 0.52);
      context.closePath();
      context.strokeStyle = PALETTE.red;
      context.lineWidth = 2;
      context.stroke();
      text('!', x + w / 2, y + h * 0.2, 15, PALETTE.red, 'center', 800);
      text('ALARM', x + w / 2, y + h - 17, 9, PALETTE.red, 'center', 800);
    } else {
      context.fillStyle = PALETTE.cardFace;
      context.fill();
      context.strokeStyle = PALETTE.cyan;
      context.lineWidth = 2;
      context.stroke();
      text(`$${card.value}`, x + w / 2, y + h * 0.3, w >= 56 ? 19 : 15, PALETTE.gold, 'center', 800, 6);
      text('LOOT', x + w / 2, y + h - 16, 8, PALETTE.muted, 'center', 700);
    }
  }

  function drawCardBack(x, y, w, h) {
    rr(x, y, w, h, 7);
    context.fillStyle = PALETTE.cardBack;
    context.fill();
    context.strokeStyle = PALETTE.cyanDim;
    context.lineWidth = 2;
    context.stroke();
    text('V', x + w / 2, y + h / 2 - 13, 24, PALETTE.cyan, 'center', 800, 8);
  }

  function drawCardRow(cards, x, y, maxWidth) {
    if (cards.length === 0) {
      text('— no cards yet —', x, y + 20, 14, PALETTE.muted, 'left', 600);
      return;
    }
    let w = 46;
    const gap = 5;
    if (cards.length * (w + gap) - gap > maxWidth) w = Math.max(30, (maxWidth - (cards.length - 1) * gap) / cards.length);
    for (let index = 0; index < cards.length; index += 1) {
      drawCard(x + index * (w + gap), y, w, 64, cards[index]);
    }
  }

  function drawLamps(x, y, r, lit) {
    for (let index = 0; index < LAMPS; index += 1) {
      const cx = x + index * (r * 2 + 14);
      circle(cx, y, r);
      if (index < lit) {
        context.fillStyle = PALETTE.red;
        context.shadowColor = PALETTE.red;
        context.shadowBlur = 18;
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = '#ff8fa5';
        context.lineWidth = 2;
        context.stroke();
      } else {
        context.fillStyle = '#131a2e';
        context.fill();
        context.strokeStyle = '#3a4a75';
        context.lineWidth = 2;
        context.stroke();
      }
    }
  }

  function drawProgress(x, y, w, frac, color) {
    rr(x, y, w, 13, 6);
    context.fillStyle = '#131c38';
    context.fill();
    if (frac > 0) {
      rr(x, y, Math.max(13, w * Math.min(1, frac)), 13, 6);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 8;
      context.fill();
      context.shadowBlur = 0;
    }
    rr(x, y, w, 13, 6);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.stroke();
  }

  function drawPanel(panel, side, title, accent, lampsRadius, pendingLabel) {
    rr(panel.x, panel.y, panel.w, panel.h, 14);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    const x = panel.x + 20;
    text(title, x, panel.y + 14, 21, accent, 'left', 800, 8);
    text(`TARGET $${TARGET}`, panel.x + panel.w - 20, panel.y + 18, 13, PALETTE.muted, 'right', 700);
    text('BANKED', x, panel.y + 46, 12, PALETTE.muted, 'left', 700);
    text(`$${side.banked}`, x, panel.y + 60, 38, PALETTE.text, 'left', 800, 6);
    drawProgress(x, panel.y + 106, panel.w - 40, side.banked / TARGET, accent);
    if (pendingLabel !== null) {
      text(pendingLabel, x, panel.y + 128, 19, accent, 'left', 800);
    }
    text('ALARMS', x, panel.y + 156, 12, PALETTE.muted, 'left', 700);
    drawLamps(x + lampsRadius, panel.y + 186, lampsRadius, side.lamps);
    text(`${side.lamps} / ${LAMPS}`, x + 190, panel.y + 172, 26, side.lamps > 0 ? PALETTE.red : PALETTE.muted, 'left', 800);
    text('HAND', x, panel.y + 216, 12, PALETTE.muted, 'left', 700);
    drawCardRow(side.drawn, x, panel.y + 234, panel.w - 40);
  }

  // ---------- centre, deck, controls ----------

  function riskColor(risk) {
    if (risk < 0.3) return PALETTE.green;
    if (risk < 0.42) return PALETTE.amber;
    return PALETTE.red;
  }

  function drawRisk(state) {
    const risk = state.deck.length === 0 ? 0 : state.alarmsLeft / state.deck.length;
    const pct = Math.round(risk * 100);
    const color = riskColor(risk);
    text('ALARM RISK', 480, 538, 14, PALETTE.muted, 'left', 700);
    text(`${pct}%`, 800, 530, 24, color, 'right', 800, 8);
    rr(480, 562, 320, 14, 7);
    context.fillStyle = '#131c38';
    context.fill();
    if (risk > 0) {
      rr(480, 562, Math.max(14, 320 * risk), 14, 7);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 9;
      context.fill();
      context.shadowBlur = 0;
    }
    text(`${state.alarmsLeft} alarms in ${state.deck.length} cards`, 640, 582, 12, PALETTE.muted, 'center', 600);
  }

  function drawDeck(state, active) {
    const d = LAYOUT.deck;
    for (let offset = 2; offset >= 0; offset -= 1) {
      drawCardBack(d.x + offset * 4, d.y - offset * 4, d.w, d.h);
    }
    if (active) {
      rr(d.x - 4, d.y - 12, d.w + 16, d.h + 16, 10);
      context.strokeStyle = PALETTE.cyan;
      context.lineWidth = 2;
      context.shadowColor = PALETTE.cyan;
      context.shadowBlur = 10;
      context.stroke();
      context.shadowBlur = 0;
    }
    text(`DECK · ${state.deck.length}`, d.x + d.w / 2 + 6, d.y + d.h + 10, 14, PALETTE.muted, 'center', 700);
  }

  function drawButton(rect, label, options) {
    rr(rect.x, rect.y, rect.w, rect.h, 10);
    if (options.fill) {
      context.fillStyle = options.fill;
      context.fill();
    } else {
      context.fillStyle = options.enabled ? '#0d1830' : '#0a0f1f';
      context.fill();
    }
    context.strokeStyle = options.color;
    context.lineWidth = options.enabled ? 2.5 : 1.5;
    if (options.enabled) {
      context.shadowColor = options.color;
      context.shadowBlur = options.pulse ? 16 + 8 * options.pulse : 10;
    }
    context.stroke();
    context.shadowBlur = 0;
    text(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 11, 19, options.enabled || options.fill ? options.color : PALETTE.muted, 'center', 800);
  }

  function drawButtons(state, t) {
    const player = state.player;
    const myTurn = state.phase === 'player';
    const buttons = LAYOUT.buttons;
    drawButton(buttons.draw, 'DRAW', { enabled: myTurn, color: PALETTE.cyan });
    drawButton(buttons.bank, player.pending > 0 ? `BANK $${player.pending}` : 'BANK', {
      enabled: myTurn && player.pending > 0,
      color: PALETTE.green,
    });
    if (player.overdrive) {
      drawButton(buttons.overdrive, 'OVERDRIVE ×2 ARMED', { enabled: true, color: '#ffd9b0', fill: '#7a2d05' });
    } else {
      const available = myTurn && player.lamps === 2 && player.pending > 0;
      drawButton(buttons.overdrive, 'OVERDRIVE ×2', {
        enabled: available,
        color: PALETTE.orange,
        pulse: available ? 0.5 + 0.5 * Math.sin(t * 6) : 0,
      });
    }
  }

  function drawPending(state, t) {
    const rivalsTurn = state.phase === 'rival';
    const side = rivalsTurn ? state.rival : state.player;
    const accent = rivalsTurn ? PALETTE.magenta : PALETTE.gold;
    text(rivalsTurn ? 'VEX PENDING' : 'YOUR PENDING', VAULT.x, 424, 15, PALETTE.muted, 'center', 700);
    const danger = !rivalsTurn && state.player.lamps === 2;
    const size = danger ? 56 * (1 + 0.045 * Math.sin(t * 5.2)) : 54;
    text(`$${side.pending}`, VAULT.x, 444, Math.round(size), accent, 'center', 800, 16);
    if (!rivalsTurn && state.player.overdrive) {
      text('×2 OVERDRIVE — ONE ALARM AND YOU BUST', VAULT.x, 508, 16, PALETTE.orange, 'center', 800, 10);
    } else if (!rivalsTurn && state.player.lamps === 2) {
      text('ONE MORE ALARM AND IT ALL BURNS', VAULT.x, 508, 16, PALETTE.red, 'center', 800, 8);
    }
  }

  function drawTaunt(state) {
    if (state.taunt === null) return;
    const bubble = { x: 830, y: 76, w: 426, h: 46 };
    rr(bubble.x, bubble.y, bubble.w, bubble.h, 12);
    context.fillStyle = '#160a20';
    context.fill();
    context.strokeStyle = PALETTE.magenta;
    context.lineWidth = 1.5;
    context.stroke();
    context.beginPath();
    context.moveTo(bubble.x + 30, bubble.y + bubble.h);
    context.lineTo(bubble.x + 44, bubble.y + bubble.h + 10);
    context.lineTo(bubble.x + 58, bubble.y + bubble.h);
    context.closePath();
    context.fillStyle = '#160a20';
    context.fill();
    text(`VEX: ${state.taunt.text}`, bubble.x + 14, bubble.y + 15, 14.5, '#ffb9d4', 'left', 600);
  }

  function drawBanner(state) {
    if (state.banner === null) return;
    const color = PALETTE[state.banner.color] ?? PALETTE.text;
    context.fillStyle = 'rgba(3,5,12,0.55)';
    context.fillRect(0, 318, FIELD.width, 84);
    text(state.banner.text, FIELD.width / 2, 336, 42, color, 'center', 800, 20);
  }

  // ---------- full-frame effects ----------

  function drawDanger(state, t) {
    if (state.player.lamps === 2 && state.phase !== 'over') {
      const alpha = 0.32 + 0.15 * Math.sin(t * 5.2);
      const pulse = context.createRadialGradient(640, 360, 240, 640, 360, 720);
      pulse.addColorStop(0, 'rgba(255,30,60,0)');
      pulse.addColorStop(1, `rgba(255,30,60,${alpha.toFixed(3)})`);
      context.fillStyle = pulse;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (state.player.overdrive && state.phase !== 'over') {
      const flicker = 0.16 + 0.07 * Math.sin(t * 9.3) + 0.04 * Math.sin(t * 23.7);
      const burn = context.createRadialGradient(640, 360, 300, 640, 360, 760);
      burn.addColorStop(0, 'rgba(255,110,20,0)');
      burn.addColorStop(1, `rgba(255,110,20,${flicker.toFixed(3)})`);
      context.fillStyle = burn;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawGlitch(state) {
    if (state.fx.glitch <= 0.04) return;
    const alpha = 0.16 * state.fx.glitch;
    for (let index = 0; index < 6; index += 1) {
      const y = Math.random() * FIELD.height;
      const h = 3 + Math.random() * 12;
      context.fillStyle = index % 2 === 0 ? `rgba(34,230,255,${alpha})` : `rgba(255,46,136,${alpha})`;
      context.fillRect(0, y, FIELD.width, h);
    }
  }

  // ---------- screens ----------

  function drawTable(state, t) {
    drawBackground(t);
    text('VAULT RUSH', 24, 14, 27, PALETTE.cyan, 'left', 800, 10);
    text('HOW GREEDY ARE YOU?', 24, 46, 13, PALETTE.magenta, 'left', 700);
    if (state.phase === 'player') text('YOUR MOVE — DRAW, BANK, OR RISK IT ALL', 640, 20, 19, PALETTE.cyan, 'center', 800, 8);
    else if (state.phase === 'rival') text('VEX IS CRACKING THE VAULT…', 640, 20, 19, PALETTE.magenta, 'center', 800, 8);
    else if (state.phase === 'switch') text(`ROUND ${state.turn}`, 640, 20, 19, PALETTE.muted, 'center', 800);
    drawTaunt(state);
    drawVault(Math.min(1, state.player.banked / TARGET), t);
    drawPanel(PLAYER_PANEL, state.player, 'YOU', PALETTE.cyan, 23, null);
    drawPanel(RIVAL_PANEL, state.rival, 'VEX — RIVAL ROBBER', PALETTE.magenta, 15, `PENDING $${state.rival.pending}`);
    drawPending(state, t);
    drawRisk(state);
    drawDeck(state, state.phase === 'player');
    drawButtons(state, t);
    text('SPACE draw · B bank · X overdrive · R restart', 1216, 690, 12, PALETTE.muted, 'right', 600);
    drawBanner(state);
  }

  function drawTitle(state, t) {
    drawBackground(t);
    context.save();
    context.translate(0, 64);
    drawVault(0, t);
    context.restore();
    text('VAULT RUSH', 640, 108, 82, PALETTE.cyan, 'center', 800, 26);
    text('HOW GREEDY ARE YOU?', 640, 202, 26, PALETTE.magenta, 'center', 800, 12);
    text('Draw loot from the vault deck. Bank it — or push your luck for more.', 640, 528, 19, PALETTE.text, 'center', 600);
    text('Three alarms and your pending pile burns. At two alarms, OVERDRIVE doubles it — but one alarm busts you.', 640, 556, 19, PALETTE.text, 'center', 600);
    text(`Race VEX, the rival robber. First to bank $${TARGET} cracks the vault.`, 640, 584, 19, PALETTE.text, 'center', 600);
    const pulse = 0.65 + 0.35 * Math.sin(t * 3.4);
    context.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO START', 640, 640, 24, PALETTE.gold, 'center', 800, 12);
    context.globalAlpha = 1;
  }

  function drawOver(state) {
    const win = state.result === 'win';
    context.fillStyle = 'rgba(2,4,10,0.74)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const panel = { x: 250, y: 168, w: 780, h: 384 };
    rr(panel.x, panel.y, panel.w, panel.h, 18);
    context.fillStyle = '#0a1020';
    context.fill();
    context.strokeStyle = win ? PALETTE.gold : PALETTE.magenta;
    context.lineWidth = 3;
    context.shadowColor = win ? PALETTE.gold : PALETTE.magenta;
    context.shadowBlur = 18;
    context.stroke();
    context.shadowBlur = 0;
    text(win ? 'VAULT CRACKED' : 'VEX CRACKED THE VAULT', 640, panel.y + 44, 52, win ? PALETTE.gold : PALETTE.magenta, 'center', 800, 18);
    text(win ? 'YOU WIN' : 'YOU LOSE', 640, panel.y + 112, 30, win ? PALETTE.cyan : PALETTE.red, 'center', 800, 10);
    text(`YOU $${state.player.banked}   —   VEX $${state.rival.banked}`, 640, panel.y + 176, 32, PALETTE.text, 'center', 800);
    text(`First to bank $${TARGET} takes the vault.`, 640, panel.y + 228, 19, PALETTE.muted, 'center', 600);
    text('PRESS R OR CLICK TO PLAY AGAIN', 640, panel.y + 292, 22, PALETTE.gold, 'center', 800, 8);
  }

  /** Paint one frame for the given screen over the game state. */
  function draw(state, screen) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.textBaseline = 'top';
    const t = performance.now() / 1000;
    if (state.fx.shake > 0.01 && screen === SCREEN_PLAY) {
      const mag = state.fx.shake * 13;
      context.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }
    if (screen === SCREEN_TITLE) {
      drawTitle(state, t);
      return;
    }
    drawTable(state, t);
    drawDanger(state, t);
    drawGlitch(state);
    if (screen === SCREEN_OVER) drawOver(state);
  }

  /** Which control a client point hits, in logical terms: 'draw', 'bank', 'overdrive' or null. */
  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const py = (clientY - rect.top) * (canvas.height / rect.height);
    const x = (px - view.x) / view.scale;
    const y = (py - view.y) / view.scale;
    const hits = [
      ['draw', LAYOUT.buttons.draw],
      ['bank', LAYOUT.buttons.bank],
      ['overdrive', LAYOUT.buttons.overdrive],
      ['draw', LAYOUT.deck],
    ];
    for (const [name, box] of hits) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return name;
    }
    return null;
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, hitTest };
}
