// Sound effects, made right in the browser from simple tones and noise (Web Audio).
// No sound files, so nothing to download and no licenses to track; every sound is our own.

export const SOUNDS = [
  ['chime', 'Chime'], ['ding', 'Ding'], ['pop', 'Pop'], ['coin', 'Coin'], ['magic', 'Magic sparkle'],
  ['fanfare', 'Ta-da!'], ['sad', 'Wah-wah'], ['boing', 'Boing'], ['whoosh', 'Whoosh'], ['knock', 'Knock knock'],
  ['door', 'Creaky door'], ['unlock', 'Unlock'], ['locked', 'Locked rattle'], ['footsteps', 'Footsteps'],
  ['splash', 'Splash'], ['thunder', 'Thunder'], ['bird', 'Bird chirp'], ['heartbeat', 'Heartbeat'], ['alarm', 'Alarm'],
];
export const soundName = (id) => (SOUNDS.find((s) => s[0] === id) || [])[1] || null;

let ctx = null, master = null, noiseBuf = null;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Rise quickly, then fade away.
function envelope(g, t, attack, dur, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
}

function tone(f, t, dur, { type = 'sine', vol = 0.2, to = null, attack = 0.01 } = {}) {
  const c = ac(), o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + dur);
  envelope(g, t, attack, dur, vol);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

function noise(t, dur, { vol = 0.3, freq = 1000, to = null, q = 1, type = 'bandpass', attack = 0.01 } = {}) {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + attack + dur);
  f.Q.value = q;
  envelope(g, t, attack, dur, vol);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + attack + dur + 0.05);
}

const RECIPES = {
  chime(t) { tone(1047, t, 1.2, { vol: 0.15 }); tone(1568, t + 0.08, 1, { vol: 0.1 }); tone(2093, t + 0.16, 0.9, { vol: 0.07 }); },
  ding(t) { tone(1319, t, 0.9, { type: 'triangle', vol: 0.25 }); tone(2638, t, 0.4, { vol: 0.04 }); },
  pop(t) { tone(380, t, 0.08, { to: 1000, vol: 0.35 }); },
  coin(t) { tone(988, t, 0.07, { type: 'square', vol: 0.07 }); tone(1319, t + 0.08, 0.35, { type: 'square', vol: 0.07 }); },
  magic(t) { [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.06, 0.35, { type: 'triangle', vol: 0.08 })); noise(t, 0.6, { freq: 6000, vol: 0.05, type: 'highpass' }); },
  fanfare(t) {
    [[523, 0, 0.1], [659, 0.12, 0.1], [784, 0.24, 0.1], [1047, 0.36, 0.7]].forEach(([f, at, d]) => {
      tone(f, t + at, d, { type: 'square', vol: 0.06 }); tone(f, t + at, d, { type: 'triangle', vol: 0.12 });
    });
  },
  sad(t) { [392, 370, 349].forEach((f, i) => tone(f, t + i * 0.38, 0.28, { type: 'triangle', vol: 0.22 })); tone(330, t + 1.14, 0.9, { type: 'triangle', vol: 0.22, to: 290 }); },
  boing(t) { tone(140, t, 0.45, { to: 520, vol: 0.3 }); tone(520, t + 0.2, 0.3, { to: 260, vol: 0.12 }); },
  whoosh(t) { noise(t, 0.35, { freq: 300, to: 3000, q: 0.8, vol: 0.45, attack: 0.2 }); },
  knock(t) { [0, 0.2].forEach((k) => { tone(170, t + k, 0.08, { to: 90, vol: 0.5 }); noise(t + k, 0.05, { freq: 700, type: 'lowpass', vol: 0.35 }); }); },
  door(t) { tone(70, t, 0.9, { type: 'sawtooth', to: 150, vol: 0.05, attack: 0.15 }); tone(150, t + 0.6, 0.6, { type: 'sawtooth', to: 90, vol: 0.04, attack: 0.1 }); },
  unlock(t) { noise(t, 0.03, { freq: 3000, vol: 0.4 }); noise(t + 0.14, 0.04, { freq: 2000, vol: 0.5 }); tone(1200, t + 0.14, 0.06, { vol: 0.1 }); },
  locked(t) { [0, 0.07, 0.14, 0.21].forEach((k) => noise(t + k, 0.03, { freq: 1400, vol: 0.4 })); tone(160, t, 0.25, { vol: 0.15 }); },
  footsteps(t) { [0, 0.32, 0.64, 0.96].forEach((k) => noise(t + k, 0.09, { type: 'lowpass', freq: 450, vol: 0.55 })); },
  splash(t) { noise(t, 0.6, { freq: 2200, to: 500, q: 0.5, vol: 0.5 }); tone(300, t, 0.12, { to: 900, vol: 0.1 }); },
  thunder(t) { noise(t, 2.2, { type: 'lowpass', freq: 500, to: 60, vol: 0.9, attack: 0.04 }); noise(t + 0.15, 1.6, { type: 'lowpass', freq: 200, vol: 0.6, attack: 0.2 }); },
  bird(t) { tone(2500, t, 0.07, { to: 3600, vol: 0.1 }); tone(2900, t + 0.13, 0.07, { to: 4200, vol: 0.1 }); tone(2600, t + 0.27, 0.12, { to: 3800, vol: 0.1 }); },
  heartbeat(t) { [0, 0.8].forEach((k) => { tone(65, t + k, 0.12, { to: 40, vol: 0.7 }); tone(58, t + k + 0.2, 0.12, { to: 38, vol: 0.55 }); }); },
  alarm(t) { for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, t + i * 0.16, 0.13, { type: 'square', vol: 0.05 }); },
};

export function playSound(id) {
  const r = RECIPES[id];
  if (!r) return;
  try { r(ac().currentTime + 0.02); } catch { /* audio not available: stay quiet */ }
}
