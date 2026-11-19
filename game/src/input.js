// Keyboard and mouse state. Held keys are read every frame; one-shot presses
// (enter car, pause, mute) are queued and taken once, so a press between two
// frames is never lost and never counted twice.

export const ACT_ENTER = 1;
export const ACT_PAUSE = 2;
export const ACT_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE') actions |= ACT_ENTER;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACT_PAUSE;
    if (event.code === 'KeyM') actions |= ACT_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return {
    keys,
    mouse,
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    // -1 / 0 / 1 for the forward axis and the steering axis, from WASD or arrows.
    drive() {
      const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const steer = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { fwd, steer };
    },
    sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
  };
}
