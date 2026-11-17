// Boot and the one loop of EMBERKEEPER: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between six screens: title, play, blessing, paused, game over and
// dawn (win). ?seed=N fixes the night's pattern. ?shot=start|play|end|win
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BEACON, EVENT_BOON, EVENT_DASH, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { boonCardRects, createRenderer, SCREEN_BOON, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
canvas.width = 1280;
canvas.height = 720;
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts one visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null, world.lightRadius());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Light all five lanterns before your flame dies.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Dawn breaks. You win with ${world.state.score} points. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  /** A click inside a blessing card picks it; null when the click missed. */
  function clickedBoon(click) {
    if (!click || !world.state.boonOptions) return null;
    const rects = boonCardRects(world.state.boonOptions.length);
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      if (click.x >= rect.x && click.x <= rect.x + rect.width && click.y >= rect.y && click.y <= rect.y + rect.height) {
        return world.state.boonOptions[i];
      }
    }
    return null;
  }

  function handleActions() {
    const actions = input.takeActions();
    const boonPick = input.takeBoonPick();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_BOON) {
      let chosen = null;
      if (boonPick >= 1 && boonPick <= 3 && world.state.boonOptions) {
        chosen = world.state.boonOptions[boonPick - 1] || null;
      }
      if (!chosen) chosen = clickedBoon(click);
      if (!chosen && (actions & ACTION_CONFIRM) && world.state.boonOptions) {
        // Enter or Space with no card chosen takes the card under the mouse,
        // or the first card: the game never stalls on this screen.
        const mouse = input.mousePosition();
        const rects = boonCardRects(world.state.boonOptions.length);
        for (let i = 0; i < rects.length; i += 1) {
          const rect = rects[i];
          if (mouse.x >= rect.x && mouse.x <= rect.x + rect.width && mouse.y >= rect.y && mouse.y <= rect.y + rect.height) {
            chosen = world.state.boonOptions[i];
            break;
          }
        }
        if (!chosen) chosen = world.state.boonOptions[0];
      }
      if (chosen) {
        audio.unlock();
        audio.click();
        world.applyBoon(chosen);
        screen = SCREEN_PLAY;
        announce('Blessing taken. Keep playing.');
      }
      return;
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input.moveVector(), input.takeDash(), false);
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.fuel <= 25 ? 'Hit. Your flame is nearly out.' : `Hit. ${Math.ceil(world.state.fuel)} flame left.`);
    }
    if (events & EVENT_BEACON) audio.beacon();
    if (events & EVENT_BOON) {
      audio.beacon();
      screen = SCREEN_BOON;
      announce('A lantern is lit. Choose a blessing: 1, 2 or 3.');
    }
    if (events & EVENT_WIN) {
      audio.win();
      endGame(true);
    } else if (events & EVENT_OVER) {
      audio.lose();
      endGame(false);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, input.mousePosition(), world.lightRadius());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberkeeper. Press Enter or click to start.');
  // ?debug=1 exposes a read-only handle for automated play-testing; it
  // changes nothing about the game itself.
  if (params.get('debug') === '1') {
    window.__emberkeeper = { world, getScreen: () => screen, getBest: () => best };
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
