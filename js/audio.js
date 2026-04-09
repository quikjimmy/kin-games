// ============================================
// Audio — Retro sound synthesis via Web Audio API
// ============================================

const Audio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function play(type, freq, duration, volume = 0.15) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch (e) {}
  }

  // Sound effects
  const sfx = {
    tap: () => play('square', 800, 0.08),
    place: () => play('square', 520, 0.12),
    correct: () => { play('square', 660, 0.1); setTimeout(() => play('square', 880, 0.15), 100); },
    wrong: () => { play('sawtooth', 200, 0.2, 0.1); setTimeout(() => play('sawtooth', 150, 0.3, 0.1), 150); },
    combo: () => { play('square', 440, 0.08); setTimeout(() => play('square', 660, 0.08), 80); setTimeout(() => play('square', 880, 0.12), 160); },
    levelUp: () => {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => play('square', f, 0.15), i * 120);
      });
    },
    gameOver: () => {
      [400, 350, 300, 200].forEach((f, i) => {
        setTimeout(() => play('sawtooth', f, 0.25, 0.1), i * 200);
      });
    },
    buy: () => { play('triangle', 1200, 0.08); setTimeout(() => play('triangle', 800, 0.12), 80); },
    coin: () => play('square', 1400, 0.06),
    tick: () => play('square', 1000, 0.03, 0.05),
    surge: () => {
      [800, 1000, 1200, 1600].forEach((f, i) => {
        setTimeout(() => play('square', f, 0.1, 0.1), i * 60);
      });
    }
  };

  return { sfx, resume, toggle };
})();
