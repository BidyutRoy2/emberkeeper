// EMBERKEEPER tuning: every number that decides how the game feels lives here,
// so the world, the renderer and the screenshots all read the same truth.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberkeeper-best-score-v1';

export const PLAYER = {
  radius: 16,
  speed: 265,
  dashSpeed: 640,
  dashTime: 0.16,
  dashCooldown: 1.4,
  dashCost: 8,
  invulnTime: 1.6,
  pickupRadius: 30,
  beaconRadius: 60,
};

export const FUEL = {
  max: 100,
  start: 100,
  drainPerSecond: 1.35,
  drainPerNight: 0.3,
  wispHitCost: 18,
  fireflyGain: 4,
  beaconGain: 8,
};

export const BEACON = {
  count: 5,
  channelSeconds: 2.8,
  score: 150,
  lightRadius: 150,
};

export const FIREFLY = {
  score: 10,
  comboWindowSeconds: 2.5,
  gain: 4,
};

export const WISP = {
  radius: 18,
  hitCost: 18,
};

export const SCORE = {
  beacon: 150,
  winTimeBonusPerSecondLeft: 2,
};

/** Canvas is the field itself: one CSS pixel is one game unit. */
export const VIEW = { width: 1280, height: 720 };
