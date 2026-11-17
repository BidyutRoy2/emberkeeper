// Keyboard and mouse for EMBERKEEPER. Movement is WASD or the arrow keys, Space
// dashes, Enter confirms, P pauses, M mutes, R restarts, and 1/2/3 pick a
// blessing. The mouse clicks buttons and blessing cards; its position is kept
// so cards can glow on hover.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

/** @returns input state for one game session, bound to the canvas. */
export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dashQueued = false;
  let mouse = { x: -1, y: -1, clicked: false, clickX: -1, clickY: -1 };
  let boonPick = 0;

  function keyName(event) {
    // Lower-case every key: 'Enter' becomes 'enter', 'ArrowUp' 'arrowup',
    // single letters stay themselves. The checks below all use lower case.
    return event.key.toLowerCase();
  }

  function onKeyDown(event) {
    const key = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === 'enter' || key === ' ') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'r') actions |= ACTION_RESTART;
    if (key === 'm') actions |= ACTION_MUTE;
    if (key === ' ') dashQueued = true;
    if (key === '1' || key === '2' || key === '3') boonPick = Number(key);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  function onClick(event) {
    onMouseMove(event);
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  /** A unit-ish move vector from the held keys: {x, y} in [-1, 1]. */
  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  /** True once when Space was pressed since the last call. */
  function takeDash() {
    const queued = dashQueued;
    dashQueued = false;
    return queued;
  }

  /** The action bits pressed since the last call. */
  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** 1, 2 or 3 when a blessing key was pressed since the last call, else 0. */
  function takeBoonPick() {
    const picked = boonPick;
    boonPick = 0;
    return picked;
  }

  /** The last click since the last call, or null. */
  function takeClick() {
    if (!mouse.clicked) return null;
    mouse.clicked = false;
    return { x: mouse.clickX, y: mouse.clickY };
  }

  return {
    moveVector, takeDash, takeActions, takeBoonPick, takeClick,
    mousePosition() { return { x: mouse.x, y: mouse.y }; },
  };
}
