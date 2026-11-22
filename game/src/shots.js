// The screenshot scenes behind ?shot=start|heist|win|lose. Each one arranges the real game
// state directly — banked totals, drawn hands, lamps, the deck the RISK meter reads — so the
// frame is exactly what the renderer paints in play, and the same seed always gives the
// same frame.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function loot(value) {
  return { type: 'loot', value };
}

function alarm() {
  return { type: 'alarm', value: 0 };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any name other than heist, win or lose is the title screen.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();

  if (name === 'heist') {
    // The cover frame: two lamps lit, a fat pending pile, OVERDRIVE armed, the risk meter
    // in the red and VEX close behind — the whole game in one glance.
    state.player.banked = 390;
    state.player.pending = 210;
    state.player.lamps = 2;
    state.player.overdrive = true;
    state.player.drawn = [loot(50), loot(80), loot(30), loot(50)];
    state.rival.banked = 470;
    state.rival.pending = 40;
    state.rival.lamps = 1;
    state.rival.drawn = [loot(20), loot(20)];
    state.deck = [alarm(), loot(30), alarm(), loot(120), alarm(), loot(10), loot(80), alarm(), loot(50), loot(20), alarm()];
    state.alarmsLeft = 5;
    state.phase = 'player';
    state.taunt = { text: 'One more card, hotshot. I dare you.', timer: 99 };
    state.fx.glitch = 0.5;
    state.fx.shake = 0.22;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'win') {
    state.player.banked = 640;
    state.player.drawn = [loot(120), loot(80), loot(50)];
    state.rival.banked = 470;
    state.rival.pending = 40;
    state.rival.lamps = 1;
    state.rival.drawn = [loot(20), loot(20)];
    state.phase = 'over';
    state.result = 'win';
    return { screen: SCREEN_OVER, best: 640 };
  }

  if (name === 'lose') {
    state.player.banked = 430;
    state.player.lamps = 2;
    state.player.drawn = [loot(30), loot(20)];
    state.rival.banked = 615;
    state.rival.drawn = [loot(120), loot(50), loot(80)];
    state.phase = 'over';
    state.result = 'lose';
    return { screen: SCREEN_OVER, best: 430 };
  }

  return { screen: SCREEN_TITLE, best: 0 };
}
