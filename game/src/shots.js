// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so every frame is what a real game looks like and the same
// seed always gives the same frame. The play pilot chases fireflies and keeps
// clear of wisps; the end pilot is reckless and gets caught, as a hurried
// player is; the win pilot goes straight for the lanterns and channels them.

import { STEP } from './config.js';
import { EVENT_BOON, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const WIN_LIMIT_SECONDS = 300;

/** Distance between two points. */
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Steer the keeper: flee a wisp that is too close, stand still to channel a
 * lantern in reach, otherwise head for the target the mode names. `mode` is
 * 'balanced' (fireflies first, lanterns when close), 'beacon' (lanterns only)
 * or 'reckless' (fireflies only, wisps ignored).
 */
function autopilot(state, mode) {
  const player = state.player;
  if (mode !== 'reckless') {
    let nearestWisp = null;
    let nearestDist = Infinity;
    for (const wisp of state.wisps) {
      if (wisp.respawnIn > 0) continue;
      const dist = distance(wisp.x, wisp.y, player.x, player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestWisp = wisp;
      }
    }
    if (nearestWisp && nearestDist < 120 && player.invulnTime <= 0) {
      const away = Math.atan2(player.y - nearestWisp.y, player.x - nearestWisp.x);
      return { x: Math.cos(away), y: Math.sin(away), dash: false };
    }
  }
  let target = null;
  if (mode === 'beacon') {
    for (const beacon of state.beacons) {
      if (beacon.lit) continue;
      if (!target || distance(beacon.x, beacon.y, player.x, player.y) < distance(target.x, target.y, player.x, player.y)) {
        target = beacon;
      }
    }
  } else {
    let nearestFly = null;
    let nearestFlyDist = Infinity;
    for (const fly of state.fireflies) {
      const dist = distance(fly.x, fly.y, player.x, player.y);
      if (dist < nearestFlyDist) {
        nearestFlyDist = dist;
        nearestFly = fly;
      }
    }
    let nearestBeacon = null;
    let nearestBeaconDist = Infinity;
    for (const beacon of state.beacons) {
      if (beacon.lit) continue;
      const dist = distance(beacon.x, beacon.y, player.x, player.y);
      if (dist < nearestBeaconDist) {
        nearestBeaconDist = dist;
        nearestBeacon = beacon;
      }
    }
    if (mode === 'reckless') target = nearestFly;
    else if (player.invulnTime > 0.3) target = nearestFly;
    else if (mode === 'beacon') target = (state.fuel < 60 && nearestFly) ? nearestFly : nearestBeacon;
    else if (nearestBeacon && nearestBeaconDist < 420) target = nearestBeacon;
    else if (nearestFly && nearestFlyDist < 200) target = nearestFly;
    else target = nearestBeacon || nearestFly;
  }
  if (!target) return { x: 0, y: 0, dash: false };
  const dist = distance(target.x, target.y, player.x, player.y);
  if (dist < 26 && target.progress !== undefined) return { x: 0, y: 0, dash: false };
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  return { x: Math.cos(angle), y: Math.sin(angle), dash: dist > 320 && player.dashCooldown <= 0 };
}

/** Run the world forward under the autopilot for up to `seconds`. */
function simulate(world, seconds, mode) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const move = autopilot(world.state, mode);
    const events = world.step(STEP, { x: move.x, y: move.y }, move.dash, false);
    if (world.state.boonOptions) {
      world.applyBoon(world.state.boonOptions[0]);
    }
    if (events & EVENT_OVER) return 'over';
    if (events & EVENT_WIN) return 'win';
    void events;
  }
  return 'running';
}

/**
 * Set `world` to the named scene (start, play, end or win; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const outcome = simulate(world, PLAY_SECONDS, 'balanced');
    if (outcome === 'over' || outcome === 'win') {
      // A loss or a win is not a mid-game frame: replay shorter, mid-run.
      world.reset();
      simulate(world, 14, 'balanced');
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // A hurried player who lights a lantern or two, then stops to rest in the
    // dark: the wisps close in and the flame dies. A genuine loss, reached by
    // the real rules — standing still in this garden is fatal.
    simulate(world, 18, 'balanced');
    for (let index = 0; index < 120 / STEP && !world.state.over; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, false);
    }
    if (!world.state.over) {
      for (let index = 0; index < 3600 && !world.state.over; index += 1) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const wisp of world.state.wisps) {
          if (wisp.respawnIn > 0) continue;
          const dist = distance(wisp.x, wisp.y, world.state.player.x, world.state.player.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = wisp;
          }
        }
        const move = nearest
          ? { x: (nearest.x - world.state.player.x) / (nearestDist || 1), y: (nearest.y - world.state.player.y) / (nearestDist || 1) }
          : { x: 0, y: 0 };
        world.step(STEP, move, false, false);
      }
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // name === 'win'
  const outcome = simulate(world, WIN_LIMIT_SECONDS, 'beacon');
  if (outcome === 'win') return { screen: SCREEN_WIN, best: world.state.score };
  // The pilot ran out of time: keep going until dawn, in longer stretches.
  for (let round = 0; round < 4 && !world.state.won; round += 1) {
    if (simulate(world, WIN_LIMIT_SECONDS, 'beacon') === 'win') break;
  }
  return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
}
