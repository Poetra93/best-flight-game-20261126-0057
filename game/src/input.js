// Input for Merapi Ridge Run: keyboard and mouse.
//
// Keyboard alone plays the whole game: W/S or Up/Down for throttle,
// A/D or Left/Right to bank (climb and dive), Space for flaps and brake,
// P pause, R restart, M mute, 1/2/3 to pick a mission on the title
// screen, T back to the title. The mouse clicks menu buttons, and
// holding it with the pointer above or below the plane nudges the pitch
// as a steer assist. Keys are tracked as a held set so the physics
// reads them every frame.

export function newInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: null },
  };
}

export function attachInput(input, canvas, onKey) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.keys.add(event.code);
    onKey(event.code, true);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    input.mouse.down = true;
    const rect = canvas.getBoundingClientRect();
    input.mouse.clicked = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
}

// The control state the physics reads each frame, from keys plus the
// mouse steer assist (pointer held above the plane pulls up, below
// pushes down).
export function readControls(input, planeScreenY) {
  const k = input.keys;
  const throttleUp = k.has('KeyW') || k.has('ArrowUp');
  const throttleDown = k.has('KeyS') || k.has('ArrowDown');
  let climb = k.has('KeyA') || k.has('ArrowLeft');
  let dive = k.has('KeyD') || k.has('ArrowRight');
  if (input.mouse.down && planeScreenY !== null) {
    if (input.mouse.y < planeScreenY - 60) climb = true;
    if (input.mouse.y > planeScreenY + 60) dive = true;
  }
  return {
    throttleUp,
    throttleDown,
    climb,
    dive,
    flaps: k.has('Space'),
  };
}

export function takeClick(input) {
  const click = input.mouse.clicked;
  input.mouse.clicked = null;
  return click;
}
