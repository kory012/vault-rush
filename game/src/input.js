// Keyboard and pointer input. One-shot presses are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. Pointer presses
// are queued with their client coordinates; the loop asks the renderer which button (if any)
// a point falls on, since only the renderer knows the view transform.

export const ACTION_DRAW = 1;
export const ACTION_BANK = 2;
export const ACTION_OVERDRIVE = 4;
export const ACTION_CONFIRM = 8;
export const ACTION_RESTART = 16;

const DRAW = new Set(['Space']);
const BANK = new Set(['KeyB', 'Enter']);
const OVERDRIVE = new Set(['KeyX']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  let actions = 0;
  const pointers = [];

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (DRAW.has(event.code)) actions |= ACTION_DRAW | ACTION_CONFIRM;
    else if (BANK.has(event.code)) actions |= ACTION_BANK | ACTION_CONFIRM;
    else if (OVERDRIVE.has(event.code)) actions |= ACTION_OVERDRIVE;
    else if (RESTART.has(event.code)) actions |= ACTION_RESTART | ACTION_CONFIRM;
    else return;
    event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    pointers.push({ x: event.clientX, y: event.clientY });
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The pointer presses since the last call, as client {x, y} points. */
    takePointers() {
      const taken = pointers.slice();
      pointers.length = 0;
      return taken;
    },
  };
}
