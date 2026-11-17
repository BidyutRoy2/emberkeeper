// Everything EMBERKEEPER shows: a dusk garden painted in canvas, a darkness
// that only lantern light can push back, the keeper, the wisps and the fireflies,
// the HUD, and the title, blessing, pause, game-over and dawn screens. All art
// is drawn in code — no images, no fonts to download.

import { FIELD, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BOON = 'boon';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The blessing cards' rectangles, in the same layout drawBoon paints. */
export function boonCardRects(count) {
  const cardWidth = 300;
  const cardHeight = 250;
  const gap = 30;
  const total = count * cardWidth + (count - 1) * gap;
  let x = 640 - total / 2;
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x, y: 230, width: cardWidth, height: cardHeight });
    x += cardWidth + gap;
  }
  return rects;
}

const GOLD = '#ffd166';
const EMBER = '#ff9d3c';
const WISP_PURPLE = '#8b5cf6';
const INK = '#0b1026';

/** A deterministic star field: the same sky on every run. */
function makeStars() {
  const stars = [];
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: next() * FIELD.width, y: next() * 330, size: 0.6 + next() * 1.6, phase: next() * 6.28 });
  }
  return stars;
}

/** A deterministic row of grass tufts along the bottom of the garden. */
function makeGrass() {
  const tufts = [];
  let seed = 987654;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let x = 8; x < FIELD.width; x += 14) {
    tufts.push({ x, height: 8 + next() * 16, lean: (next() - 0.5) * 10 });
  }
  return tufts;
}

