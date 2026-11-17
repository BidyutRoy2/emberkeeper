// The rules of EMBERKEEPER, with no DOM and no drawing: a keeper crosses a dark
// garden with a lantern whose flame is both health and time. Fireflies feed the
// flame, shadow wisps eat it, and five stone lanterns must be lit — stand close
// and channel — before the flame dies. Light the fifth and dawn breaks: you win.
// Each lit lantern deepens the night and offers a blessing to choose.

import { BEACON, FIELD, FIREFLY, FUEL, PLAYER, WISP } from './config.js';
import { BEACON_SPOTS, NIGHTS, drawBoons } from './levels.js';
import { range } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_BEACON = 8;
export const EVENT_BOON = 16;
export const EVENT_PICKUP = 32;
export const EVENT_DASH = 64;

const TAU = Math.PI * 2;

/** Distance between two points. */
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** @returns a fresh world bound to a seeded generator. */
export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    combo: 0,
    comboTime: 0,
    fuel: FUEL.start,
    maxFuel: FUEL.max,
    night: 1,
    beaconsLit: 0,
    over: false,
    won: false,
    winBonus: 0,
    shake: 0,
    boonOptions: null,
    player: {
      x: FIELD.width / 2, y: FIELD.height / 2 + 80,
      faceX: 0, faceY: -1, dashX: 0, dashY: -1,
      vx: 0, vy: 0,
      dashTime: 0, dashCooldown: 0, invulnTime: 0, moving: false,
    },
    beacons: [],
    fireflies: [],
    wisps: [],
    particles: [],
    floaters: [],
    stats: { picked: 0, dashes: 0, hits: 0 },
  };
  // Blessings already taken, as deltas on the keeper.
  const bonus = { speed: 0, lightRadius: 0, magnetRadius: 70, dashCooldown: PLAYER.dashCooldown, dashFree: false };

  function nightConfig() {
    return NIGHTS[Math.min(state.night, NIGHTS.length) - 1];
  }

  function burst(x, y, count, color, speed, size, life) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const velocity = range(random, speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life: range(random, life * 0.6, life), maxLife: life,
        size: range(random, size * 0.6, size * 1.4), color,
      });
    }
    if (state.particles.length > 320) state.particles.splice(0, state.particles.length - 320);
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, life: 1.1, maxLife: 1.1, text, color });
    if (state.floaters.length > 24) state.floaters.shift();
  }

  function spawnFirefly(awayFromPlayer) {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = range(random, 50, FIELD.width - 50);
      const y = range(random, 70, FIELD.height - 50);
      if (!awayFromPlayer || distance(x, y, state.player.x, state.player.y) > 180) {
        state.fireflies.push({ x, y, phase: random() * TAU, drift: range(random, 6, 18), vx: 0, vy: 0 });
        return;
      }
    }
    state.fireflies.push({ x: 90, y: 90, phase: 0, drift: 10, vx: 0, vy: 0 });
  }

  /**
   * Put a wisp somewhere it matters: usually an ambush ahead of the keeper's
   * path, so a keeper who only ever runs still has to dodge — otherwise the
   * wisps, slower than the keeper, could never catch a moving target at all.
   * Falls back to a dark edge when there is no path to ambush.
   */
  function placeWisp(wisp) {
    const player = state.player;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 60 && random() < 0.65) {
      const nx = player.vx / speed;
      const ny = player.vy / speed;
      const x = Math.min(FIELD.width - 40, Math.max(40, player.x + nx * 380));
      const y = Math.min(FIELD.height - 40, Math.max(56, player.y + ny * 380));
      if (distance(x, y, player.x, player.y) > 150) {
        wisp.x = x;
        wisp.y = y;
        return;
      }
    }
    const side = Math.floor(random() * 4);
    if (side === 0) { wisp.x = range(random, 40, FIELD.width - 40); wisp.y = 36; }
    if (side === 1) { wisp.x = range(random, 40, FIELD.width - 40); wisp.y = FIELD.height - 36; }
    if (side === 2) { wisp.x = 36; wisp.y = range(random, 40, FIELD.height - 40); }
    if (side === 3) { wisp.x = FIELD.width - 36; wisp.y = range(random, 40, FIELD.height - 40); }
  }

  function spawnWisp() {
    const wisp = {
      x: 40, y: 40, vx: 0, vy: 0, phase: random() * TAU,
      radius: WISP.radius, speed: nightConfig().wispSpeed, respawnIn: 0,
    };
    placeWisp(wisp);
    state.wisps.push(wisp);
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTime = 0;
    state.fuel = FUEL.start;
    state.maxFuel = FUEL.max;
    state.night = 1;
    state.beaconsLit = 0;
    state.over = false;
    state.won = false;
    state.winBonus = 0;
    state.shake = 0;
    state.boonOptions = null;
    state.player = {
      x: FIELD.width / 2, y: FIELD.height / 2 + 80,
      faceX: 0, faceY: -1, dashX: 0, dashY: -1,
      vx: 0, vy: 0,
      dashTime: 0, dashCooldown: 0, invulnTime: 0, moving: false,
    };
    state.beacons = BEACON_SPOTS.map((spot) => ({ ...spot, lit: false, progress: 0 }));
    state.fireflies = [];
    state.wisps = [];
    state.particles = [];
    state.floaters = [];
    state.stats = { picked: 0, dashes: 0, hits: 0 };
    bonus.speed = 0;
    bonus.lightRadius = 0;
    bonus.magnetRadius = 70;
    bonus.dashCooldown = PLAYER.dashCooldown;
    bonus.dashFree = false;
    const config = nightConfig();
    for (let i = 0; i < config.fireflies; i += 1) spawnFirefly(false);
    for (let i = 0; i < config.wisps; i += 1) spawnWisp();
  }

  /** The radius of the keeper's light, blessings included. */
  function lightRadius() {
    return 135 + bonus.lightRadius;
  }

  /** Take one of the offered blessings and close the choice. */
  function applyBoon(boon) {
    const delta = {
      maxFuel: 0, fuel: 0, speed: 0, lightRadius: 0,
      magnetRadius: bonus.magnetRadius, dashCooldown: bonus.dashCooldown, dashFree: bonus.dashFree,
    };
    boon.apply(delta);
    state.maxFuel += delta.maxFuel;
    state.fuel = Math.min(state.maxFuel, state.fuel + delta.fuel);
    bonus.speed += delta.speed;
    bonus.lightRadius += delta.lightRadius;
    bonus.magnetRadius = delta.magnetRadius;
    bonus.dashCooldown = delta.dashCooldown;
    bonus.dashFree = delta.dashFree;
    state.boonOptions = null;
    burst(state.player.x, state.player.y, 22, '#ffd166', 130, 4, 0.9);
    floater(state.player.x, state.player.y - 34, boon.name, '#ffe9a8');
  }

  /**
   * Advance the world one fixed step. `move` is {x, y} in [-1, 1], `dash` a
   * fresh Space press, `attract` the title screen's idle drift. Returns an
   * event bitmask (see EVENT_* above).
   */
  function step(dt, move, dash, attract) {
    let events = 0;
    // The end screens keep their embers drifting while the world itself rests.
    if (state.over || state.won) {
      updateParticles(dt);
      return events;
    }
    state.time += dt;
    const player = state.player;
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.invulnTime = Math.max(0, player.invulnTime - dt);
    state.shake = Math.max(0, state.shake - dt * 26);
    if (state.comboTime > 0) {
      state.comboTime -= dt;
      if (state.comboTime <= 0) state.combo = 0;
    }

    if (attract) {
      driftFireflies(dt);
      driftWisps(dt, 0.4);
      updateParticles(dt);
      return events;
    }

    // --- Movement and dash ---
    const moving = move.x !== 0 || move.y !== 0;
    player.moving = moving;
    if (moving) {
      player.faceX = move.x;
      player.faceY = move.y;
    }
    if (dash && player.dashCooldown <= 0 && (bonus.dashFree || state.fuel > PLAYER.dashCost)) {
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = bonus.dashCooldown;
      player.dashX = player.faceX;
      player.dashY = player.faceY;
      if (!bonus.dashFree) state.fuel = Math.max(0, state.fuel - PLAYER.dashCost);
      player.invulnTime = Math.max(player.invulnTime, 0.35);
      state.stats.dashes += 1;
      events |= EVENT_DASH;
      burst(player.x, player.y, 10, '#ffb347', 90, 3.5, 0.5);
    }
    const speed = PLAYER.speed * (1 + bonus.speed);
    const prevX = player.x;
    const prevY = player.y;
    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.x += player.dashX * PLAYER.dashSpeed * dt;
      player.y += player.dashY * PLAYER.dashSpeed * dt;
      if (random() < 0.7) {
        state.particles.push({
          x: player.x, y: player.y + 8, vx: range(random, -14, 14), vy: range(random, -6, 20),
          life: 0.5, maxLife: 0.5, size: 4, color: '#ff9d3c',
        });
      }
    } else {
      player.x += move.x * speed * dt;
      player.y += move.y * speed * dt;
    }
    player.x = Math.min(FIELD.width - 26, Math.max(26, player.x));
    player.y = Math.min(FIELD.height - 26, Math.max(60, player.y));
    player.vx = (player.x - prevX) / dt;
    player.vy = (player.y - prevY) / dt;

    // --- The flame drains; an empty lantern ends the run ---
    state.fuel -= nightConfig().drain * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.over = true;
      burst(player.x, player.y, 40, '#8b7bb8', 120, 4, 1.2);
      return events | EVENT_OVER;
    }

    // --- Fireflies: drift, magnet, pickup ---
    driftFireflies(dt);
    for (let i = state.fireflies.length - 1; i >= 0; i -= 1) {
      const fly = state.fireflies[i];
      const dist = distance(fly.x, fly.y, player.x, player.y);
      if (dist < bonus.magnetRadius && dist > 1) {
        const pull = (1 - dist / bonus.magnetRadius) * 190 * dt;
        fly.x += ((player.x - fly.x) / dist) * pull;
        fly.y += ((player.y - fly.y) / dist) * pull;
      }
      if (dist < PLAYER.pickupRadius + 8) {
        state.fireflies.splice(i, 1);
        state.combo += 1;
        state.comboTime = FIREFLY.comboWindowSeconds;
        const multiplier = 1 + Math.min(state.combo, 20) * 0.1;
        const gained = Math.round(FIREFLY.score * multiplier);
        state.score += gained;
        state.fuel = Math.min(state.maxFuel, state.fuel + FIREFLY.gain);
        state.stats.picked += 1;
        events |= EVENT_PICKUP;
        burst(fly.x, fly.y, 12, '#ffd94d', 110, 3.5, 0.7);
        floater(fly.x, fly.y - 12, `+${gained}`, '#ffe98a');
        spawnFirefly(true);
      }
    }
    // As the night wears on the garden's fireflies thin out, so a keeper who
    // only ever gathers — and never lights a lantern — is slowly squeezed.
    const wantedFlies = Math.max(6, nightConfig().fireflies - Math.floor(state.time / 60));
    while (state.fireflies.length < wantedFlies) spawnFirefly(true);

    // --- Beacons: stand close to channel; a lit lantern deepens the night ---
    let nearest = null;
    let nearestDist = Infinity;
    for (const beacon of state.beacons) {
      if (beacon.lit) continue;
      const dist = distance(beacon.x, beacon.y, player.x, player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = beacon;
      }
    }
    for (const beacon of state.beacons) {
      if (beacon.lit) continue;
      if (beacon === nearest && nearestDist < PLAYER.beaconRadius) {
        beacon.progress += dt / BEACON.channelSeconds;
        // A lantern being lit wards the dark: wisps near it are pushed back,
        // so channelling is a stand-off, not a free hit.
        for (const wisp of state.wisps) {
          if (wisp.respawnIn > 0) continue;
          const dist = distance(wisp.x, wisp.y, beacon.x, beacon.y);
          if (dist < 220 && dist > 1) {
            const push = 190 * dt * (1 - dist / 220);
            wisp.x += ((wisp.x - beacon.x) / dist) * push;
            wisp.y += ((wisp.y - beacon.y) / dist) * push;
          }
        }
        if (random() < 0.5) {
          state.particles.push({
            x: beacon.x + range(random, -16, 16), y: beacon.y + range(random, -26, 6),
            vx: 0, vy: range(random, -46, -20), life: 0.6, maxLife: 0.6, size: 3, color: '#ffc95e',
          });
        }
        if (beacon.progress >= 1) {
          beacon.lit = true;
          beacon.progress = 1;
          state.beaconsLit += 1;
          state.score += BEACON.score;
          state.fuel = Math.min(state.maxFuel, state.fuel + FUEL.beaconGain);
          state.night = Math.min(NIGHTS.length, state.beaconsLit + 1);
          events |= EVENT_BEACON;
          burst(beacon.x, beacon.y - 14, 36, '#ffcf5c', 190, 5, 1.1);
          burst(beacon.x, beacon.y - 14, 18, '#fff3c4', 120, 3, 0.9);
          // The newborn light throws every nearby wisp back into the dark.
          for (const wisp of state.wisps) {
            if (wisp.respawnIn > 0) continue;
            const dist = distance(wisp.x, wisp.y, beacon.x, beacon.y);
            if (dist < 230 && dist > 1) {
              wisp.x += ((wisp.x - beacon.x) / dist) * 130;
              wisp.y += ((wisp.y - beacon.y) / dist) * 130;
            }
          }
          floater(beacon.x, beacon.y - 52, `+${BEACON.score}  ${beacon.name} lit!`, '#ffe9a8');
          if (state.beaconsLit >= BEACON.count) {
            state.won = true;
            state.winBonus = Math.max(0, Math.round((180 - state.time) * 2));
            state.score += state.winBonus;
            burst(player.x, player.y, 50, '#ffd94d', 220, 5, 1.4);
            return events | EVENT_WIN;
          }
          state.boonOptions = drawBoons(random);
          events |= EVENT_BOON;
        }
      } else {
        beacon.progress = Math.max(0, beacon.progress - dt * 0.25);
      }
    }

    // --- Wisps: hunt the keeper, keep their distance from each other ---
    driftWisps(dt, 1);
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const wisp = state.wisps[i];
      if (wisp.respawnIn > 0) {
        wisp.respawnIn -= dt;
        if (wisp.respawnIn <= 0) {
          placeWisp(wisp);
          wisp.speed = nightConfig().wispSpeed;
        }
        continue;
      }
      if (distance(wisp.x, wisp.y, player.x, player.y) < wisp.radius + PLAYER.radius - 2 && player.invulnTime <= 0) {
        state.fuel = Math.max(0, state.fuel - WISP.hitCost);
        state.combo = 0;
        state.comboTime = 0;
        state.stats.hits += 1;
        player.invulnTime = PLAYER.invulnTime;
        state.shake = 10;
        // A keeper mid-channel is braced against the lantern: the knock is
        // halved, so one hit does not throw away the whole channelling.
        const channelling = state.beacons.some((beacon) => !beacon.lit && beacon.progress > 0.05
          && distance(beacon.x, beacon.y, player.x, player.y) < PLAYER.beaconRadius);
        const knock = channelling ? 34 : 70;
        const away = Math.atan2(player.y - wisp.y, player.x - wisp.x);
        player.x = Math.min(FIELD.width - 26, Math.max(26, player.x + Math.cos(away) * knock));
        player.y = Math.min(FIELD.height - 26, Math.max(60, player.y + Math.sin(away) * knock));
        events |= EVENT_HIT;
        burst(wisp.x, wisp.y, 22, '#a78bfa', 150, 4, 0.8);
        floater(player.x, player.y - 30, `-${WISP.hitCost} flame`, '#c4b5fd');
        wisp.respawnIn = 2.5;
        wisp.x = -100;
        wisp.y = -100;
        if (state.fuel <= 0) {
          state.over = true;
          burst(player.x, player.y, 40, '#8b7bb8', 120, 4, 1.2);
          return events | EVENT_OVER;
        }
      }
    }
    const wantedWisps = nightConfig().wisps;
    const alive = state.wisps.filter((wisp) => wisp.respawnIn <= 0).length;
    const waiting = state.wisps.length - alive;
    if (alive + waiting < wantedWisps) spawnWisp();

    updateParticles(dt);
    return events;
  }

  function driftFireflies(dt) {
    for (const fly of state.fireflies) {
      fly.phase += dt * 1.4;
      fly.x += Math.cos(fly.phase * 0.7) * fly.drift * dt;
      fly.y += Math.sin(fly.phase) * fly.drift * 0.7 * dt;
      fly.x = Math.min(FIELD.width - 30, Math.max(30, fly.x));
      fly.y = Math.min(FIELD.height - 30, Math.max(64, fly.y));
    }
  }

  function driftWisps(dt, pace) {
    const player = state.player;
    for (const wisp of state.wisps) {
      if (wisp.respawnIn > 0) continue;
      wisp.phase += dt * 2;
      // Wisps cut the keeper off: they aim at where the keeper will be.
      const aimX = player.x + player.vx * 0.35;
      const aimY = player.y + player.vy * 0.35;
      const dx = aimX - wisp.x;
      const dy = aimY - wisp.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wobble = Math.sin(wisp.phase) * 0.5;
      const tx = dx / dist + -dy / dist * wobble * 0.4;
      const ty = dy / dist + dx / dist * wobble * 0.4;
      const length = Math.hypot(tx, ty) || 1;
      wisp.vx += (tx / length) * wisp.speed * dt * 3.0 * pace;
      wisp.vy += (ty / length) * wisp.speed * dt * 3.0 * pace;
      const speed = Math.hypot(wisp.vx, wisp.vy);
      const cap = wisp.speed * pace;
      if (speed > cap) {
        wisp.vx = (wisp.vx / speed) * cap;
        wisp.vy = (wisp.vy / speed) * cap;
      }
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      wisp.x = Math.min(FIELD.width - 20, Math.max(20, wisp.x));
      wisp.y = Math.min(FIELD.height - 20, Math.max(56, wisp.y));
    }
    // Wisps shove each other apart so they never stack into one blob.
    for (let i = 0; i < state.wisps.length; i += 1) {
      for (let j = i + 1; j < state.wisps.length; j += 1) {
        const a = state.wisps[i];
        const b = state.wisps[j];
        if (a.respawnIn > 0 || b.respawnIn > 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01 && dist < 44) {
          const push = ((44 - dist) / 44) * 30 * dt;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const floaterItem = state.floaters[i];
      floaterItem.life -= dt;
      floaterItem.y -= 34 * dt;
      if (floaterItem.life <= 0) state.floaters.splice(i, 1);
    }
  }

  reset();
  return { state, bonus, reset, step, applyBoon, lightRadius, nightConfig };
}
