// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between three screens: title, the heist itself, and the end (win or lose).
//
// ?seed=N fixes the deck shuffle. ?shot=start|heist|win|lose (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_ALARM,
  EVENT_BANK,
  EVENT_BUST,
  EVENT_LOOT,
  EVENT_LOSE,
  EVENT_OVERDRIVE,
  EVENT_WIN,
} from './world.js';
import { ACTION_BANK, ACTION_CONFIRM, ACTION_DRAW, ACTION_OVERDRIVE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// Tiny generated bleeps (WebAudio, no assets). Created lazily on the first user gesture;
// every failure is swallowed — the game is fully playable silent.
let audio = null;
function beep(freq, seconds, type = 'square', volume = 0.035, slideTo = 0) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + seconds);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + seconds);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + seconds);
  } catch {
    // No audio in this browser: play on without it.
  }
}

function react(events) {
  if (events & EVENT_WIN) {
    beep(523, 0.12);
    setTimeout(() => beep(659, 0.12), 110);
    setTimeout(() => beep(784, 0.22), 220);
  } else if (events & EVENT_LOSE) beep(320, 0.4, 'sawtooth', 0.04, 90);
  else if (events & EVENT_BUST) beep(220, 0.35, 'sawtooth', 0.045, 55);
  else if (events & EVENT_ALARM) beep(156, 0.16, 'square', 0.05);
  else if (events & EVENT_BANK) {
    beep(740, 0.09);
    setTimeout(() => beep(988, 0.14), 80);
  } else if (events & EVENT_OVERDRIVE) beep(440, 0.18, 'sawtooth', 0.04, 880);
  else if (events & EVENT_LOOT) beep(560 + Math.min(400, world.state.player.pending * 2), 0.06);
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('The heist is on. Draw with Space, bank with B, overdrive with X. First to bank $600 wins.');
  }

  function handleEvents(events) {
    if (events === 0) return;
    react(events);
    const s = world.state;
    if (events & EVENT_WIN) announce(`Vault cracked. You win, $${s.player.banked} to $${s.rival.banked}.`);
    else if (events & EVENT_LOSE) announce(`VEX cracked the vault. You lose, $${s.player.banked} to $${s.rival.banked}.`);
    else if (events & EVENT_BUST) announce(s.phase === 'switch' && s.next === 'rival' ? 'Bust! Your pending pile is gone.' : 'Bust!');
    else if (events & EVENT_BANK) announce(`Banked. You have $${s.player.banked}, VEX has $${s.rival.banked}.`);
    if (s.phase === 'over' && screen === SCREEN_PLAY) screen = SCREEN_OVER;
  }

  function handleActions() {
    const actions = input.takeActions();
    const pointers = input.takePointers();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM || pointers.length > 0) startGame();
      return;
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    let events = 0;
    if (actions & ACTION_DRAW) events |= world.playerDraw();
    if (actions & ACTION_BANK) events |= world.playerBank();
    if (actions & ACTION_OVERDRIVE) events |= world.playerOverdrive();
    for (const point of pointers) {
      const hit = renderer.hitTest(point.x, point.y);
      if (hit === 'draw') events |= world.playerDraw();
      else if (hit === 'bank') events |= world.playerBank();
      else if (hit === 'overdrive') events |= world.playerOverdrive();
    }
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        handleEvents(world.step(STEP));
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen);
  }

  announce('VAULT RUSH. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