/** @returns a renderer bound to one canvas. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars();
  const grass = makeGrass();
  const dark = document.createElement('canvas');
  dark.width = VIEW.width;
  dark.height = VIEW.height;
  const darkCtx = dark.getContext('2d');

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function text(string, x, y, size, color, align = 'center', weight = '600', font = 'system-ui, sans-serif') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
  }

  function drawSky(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, '#0a0f2a');
    gradient.addColorStop(0.45, '#1a2b4d');
    gradient.addColorStop(0.75, '#274b5e');
    gradient.addColorStop(1, '#0e241c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Moon with a soft halo.
    const moon = ctx.createRadialGradient(1120, 92, 8, 1120, 92, 90);
    moon.addColorStop(0, 'rgba(255, 244, 200, 0.85)');
    moon.addColorStop(0.25, 'rgba(255, 244, 200, 0.18)');
    moon.addColorStop(1, 'rgba(255, 244, 200, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(1010, 0, 220, 200);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(1120, 92, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 190, 130, 0.7)';
    ctx.beginPath();
    ctx.arc(1110, 84, 6, 0, Math.PI * 2);
    ctx.arc(1132, 100, 4, 0, Math.PI * 2);
    ctx.fill();
    // Twinkling stars.
    for (const star of stars) {
      const alpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 0.7 + star.phase));
      ctx.fillStyle = `rgba(255, 255, 240, ${alpha.toFixed(2)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    // Distant hills, two layers.
    ctx.fillStyle = '#16283d';
    ctx.beginPath();
    ctx.moveTo(0, 470);
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.lineTo(x, 470 - Math.sin(x * 0.006 + 1.2) * 46 - 18);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#10231d';
    ctx.beginPath();
    ctx.moveTo(0, 560);
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.lineTo(x, 560 - Math.sin(x * 0.009 + 4.0) * 30 - 10);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    // Ground and grass.
    const ground = ctx.createLinearGradient(0, 560, 0, FIELD.height);
    ground.addColorStop(0, '#16301f');
    ground.addColorStop(1, '#0a1a12');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 560, FIELD.width, FIELD.height - 560);
    ctx.strokeStyle = 'rgba(74, 160, 110, 0.5)';
    ctx.lineWidth = 2;
    for (const tuft of grass) {
      ctx.beginPath();
      ctx.moveTo(tuft.x, FIELD.height);
      ctx.lineTo(tuft.x + tuft.lean, FIELD.height - tuft.height);
      ctx.stroke();
    }
  }

  function drawBeacon(beacon, time) {
    const { x, y } = beacon;
    // Stone post.
    ctx.fillStyle = '#3a3f4d';
    ctx.fillRect(x - 9, y - 6, 18, 44);
    ctx.fillStyle = '#2c3040';
    ctx.fillRect(x - 14, y + 36, 28, 8);
    // Roof.
    ctx.fillStyle = beacon.lit ? '#6b4a1f' : '#33364a';
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 6);
    ctx.lineTo(x, y - 30);
    ctx.lineTo(x + 20, y - 6);
    ctx.closePath();
    ctx.fill();
    if (beacon.lit) {
      const glow = ctx.createRadialGradient(x, y - 16, 4, x, y - 16, 64);
      glow.addColorStop(0, 'rgba(255, 209, 102, 0.75)');
      glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 64, y - 80, 128, 128);
      const flame = 5 + Math.sin(time * 6 + x) * 1.5;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.ellipse(x, y - 18, flame, flame * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = EMBER;
      ctx.beginPath();
      ctx.ellipse(x, y - 16, flame * 0.55, flame * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1d2030';
      ctx.beginPath();
      ctx.arc(x, y - 16, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 16, 26, 0, Math.PI * 2);
      ctx.stroke();
      if (beacon.progress > 0) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y - 16, 26, -Math.PI / 2, -Math.PI / 2 + beacon.progress * Math.PI * 2);
        ctx.stroke();
        text('Lighting…', x + 42, y - 16, 14, '#ffe9a8', 'left');
      }
    }
    text(beacon.name, x, y + 62, 12, 'rgba(230, 235, 255, 0.75)');
  }

  function drawFireflies(state, time) {
    for (const fly of state.fireflies) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 3 + fly.phase);
      const glow = ctx.createRadialGradient(fly.x, fly.y, 1, fly.x, fly.y, 16);
      glow.addColorStop(0, `rgba(255, 233, 138, ${0.8 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 233, 138, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(fly.x - 16, fly.y - 16, 32, 32);
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWisps(state, time) {
    for (const wisp of state.wisps) {
      if (wisp.respawnIn > 0) continue;
      const wobble = Math.sin(time * 4 + wisp.phase) * 2;
      const glow = ctx.createRadialGradient(wisp.x, wisp.y, 4, wisp.x, wisp.y, 44);
      glow.addColorStop(0, 'rgba(139, 92, 246, 0.55)');
      glow.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(wisp.x - 44, wisp.y - 44, 88, 88);
      ctx.fillStyle = 'rgba(76, 42, 140, 0.9)';
      ctx.beginPath();
      ctx.ellipse(wisp.x, wisp.y + wobble, wisp.radius, wisp.radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(wisp.x - 6, wisp.y - 3 + wobble, 2.6, 0, Math.PI * 2);
      ctx.arc(wisp.x + 6, wisp.y - 3 + wobble, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WISP_PURPLE;
      ctx.beginPath();
      ctx.arc(wisp.x - 6, wisp.y - 3 + wobble, 1.2, 0, Math.PI * 2);
      ctx.arc(wisp.x + 6, wisp.y - 3 + wobble, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(state, time) {
    const player = state.player;
    const blink = player.invulnTime > 0 && Math.floor(time * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    const sway = Math.sin(time * 2.2) * 3 + (player.moving ? Math.sin(time * 14) * 2 : 0);
    const lanternX = player.x + player.faceX * 14 + sway;
    const lanternY = player.y + 12 + Math.abs(Math.sin(time * 2.2)) * 2;
    // Cloak.
    ctx.fillStyle = '#2a9d8f';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 22);
    ctx.quadraticCurveTo(player.x + 17, player.y - 4, player.x + 13, player.y + 16);
    ctx.lineTo(player.x - 13, player.y + 16);
    ctx.quadraticCurveTo(player.x - 17, player.y - 4, player.x, player.y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#21867a';
    ctx.fillRect(player.x - 13, player.y + 12, 26, 5);
    // Hood and face.
    ctx.fillStyle = '#1f7a6e';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0b3';
    ctx.beginPath();
    ctx.arc(player.x + player.faceX * 3, player.y - 17, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26221f';
    ctx.beginPath();
    ctx.arc(player.x + player.faceX * 3 - 2.4, player.y - 18, 1.2, 0, Math.PI * 2);
    ctx.arc(player.x + player.faceX * 3 + 2.4, player.y - 18, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // The lantern itself.
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + player.faceX * 8, player.y - 2);
    ctx.lineTo(lanternX, lanternY - 8);
    ctx.stroke();
    const glow = ctx.createRadialGradient(lanternX, lanternY, 2, lanternX, lanternY, 30);
    glow.addColorStop(0, 'rgba(255, 220, 130, 0.9)');
    glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lanternX - 30, lanternY - 30, 60, 60);
    ctx.fillStyle = '#3a2f16';
    ctx.fillRect(lanternX - 6, lanternY - 9, 12, 16);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.ellipse(lanternX, lanternY - 1, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dash cooldown ring under the keeper.
    if (player.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y + 24, 10, -Math.PI / 2, -Math.PI / 2 + (1 - player.dashCooldown / 1.4) * Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const floater of state.floaters) {
      const alpha = Math.max(0, floater.life / floater.maxLife);
      ctx.globalAlpha = alpha;
      text(floater.text, floater.x, floater.y, 17, floater.color, 'center', '700');
    }
    ctx.globalAlpha = 1;
  }

  /** Punch holes of light into the darkness: the keeper, lit lanterns, fireflies. */
  function drawDarkness(state, lightRadius, strength) {
    darkCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    darkCtx.fillStyle = `rgba(4, 7, 18, ${strength})`;
    darkCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    darkCtx.globalCompositeOperation = 'destination-out';
    function hole(x, y, radius, alpha) {
      const gradient = darkCtx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      gradient.addColorStop(0.7, `rgba(0, 0, 0, ${alpha * 0.55})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      darkCtx.fillStyle = gradient;
      darkCtx.beginPath();
      darkCtx.arc(x, y, radius, 0, Math.PI * 2);
      darkCtx.fill();
    }
    hole(state.player.x, state.player.y, lightRadius, 0.96);
    for (const beacon of state.beacons) {
      if (beacon.lit) hole(beacon.x, beacon.y - 14, 120, 0.9);
      else if (beacon.progress > 0) hole(beacon.x, beacon.y - 14, 60 + beacon.progress * 50, 0.7);
    }
    for (const fly of state.fireflies) hole(fly.x, fly.y, 26, 0.55);
    darkCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }

  function drawHud(state, best) {
    const time = state.time;
    ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
    roundRect(12, 10, 1256, 56, 12);
    ctx.fill();
    // Flame bar.
    text('🔥 FLAME', 30, 28, 13, '#ffb347', 'left', '800');
    const fuelFraction = Math.max(0, state.fuel / state.maxFuel);
    const low = fuelFraction < 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    roundRect(30, 38, 220, 14, 7);
    ctx.fill();
    const fuelGradient = ctx.createLinearGradient(30, 0, 250, 0);
    fuelGradient.addColorStop(0, low ? '#ef4444' : '#ffb347');
    fuelGradient.addColorStop(1, low ? '#f97316' : '#ffd166');
    ctx.fillStyle = fuelGradient;
    if (fuelFraction > 0.01) {
      roundRect(30, 38, 220 * fuelFraction, 14, 7);
      ctx.fill();
    }
    text(`${Math.ceil(state.fuel)} / ${state.maxFuel}`, 258, 45, 13, '#ffe9a8', 'left', '700');
    // Night and beacons, centred.
    text(`NIGHT ${state.night} / 5`, 640, 28, 15, '#e6ebff', 'center', '800');
    for (let i = 0; i < 5; i += 1) {
      const x = 580 + i * 26;
      const lit = i < state.beaconsLit;
      ctx.fillStyle = lit ? GOLD : 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(x, 48, 6, 0, Math.PI * 2);
      ctx.fill();
      if (lit) {
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(x, 48, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Score, right.
    text(`SCORE  ${state.score}`, 1256, 28, 20, '#ffffff', 'right', '800');
    text(`BEST ${Math.max(best, state.score)}`, 1256, 50, 12, 'rgba(230, 235, 255, 0.7)', 'right', '600');
    if (state.combo >= 3) {
      const pulse = 1 + Math.sin(time * 8) * 0.05;
      ctx.save();
      ctx.translate(640, 88);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255, 157, 60, 0.9)';
      roundRect(-62, -16, 124, 32, 16);
      ctx.fill();
      text(`COMBO ×${(1 + Math.min(state.combo, 20) * 0.1).toFixed(1)}  (${state.combo})`, 0, 1, 15, '#1a1206', 'center', '800');
      ctx.restore();
    }
    text('WASD / Arrows move  ·  SPACE dash  ·  P pause  ·  M mute', 640, 700, 13, 'rgba(230, 235, 255, 0.55)');
  }

  function drawPanel(x, y, width, height) {
    ctx.fillStyle = 'rgba(7, 11, 26, 0.78)';
    roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
    ctx.lineWidth = 2;
    roundRect(x, y, width, height, 18);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4, 7, 18, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(290, 118, 700, 452);
    ctx.save();
    ctx.shadowColor = 'rgba(255, 180, 60, 0.9)';
    ctx.shadowBlur = 34;
    text('EMBERKEEPER', 640, 178, 62, '#ffd166', 'center', '900', "Georgia, 'Times New Roman', serif");
    ctx.restore();
    text('Light the five lanterns before the dark takes your flame.', 640, 226, 19, '#ffe9a8');
    text('🏮  Stand by a dark lantern to light it  ·  🔥  Fireflies feed your flame', 640, 272, 17, '#e6ebff');
    text('👻  Shadow wisps eat 18 flame on a touch  ·  ⚡  Space dashes through danger', 640, 300, 17, '#e6ebff');
    text('🎁  Every lantern lit offers a blessing — choose wisely', 640, 328, 17, '#e6ebff');
    text('Move with WASD or the Arrow Keys  ·  Click or press ENTER to begin', 640, 374, 16, 'rgba(230, 235, 255, 0.8)');
    text('▶  PRESS ENTER OR CLICK TO BEGIN  ◀', 640, 424, 22, '#ffffff', 'center', '800');
    if (best > 0) text(`Best score: ${best}`, 640, 466, 16, GOLD);
    text('A game by HiddenGem  ·  Best with sound on  ·  M mutes', 640, 520, 14, 'rgba(230, 235, 255, 0.6)');
  }

  function drawBoon(state, mouse) {
    ctx.fillStyle = 'rgba(4, 7, 18, 0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THE NIGHT DEEPENS', 640, 130, 40, GOLD, 'center', '900', "Georgia, 'Times New Roman', serif");
    text('A lantern burns again. Choose one blessing — press 1, 2 or 3, or click a card.', 640, 176, 18, '#ffe9a8');
    const options = state.boonOptions || [];
    const cardWidth = 300;
    const cardHeight = 250;
    const gap = 30;
    const total = options.length * cardWidth + (options.length - 1) * gap;
    let x = 640 - total / 2;
    const y = 230;
    options.forEach((boon, index) => {
      const hover = mouse && mouse.x >= x && mouse.x <= x + cardWidth && mouse.y >= y && mouse.y <= y + cardHeight;
      ctx.fillStyle = hover ? 'rgba(50, 44, 16, 0.92)' : 'rgba(10, 14, 32, 0.92)';
      roundRect(x, y, cardWidth, cardHeight, 16);
      ctx.fill();
      ctx.strokeStyle = hover ? GOLD : 'rgba(255, 209, 102, 0.4)';
      ctx.lineWidth = hover ? 3 : 2;
      roundRect(x, y, cardWidth, cardHeight, 16);
      ctx.stroke();
      text(`[ ${index + 1} ]`, x + cardWidth / 2, y + 34, 15, 'rgba(230, 235, 255, 0.7)');
      text(boon.icon, x + cardWidth / 2, y + 92, 52, GOLD);
      text(boon.name, x + cardWidth / 2, y + 152, 24, '#ffffff', 'center', '800');
      // Wrap the blessing text to two lines.
      const words = boon.text.split(' ');
      const lines = [];
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 26) {
          lines.push(line.trim());
          line = word;
        } else line += ' ' + word;
      }
      lines.push(line.trim());
      lines.forEach((lineText, lineIndex) => {
        text(lineText, x + cardWidth / 2, y + 196 + lineIndex * 22, 15, '#e6ebff');
      });
      x += cardWidth + gap;
    });
    text('Your flame holds while you choose.', 640, 540, 15, 'rgba(230, 235, 255, 0.65)');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 7, 18, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(440, 250, 400, 180);
    text('PAUSED', 640, 308, 44, '#ffffff', 'center', '900', "Georgia, 'Times New Roman', serif");
    text('Press P or ENTER to keep playing', 640, 360, 17, '#ffe9a8');
    text('R restarts the night', 640, 390, 15, 'rgba(230, 235, 255, 0.75)');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(4, 7, 18, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(330, 150, 620, 400);
    text('THE LIGHT HAS', 640, 208, 40, '#c4b5fd', 'center', '900', "Georgia, 'Times New Roman', serif");
    text('GONE OUT', 640, 254, 40, '#c4b5fd', 'center', '900', "Georgia, 'Times New Roman', serif");
    text('The garden is dark again — but the lanterns remember you.', 640, 300, 17, '#e6ebff');
    text(`SCORE  ${state.score}`, 640, 352, 30, '#ffffff', 'center', '800');
    if (state.score >= best && state.score > 0) text('★ NEW BEST SCORE ★', 640, 388, 18, GOLD, 'center', '800');
    else text(`Best  ${best}`, 640, 388, 16, 'rgba(230, 235, 255, 0.75)');
    text(`Lanterns lit ${state.beaconsLit} / 5  ·  Fireflies gathered ${state.stats.picked}  ·  Night ${state.night}`, 640, 424, 16, '#e6ebff');
    text('▶  PRESS ENTER OR R TO TRY AGAIN  ◀', 640, 482, 20, '#ffffff', 'center', '800');
  }

  function drawWin(state, best) {
    const dawn = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    dawn.addColorStop(0, 'rgba(255, 190, 80, 0.28)');
    dawn.addColorStop(0.5, 'rgba(255, 150, 60, 0.16)');
    dawn.addColorStop(1, 'rgba(255, 120, 40, 0.05)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(310, 130, 660, 430);
    ctx.save();
    ctx.shadowColor = 'rgba(255, 190, 80, 0.9)';
    ctx.shadowBlur = 30;
    text('DAWN BREAKS', 640, 190, 56, '#ffd166', 'center', '900', "Georgia, 'Times New Roman', serif");
    ctx.restore();
    text('All five lanterns burn again. The garden wakes in gold.', 640, 238, 19, '#ffe9a8');
    text(`SCORE  ${state.score - state.winBonus}   +   TIME BONUS  ${state.winBonus}`, 640, 300, 20, '#ffffff', 'center', '700');
    text(`TOTAL  ${state.score}`, 640, 344, 34, '#ffffff', 'center', '800');
    if (state.score >= best && state.score > 0) text('★ NEW BEST SCORE ★', 640, 384, 18, GOLD, 'center', '800');
    else text(`Best  ${best}`, 640, 384, 16, 'rgba(230, 235, 255, 0.75)');
    text(`Fireflies gathered ${state.stats.picked}  ·  Dashes ${state.stats.dashes}  ·  Nights survived 5 / 5`, 640, 420, 16, '#e6ebff');
    text('▶  PRESS ENTER TO PLAY AGAIN  ◀', 640, 486, 20, '#ffffff', 'center', '800');
  }

  /**
   * Paint one frame. `screen` is one of the SCREEN_* constants, `best` the saved
   * best score, `mouse` the pointer position for card hover ({x, y} or null),
   * `lightRadius` the keeper's current lantern reach in pixels.
   */
  function draw(state, screen, best, mouse, lightRadius = 135) {
    const time = state.time;
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate(Math.sin(time * 61) * state.shake * 0.5, Math.cos(time * 53) * state.shake * 0.5);
    }
    drawSky(time);
    for (const beacon of state.beacons) drawBeacon(beacon, time);
    drawFireflies(state, time);
    drawWisps(state, time);
    drawPlayer(state, time);
    drawParticles(state);
    if (screen === SCREEN_WIN) {
      // Dawn: no darkness at all.
    } else if (screen === SCREEN_TITLE) {
      drawDarkness(state, 170, 0.5);
    } else {
      drawDarkness(state, lightRadius, 0.86);
    }
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_BOON || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_BOON) drawBoon(state, mouse);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(state, best);
    if (screen === SCREEN_WIN) drawWin(state, best);
  }

  return { draw };
}
