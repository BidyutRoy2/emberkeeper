// Every sound in EMBERKEEPER is synthesised with WebAudio oscillators: no audio
// files, no network, nothing to download. The context is created on the first
// player gesture, so browsers that block autoplay stay silent until play begins.

/** @returns an object with one method per game sound, plus toggleMute. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** Resume the context after a user gesture; safe to call any time. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone({ frequency, endFrequency = null, duration, type = 'sine', volume = 1, delay = 0 }) {
    if (muted || !ensure()) return;
    try {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
    /** A firefly chime that climbs in pitch as the combo grows. */
    pickup(combo) {
      const step = Math.min(combo, 12);
      tone({ frequency: 520 + step * 32, duration: 0.16 });
      tone({ frequency: 780 + step * 32, duration: 0.2, delay: 0.05, volume: 0.6 });
    },
    /** A low thud when a wisp touches the keeper. */
    hit() {
      tone({ frequency: 160, endFrequency: 55, duration: 0.3, type: 'sawtooth', volume: 0.9 });
    },
    /** A soft rush for the dash. */
    dash() {
      tone({ frequency: 300, endFrequency: 900, duration: 0.14, type: 'triangle', volume: 0.5 });
    },
    /** A rising arpeggio when a lantern is lit. */
    beacon() {
      [392, 494, 587, 784].forEach((frequency, index) => {
        tone({ frequency, duration: 0.35, delay: index * 0.07, volume: 0.7 });
      });
    },
    /** A short click for menus and blessings. */
    click() {
      tone({ frequency: 660, duration: 0.07, type: 'square', volume: 0.4 });
    },
    /** The dawn fanfare on winning. */
    win() {
      [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
        tone({ frequency, duration: 0.5, delay: index * 0.11, volume: 0.7 });
      });
    },
    /** A falling drone on losing the light. */
    lose() {
      tone({ frequency: 220, endFrequency: 55, duration: 1.1, type: 'sawtooth', volume: 0.7 });
      tone({ frequency: 110, endFrequency: 40, duration: 1.2, type: 'sine', volume: 0.8, delay: 0.1 });
    },
  };
}
