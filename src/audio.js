export function createAudio() {
  let ctx = null;

  function context() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, gain) {
    const audio = context();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  return {
    unlock() {
      context();
    },
    attack() {
      tone(480, 0.07, 'triangle', 0.035);
      tone(160, 0.08, 'sine', 0.03);
    },
    hit() {
      tone(220, 0.06, 'square', 0.03);
      tone(90, 0.1, 'sawtooth', 0.025);
    },
    hurt() {
      tone(110, 0.16, 'sawtooth', 0.04);
    },
    dodge() {
      tone(360, 0.09, 'sine', 0.03);
    },
    die() {
      tone(80, 0.38, 'triangle', 0.05);
    },
    win() {
      tone(523, 0.1, 'triangle', 0.04);
      setTimeout(() => tone(659, 0.14, 'triangle', 0.035), 110);
      setTimeout(() => tone(784, 0.2, 'sine', 0.03), 220);
    },
  };
}
