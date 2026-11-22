// VAULT RUSH rules and state, with no drawing and no browser in it: the shared vault deck,
// the player's and the rival VEX's turns, pending piles, alarm lamps, OVERDRIVE, banking,
// busting and the win check. step() advances the timers (the rival's turn plays itself out,
// banners and taunts fade) and returns what happened as bit flags, so the caller can react
// with sound and announcements without the world knowing about screens.
import { ALARM_COUNT, LOOT_VALUES, RIVAL, SWITCH_SECONDS, TARGET } from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_ALARM = 2;
export const EVENT_BUST = 4;
export const EVENT_BANK = 8;
export const EVENT_OVERDRIVE = 16;
export const EVENT_WIN = 32;
export const EVENT_LOSE = 64;
export const EVENT_TURN = 128;
export const EVENT_DECK = 256;

/** A fresh shuffled deck of the fixed public composition, drawn with the seeded random. */
export function buildDeck(random) {
  const deck = [];
  for (const value of LOOT_VALUES) deck.push({ type: 'loot', value });
  for (let index = 0; index < ALARM_COUNT; index += 1) deck.push({ type: 'alarm', value: 0 });
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = deck[index];
    deck[index] = deck[swap];
    deck[swap] = held;
  }
  return deck;
}

function freshSide() {
  return { banked: 0, pending: 0, lamps: 0, drawn: [], overdrive: false };
}

const RIVAL_BIG_BANK = ['Banked and gone. Keep up, amateur.', 'That pile is mine now. Jealous?'];
const RIVAL_LEAD = ["I'm ahead now. Feel that pressure?", 'First to $600, and it will not be you.'];
const RIVAL_BUST = ['Gah! Stupid vault...', 'That alarm was rigged. RIGGED.'];
const PLAYER_BUST = ['HA! Greed gets everyone in the end.', 'Ouch. The vault thanks you for the donation.'];
const PLAYER_BIG_BANK = ['Tch. Not bad. Not bad at all.', 'Enjoy it. I am taking the next one.'];

