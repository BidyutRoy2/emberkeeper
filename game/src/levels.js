// The nights of EMBERKEEPER: where the five stone lanterns stand, how each night
// gets harder, and the blessings a keeper may choose when a lantern is lit.
// Nothing here is read at run time from the network; it is the game's own map.

/** The five beacons, spread so the keeper must cross the whole garden. */
export const BEACON_SPOTS = [
  { x: 175, y: 165, name: 'North Lantern' },
  { x: 1090, y: 165, name: 'East Lantern' },
  { x: 640, y: 120, name: 'High Lantern' },
  { x: 215, y: 555, name: 'West Lantern' },
  { x: 1050, y: 555, name: 'South Lantern' },
];

/**
 * One row per night (night = beacons lit + 1). Wisps grow in number and speed,
 * fireflies thin out, and the flame drains faster, so every night feels darker.
 */
export const NIGHTS = [
  { wisps: 3, wispSpeed: 95, fireflies: 12, drain: 1.35 },
  { wisps: 4, wispSpeed: 108, fireflies: 11, drain: 1.65 },
  { wisps: 5, wispSpeed: 122, fireflies: 10, drain: 1.95 },
  { wisps: 6, wispSpeed: 136, fireflies: 10, drain: 2.25 },
  { wisps: 7, wispSpeed: 150, fireflies: 9, drain: 2.55 },
];

/** Blessings offered three at a time when a lantern is lit. */
export const BOONS = [
  {
    id: 'ember-heart',
    name: 'Ember Heart',
    icon: '♥',
    text: 'Max flame +30 and restore 30 flame at once.',
    apply: (bonus) => { bonus.maxFuel += 30; bonus.fuel += 30; },
  },
  {
    id: 'swift-boots',
    name: 'Swift Boots',
    icon: '»',
    text: 'Move 18% faster for the rest of the night.',
    apply: (bonus) => { bonus.speed += 0.18; },
  },
  {
    id: 'wide-glow',
    name: 'Wide Glow',
    icon: '◉',
    text: 'Your lantern light reaches 35 further.',
    apply: (bonus) => { bonus.lightRadius += 35; },
  },
  {
    id: 'moth-magnet',
    name: 'Moth Magnet',
    icon: '✦',
    text: 'Fireflies drift toward you from twice as far.',
    apply: (bonus) => { bonus.magnetRadius = 150; },
  },
  {
    id: 'dash-ward',
    name: 'Dash Ward',
    icon: '⚡',
    text: 'Dash recharges 40% faster and costs no flame.',
    apply: (bonus) => { bonus.dashCooldown *= 0.6; bonus.dashFree = true; },
  },
];

/** Three different blessings, drawn from the list. */
export function drawBoons(random) {
  const pool = [...BOONS];
  const drawn = [];
  while (drawn.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    drawn.push(pool.splice(index, 1)[0]);
  }
  return drawn;
}