export function createWorld(random) {
  const state = {
    deck: [],
    alarmsLeft: 0,
    player: freshSide(),
    rival: freshSide(),
    /** Whose hands are on the vault: 'player', 'rival', 'switch' (banner pause) or 'over'. */
    phase: 'player',
    result: null,
    banner: null,
    taunt: null,
    fx: { shake: 0, glitch: 0 },
    aiTimer: 0,
    switchTimer: 0,
    next: 'rival',
    turn: 1,
  };

  function pick(lines) {
    return lines[Math.floor(random() * lines.length)];
  }

  function setTaunt(text) {
    state.taunt = { text, timer: 3.0 };
  }

  function setBanner(text, color) {
    state.banner = { text, color, timer: SWITCH_SECONDS };
  }

  function countAlarms() {
    let count = 0;
    for (const card of state.deck) if (card.type === 'alarm') count += 1;
    state.alarmsLeft = count;
  }

  function reset() {
    state.deck = buildDeck(random);
    countAlarms();
    state.player = freshSide();
    state.rival = freshSide();
    state.phase = 'player';
    state.result = null;
    state.banner = null;
    state.taunt = null;
    state.fx.shake = 0;
    state.fx.glitch = 0;
    state.aiTimer = 0;
    state.switchTimer = 0;
    state.next = 'rival';
    state.turn = 1;
  }

  function endTurn() {
    state.next = state.phase === 'player' ? 'rival' : 'player';
    state.phase = 'switch';
    state.switchTimer = SWITCH_SECONDS;
  }

  function beginTurn(sideName) {
    const side = sideName === 'rival' ? state.rival : state.player;
    side.pending = 0;
    side.lamps = 0;
    side.drawn = [];
    side.overdrive = false;
    state.phase = sideName;
    if (sideName === 'player') state.turn += 1;
    else state.aiTimer = RIVAL.startDelay;
  }

  function bust(side) {
    const wasPlayer = side === state.player;
    side.pending = 0;
    side.lamps = 3;
    side.overdrive = false;
    state.fx.shake = 0.7;
    state.fx.glitch = 0.7;
    setBanner(wasPlayer ? 'BUST! THE VAULT TAKES IT ALL' : 'VEX BUSTED!', wasPlayer ? 'red' : 'green');
    if (wasPlayer) setTaunt(pick(PLAYER_BUST));
    else setTaunt(pick(RIVAL_BUST));
    endTurn();
    return EVENT_BUST;
  }

  function bank(side) {
    const wasPlayer = side === state.player;
    const amount = side.pending;
    const ledBefore = state.rival.banked > state.player.banked;
    side.banked += amount;
    side.pending = 0;
    side.lamps = 0;
    side.overdrive = false;
    let events = EVENT_BANK;
    if (side.banked >= TARGET) {
      state.phase = 'over';
      state.result = wasPlayer ? 'win' : 'lose';
      setBanner(wasPlayer ? 'VAULT CRACKED!' : 'VEX CRACKED THE VAULT!', wasPlayer ? 'gold' : 'magenta');
      events |= wasPlayer ? EVENT_WIN : EVENT_LOSE;
      return events;
    }
    setBanner(`${wasPlayer ? 'YOU BANKED' : 'VEX BANKED'} $${amount}`, wasPlayer ? 'cyan' : 'magenta');
    if (!wasPlayer && amount >= 120) setTaunt(pick(RIVAL_BIG_BANK));
    else if (!wasPlayer && !ledBefore && state.rival.banked > state.player.banked) setTaunt(pick(RIVAL_LEAD));
    else if (wasPlayer && amount >= 150) setTaunt(pick(PLAYER_BIG_BANK));
    endTurn();
    return events;
  }

  function overdrive(side) {
    if (side.lamps !== 2 || side.overdrive || side.pending <= 0) return 0;
    side.pending *= 2;
    side.overdrive = true;
    state.fx.glitch = Math.max(state.fx.glitch, 0.35);
    return EVENT_OVERDRIVE;
  }

  function drawFor(side) {
    let events = 0;
    if (state.deck.length === 0) {
      state.deck = buildDeck(random);
      countAlarms();
      events |= EVENT_DECK;
    }
    const card = state.deck.pop();
    side.drawn.push(card);
    if (card.type === 'alarm') {
      state.alarmsLeft -= 1;
      events |= EVENT_ALARM;
      state.fx.shake = Math.max(state.fx.shake, 0.4);
      state.fx.glitch = Math.max(state.fx.glitch, 0.35);
      if (side.overdrive || side.lamps >= 2) events |= bust(side);
      else side.lamps += 1;
    } else {
      side.pending += card.value;
      events |= EVENT_LOOT;
    }
    return events;
  }

  /** The rival's one decision for this beat of its turn. */
  function rivalAct() {
    const rival = state.rival;
    const player = state.player;
    if (rival.pending === 0) return drawFor(rival);
    if (rival.banked + rival.pending >= TARGET) return bank(rival);
    if (
      rival.lamps === 2 &&
      !rival.overdrive &&
      rival.pending >= 50 &&
      rival.banked + rival.pending * 2 > player.banked &&
      random() < 0.6
    ) {
      const events = overdrive(rival);
      if (events) return events;
    }
    const risk = state.deck.length === 0 ? 0 : state.alarmsLeft / state.deck.length;
    const threshold = RIVAL.baseThreshold - rival.lamps * RIVAL.lampDrop - risk * RIVAL.riskDrop;
    if (rival.pending >= threshold) return bank(rival);
    return drawFor(rival);
  }

  function step(dt) {
    let events = 0;
    if (state.fx.shake > 0) state.fx.shake = Math.max(0, state.fx.shake - dt * 1.8);
    if (state.fx.glitch > 0) state.fx.glitch = Math.max(0, state.fx.glitch - dt * 1.4);
    if (state.banner !== null) {
      state.banner.timer -= dt;
      if (state.banner.timer <= 0) state.banner = null;
    }
    if (state.taunt !== null) {
      state.taunt.timer -= dt;
      if (state.taunt.timer <= 0) state.taunt = null;
    }
    if (state.phase === 'switch') {
      state.switchTimer -= dt;
      if (state.switchTimer <= 0) {
        beginTurn(state.next);
        events |= EVENT_TURN;
      }
    } else if (state.phase === 'rival') {
      state.aiTimer -= dt;
      if (state.aiTimer <= 0) {
        events |= rivalAct();
        if (state.phase === 'rival') state.aiTimer = RIVAL.drawInterval;
      }
    }
    return events;
  }

  reset();
  return {
    state,
    reset,
    step,
    /** The player's moves; each is a no-op (returns 0) unless it is the player's turn. */
    playerDraw() {
      return state.phase === 'player' ? drawFor(state.player) : 0;
    },
    playerBank() {
      return state.phase === 'player' && state.player.pending > 0 ? bank(state.player) : 0;
    },
    playerOverdrive() {
      return state.phase === 'player' ? overdrive(state.player) : 0;
    },
  };
}
