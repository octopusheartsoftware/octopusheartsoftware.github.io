'use strict';
// Bar by Bar test build: pick some bars, loop them, play an instrument along, press Keep to lock it in.
// Every sound is made in code with the Web Audio API, so there are no sample files.

const VERSION = '0.1';
const BEATS = 4;          // beats in a bar
const GRID = 0.25;        // snap grid in beats (16th notes)
const BAR_W = 96;         // width of one bar in the song strip, in CSS pixels
const STRIP_H = 92;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = m => NOTE_NAMES[m % 12] + Math.floor(m / 12); // FL Studio naming: middle C (60) = C5
const $ = s => document.querySelector(s);

// ---------- Sounds ----------
const PADS = ['Kick', 'Snare', 'Clap', 'Rim', 'Closed hat', 'Open hat', 'Tom', 'Crash'];
// kick: [start pitch, end pitch, pitch drop time, length]; snare: [tone pitch, noise pitch, length]
const KITS = {
  '808': { name: '808', kick: [115, 42, 0.09, 0.75], click: 0, snare: [185, 1800, 0.18], hat: 7000, tom: [150, 85], lp: 0, vol: 1 },
  '909': { name: '909', kick: [200, 52, 0.035, 0.38], click: 0.5, snare: [230, 3000, 0.16], hat: 8500, tom: [190, 110], lp: 0, vol: 1 },
  lofi: { name: 'Lo-fi', kick: [95, 45, 0.06, 0.45], click: 0, snare: [170, 1500, 0.14], hat: 6000, tom: [140, 80], lp: 3200, vol: 1.15 },
};
// oscs: the waveforms layered in one note. cut/q: low-pass filter. fenv/fdec: filter sweep. a/d/s/r: volume shape.
const SYNTHS = {
  bass: {
    sub: { name: 'Sub', oscs: [{ type: 'sine' }, { type: 'triangle', gain: 0.25 }], a: 0.004, d: 0.2, s: 0.9, r: 0.08 },
    saw: { name: 'Saw', oscs: [{ type: 'sawtooth' }], cut: 900, q: 2, a: 0.004, d: 0.25, s: 0.7, r: 0.06 },
    square: { name: 'Square', oscs: [{ type: 'square' }], cut: 1200, q: 1, a: 0.004, d: 0.25, s: 0.7, r: 0.06 },
    reese: { name: 'Reese', oscs: [{ type: 'sawtooth', detune: -14 }, { type: 'sawtooth', detune: 14 }], cut: 650, q: 1, a: 0.01, d: 0.3, s: 0.85, r: 0.1 },
    acid: { name: 'Acid', oscs: [{ type: 'sawtooth' }], cut: 220, q: 16, fenv: 2800, fdec: 0.16, a: 0.003, d: 0.2, s: 0.6, r: 0.05 },
    pluck: { name: 'Pluck', oscs: [{ type: 'square' }], cut: 250, q: 4, fenv: 2200, fdec: 0.1, a: 0.002, d: 0.25, s: 0, r: 0.08 },
  },
  lead: {
    saw: { name: 'Saw', oscs: [{ type: 'sawtooth', detune: -7 }, { type: 'sawtooth', detune: 7 }], cut: 4200, q: 1, a: 0.005, d: 0.3, s: 0.7, r: 0.12 },
    square: { name: 'Square', oscs: [{ type: 'square' }], cut: 3500, q: 1, a: 0.005, d: 0.3, s: 0.7, r: 0.1 },
    supersaw: { name: 'Supersaw', oscs: [-24, -12, -4, 4, 12, 24].map(d => ({ type: 'sawtooth', detune: d })), cut: 6000, q: 0.7, a: 0.01, d: 0.4, s: 0.8, r: 0.25 },
    pluck: { name: 'Pluck', oscs: [{ type: 'sawtooth' }], cut: 500, q: 3, fenv: 5000, fdec: 0.14, a: 0.002, d: 0.35, s: 0, r: 0.15 },
    bell: { name: 'Bell', oscs: [{ type: 'sine', fm: { ratio: 3.5, index: 2.2, dec: 0.8 } }], a: 0.002, d: 1.4, s: 0, r: 0.6 },
    pad: { name: 'Soft pad', oscs: [{ type: 'sawtooth', detune: -10 }, { type: 'sawtooth', detune: 10 }, { type: 'triangle', gain: 0.6 }], cut: 1600, q: 0.5, a: 0.35, d: 0.5, s: 0.85, r: 0.8 },
  },
};
const OCT_RANGE = { bass: [24, 48], lead: [48, 84] };

// ---------- Song (saved on the device) ----------
// events: { inst, beat, dur, n (pad number or MIDI note), snd }. clips: { id, beat, beats } with the audio in IndexedDB.
const STORE = 'bar-by-bar-song';
function blankSong() {
  return {
    bpm: 110, bars: 16, click: true, snap: true, events: [], clips: [],
    fx: { reverb: 0.3, echo: 0, radio: false },
    sound: { drums: '808', bass: 'sub', lead: 'saw' }, oct: { bass: 36, lead: 60 },
  };
}
function loadSong() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && Array.isArray(s.events)) return Object.assign(blankSong(), s);
  } catch {}
  return blankSong();
}
let song = loadSong();
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(song)); } catch {} };

const idb = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('bar-by-bar', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('clips', mode), req = fn(t.objectStore('clips'));
      t.oncomplete = () => res(req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    put: (k, v) => tx('readwrite', s => s.put(v, k)),
    get: k => tx('readonly', s => s.get(k)),
    del: k => tx('readwrite', s => s.delete(k)),
    clear: () => tx('readwrite', s => s.clear()),
  };
})();
const clipAudio = new Map(); // clip id -> { data: Float32Array, sr }

// ---------- What's happening right now ----------
let inst = 'drums';
let sel = { a: 0, b: 1 };       // selected bars, inclusive
let stretchNext = false;        // after tapping one bar, the next tap stretches the selection
let take = { events: [], clip: null }; // what you've played on this loop but not kept yet
let play = null;                // { t0, L0, len, done, timer }
let rec = null;                 // voice recording in progress
let mic = null;

const loop = () => ({ L0: sel.a * BEATS, len: (sel.b - sel.a + 1) * BEATS });
const takeEmpty = () => !take.events.length && !take.clip;
const barsLabel = () => sel.a === sel.b ? `bar ${sel.a + 1}` : `bars ${sel.a + 1}–${sel.b + 1}`;
const spb = () => 60 / song.bpm;

// ---------- Audio engine ----------
let ctx, master, buses = {}, noiseBuf, fxNodes;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    const levels = { drums: 0.9, bass: 0.8, lead: 0.55, click: 0.3, voice: 1 };
    for (const k in levels) { buses[k] = ctx.createGain(); buses[k].gain.value = levels[k]; }
    for (const k of ['drums', 'bass', 'lead', 'click']) buses[k].connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    buildVoiceFx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const outLat = () => (ctx.outputLatency || 0) + (ctx.baseLatency || 0);

// Voice: radio filter -> dry, plus sends to a reverb and an echo.
function buildVoiceFx() {
  const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
  hp.type = 'highpass'; lp.type = 'lowpass';
  const dry = ctx.createGain(), revSend = ctx.createGain(), echoSend = ctx.createGain();
  const rev = ctx.createConvolver(), delay = ctx.createDelay(2), fb = ctx.createGain();
  const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  rev.buffer = ir;
  fb.gain.value = 0.38;
  buses.voice.connect(hp).connect(lp);
  lp.connect(dry).connect(master);
  lp.connect(revSend).connect(rev).connect(master);
  lp.connect(echoSend).connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(master);
  fxNodes = { hp, lp, revSend, echoSend, delay };
  applyFx();
}
function applyFx() {
  if (!fxNodes) return;
  const { hp, lp, revSend, echoSend, delay } = fxNodes, fx = song.fx;
  hp.frequency.value = fx.radio ? 550 : 20;
  lp.frequency.value = fx.radio ? 2800 : 20000;
  revSend.gain.value = fx.reverb * 0.9;
  echoSend.gain.value = fx.echo * 0.7;
  delay.delayTime.value = Math.min(1.9, spb() * 0.75); // a dotted eighth note
}

// Every started sound is tracked so Stop can silence it, including ones scheduled a moment ahead.
let sounding = [];
const track = (node, end) => sounding.push({ node, end });
function silenceAll() {
  const now = ctx.currentTime;
  for (const s of sounding) { try { s.node.stop(now); } catch {} }
  sounding = [];
}

function toneHit(dest, t, type, f0, f1, sweep, peak, dec) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dec + 0.02); track(o, t + dec);
}
function noiseHit(dest, t, ftype, freq, q, peak, dec) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  s.connect(f).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.02); track(s, t + dec);
}
function playDrum(n, kitId, t) {
  const k = KITS[kitId] || KITS['808'], g = ctx.createGain();
  g.gain.value = k.vol;
  if (k.lp) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = k.lp;
    g.connect(f).connect(buses.drums);
  } else g.connect(buses.drums);
  switch (n) {
    case 0: toneHit(g, t, 'sine', k.kick[0], k.kick[1], k.kick[2], 1, k.kick[3]);
      if (k.click) noiseHit(g, t, 'highpass', 2500, 0.7, k.click, 0.015); break;
    case 1: toneHit(g, t, 'triangle', k.snare[0], k.snare[0] * 0.8, 0.05, 0.5, 0.1);
      noiseHit(g, t, 'bandpass', k.snare[1], 0.7, 0.8, k.snare[2]); break;
    case 2: for (let i = 0; i < 3; i++) noiseHit(g, t + i * 0.011, 'bandpass', 1150, 1.2, 0.7, 0.012);
      noiseHit(g, t + 0.033, 'bandpass', 1150, 1.2, 0.7, 0.18); break;
    case 3: toneHit(g, t, 'triangle', 1700, 1700, 0, 0.5, 0.035);
      noiseHit(g, t, 'highpass', 3000, 1, 0.4, 0.012); break;
    case 4: noiseHit(g, t, 'highpass', k.hat, 0.7, 0.45, 0.05); break;
    case 5: noiseHit(g, t, 'highpass', k.hat, 0.7, 0.4, 0.38); break;
    case 6: toneHit(g, t, 'sine', k.tom[0], k.tom[1], 0.18, 0.85, 0.38); break;
    case 7: noiseHit(g, t, 'highpass', k.hat * 0.65, 0.5, 0.35, 1.5); break;
  }
}

// Starts a synth note at time t; returns a handle whose stop(t) releases it.
function synthNote(which, sndId, midi, t) {
  const p = SYNTHS[which][sndId] || Object.values(SYNTHS[which])[0];
  const f = 440 * 2 ** ((midi - 69) / 12);
  const amp = ctx.createGain();
  let into = amp;
  if (p.cut) {
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.Q.value = p.q || 1;
    filt.frequency.setValueAtTime(p.cut + (p.fenv || 0), t);
    if (p.fenv) filt.frequency.setTargetAtTime(p.cut, t + 0.005, p.fdec / 2);
    filt.connect(amp);
    into = filt;
  }
  const total = p.oscs.reduce((s, o) => s + (o.gain ?? 1), 0);
  const peak = (which === 'bass' ? 0.6 : 0.4) / Math.sqrt(total);
  const nodes = [];
  for (const o of p.oscs) {
    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = o.type; osc.frequency.value = f; osc.detune.value = o.detune || 0;
    og.gain.value = (o.gain ?? 1) / Math.sqrt(total);
    osc.connect(og).connect(into);
    if (o.fm) {
      const mod = ctx.createOscillator(), mg = ctx.createGain();
      mod.frequency.value = f * o.fm.ratio;
      mg.gain.setValueAtTime(f * o.fm.index, t);
      mg.gain.setTargetAtTime(f * o.fm.index * 0.08, t, o.fm.dec / 3);
      mod.connect(mg).connect(osc.frequency);
      mod.start(t); nodes.push(mod);
    }
    osc.start(t); nodes.push(osc);
  }
  amp.connect(buses[which]);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + p.a);
  amp.gain.setTargetAtTime(peak * p.s, t + p.a, p.d / 3);
  const handle = {
    stopped: false,
    stop(t2) {
      if (handle.stopped) return;
      handle.stopped = true;
      t2 = Math.max(t2, t + p.a);
      amp.gain.cancelScheduledValues(t2);
      amp.gain.setTargetAtTime(0, t2, p.r / 3);
      const end = t2 + p.r * 2 + 0.05;
      for (const n of nodes) { try { n.stop(end); } catch {} track(n, end); }
    },
  };
  for (const n of nodes) track(n, t + 600); // so Stop can silence held notes too
  return handle;
}

function click(t, accent) { toneHit(buses.click, t, 'square', accent ? 1600 : 1100, accent ? 1600 : 1100, 0, 0.5, 0.03); }

const bufCache = new Map();
function clipBuffer(id, a) {
  if (!bufCache.has(id)) {
    const b = ctx.createBuffer(1, a.data.length, a.sr);
    b.copyToChannel(a.data, 0);
    bufCache.set(id, b);
  }
  return bufCache.get(id);
}
function playBuffer(buf, t, offset, maxDur) {
  const s = ctx.createBufferSource();
  s.buffer = buf; s.connect(buses.voice);
  const dur = Math.min(buf.duration - offset, maxDur);
  if (dur <= 0) return;
  s.start(t, offset, dur); track(s, t + dur);
}

// ---------- Looping ----------
// Sounds are scheduled a moment ahead on the audio clock, so timing stays tight even if the page is busy.
// countIn: one bar of clicks first, so there's time to get ready to sing.
function startPlay(countIn = false) {
  audio();
  if (play) return;
  const { L0, len } = loop();
  applyFx();
  const start = ctx.currentTime + 0.1;
  play = { t0: start + (countIn ? BEATS * spb() : 0), L0, len, done: 0 };
  if (countIn) for (let k = 0; k < BEATS; k++) click(start + k * spb(), k === 0);
  play.timer = setInterval(tick, 25);
  tick();
  if (!frameOn) { frameOn = true; requestAnimationFrame(frame); }
  render();
}
let frameOn = false;
function stopPlay() {
  if (!play) return;
  clearInterval(play.timer);
  play = null;
  releaseAllKeys();
  silenceAll();
  if (rec) cancelRec();
  render();
}
const elapsedAt = t => (t - play.t0) / spb();

function tick() {
  if (!play) return;
  const until = elapsedAt(ctx.currentTime + 0.15);
  while (play.done < until) {
    const pass = Math.floor((play.done + 1e-7) / play.len);
    const base = pass * play.len;
    const b = Math.min(until, base + play.len);
    let a = play.done - base;
    if (a < 1e-6) a = 0; // the top of the loop, exactly
    scheduleRange(pass, a, b - base);
    play.done = b;
  }
  const now = ctx.currentTime;
  sounding = sounding.filter(s => s.end > now);
  if (rec) recTick(now);
}

// Schedules everything in loop-local beats [a, b) of one time round the loop.
function scheduleRange(pass, a, b) {
  const { L0, len } = play;
  const at = lb => play.t0 + (pass * len + lb) * spb();
  const muted = !takeEmpty(); // while there's a take, this instrument's old part in these bars goes quiet
  if (song.click) for (let k = Math.ceil(a); k < b; k++) click(at(k), (L0 + k) % BEATS === 0);
  for (const ev of song.events) {
    const lb = ev.beat - L0;
    if (lb < a || lb >= b || (muted && ev.inst === inst)) continue;
    playEvent(ev.inst, ev.n, ev.snd, ev.dur, at(lb));
  }
  for (const ev of take.events) {
    if (ev.pass >= pass || ev.lb < a || ev.lb >= b) continue;
    playEvent(inst, ev.n, song.sound[inst], ev.dur, at(ev.lb));
  }
  if (a <= 0 && 0 < b) { // voice parts start at the top of each time round
    if (!(muted && inst === 'voice')) {
      for (const c of song.clips) {
        const a2 = clipAudio.get(c.id);
        if (!a2 || c.beat >= L0 + len || c.beat + c.beats <= L0) continue;
        const startLb = Math.max(0, c.beat - L0), offset = Math.max(0, L0 - c.beat) * spb();
        if (startLb === 0) playBuffer(clipBuffer(c.id, a2), at(0), offset, len * spb());
      }
    }
    if (take.clip && take.clip.pass < pass) playBuffer(takeBuffer(), at(0), 0, len * spb());
  }
  for (const c of song.clips) { // voice parts that start partway through the loop
    const lb = c.beat - L0, a2 = clipAudio.get(c.id);
    if (!a2 || lb <= 0 || lb < a || lb >= b || (muted && inst === 'voice')) continue;
    playBuffer(clipBuffer(c.id, a2), at(lb), 0, (len - lb) * spb());
  }
}
function playEvent(which, n, snd, dur, t) {
  if (which === 'drums') playDrum(n, snd, t);
  else synthNote(which, snd, n, t).stop(t + dur * spb());
}
let takeBuf = null;
function takeBuffer() {
  if (!takeBuf) { takeBuf = ctx.createBuffer(1, take.clip.data.length, take.clip.sr); takeBuf.copyToChannel(take.clip.data, 0); }
  return takeBuf;
}

// Where in the loop the player is right now, allowing for the speaker delay.
function heardNow() {
  if (!play) return null;
  const e = elapsedAt(ctx.currentTime - outLat());
  if (e < 0) return null;
  const pass = Math.floor(e / play.len);
  return { e, pass, lb: e - pass * play.len };
}
function snapped(p) {
  let lb = song.snap ? Math.round(p.lb / GRID) * GRID : p.lb, pass = p.pass;
  if (lb >= play.len - 1e-6) { lb = 0; pass++; } // snapped onto the next time round
  return { lb, pass };
}

// ---------- Playing live ----------
function hitPad(n) {
  audio();
  playDrum(n, song.sound.drums, ctx.currentTime);
  const el = document.querySelector(`.pad[data-n="${n}"]`);
  if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 90); }
  const p = heardNow();
  if (p) { take.events.push({ n, dur: GRID, ...snapped(p) }); render(); }
}

const held = new Map(); // MIDI note -> { h, start }
function noteOn(midi) {
  audio();
  if (held.has(midi)) noteOff(midi);
  if (inst === 'bass') for (const m of [...held.keys()]) noteOff(m); // bass plays one note at a time
  const h = synthNote(inst, song.sound[inst], midi, ctx.currentTime);
  held.set(midi, { h, start: heardNow() });
  keyEl(midi)?.classList.add('down');
}
function noteOff(midi) {
  const k = held.get(midi);
  if (!k) return;
  held.delete(midi);
  k.h.stop(ctx.currentTime);
  keyEl(midi)?.classList.remove('down');
  const end = heardNow();
  if (!k.start || !end || !play) return;
  const s = snapped(k.start);
  let dur = end.e - k.start.e;
  dur = song.snap ? Math.max(GRID, Math.round(dur / GRID) * GRID) : Math.max(0.05, dur);
  dur = Math.min(dur, play.len - s.lb);
  take.events.push({ n: midi, dur, ...s });
  render();
}
function releaseAllKeys() { for (const m of [...held.keys()]) noteOff(m); }

// ---------- Take: Keep, Undo, Clear, Erase ----------
function keep() {
  if (takeEmpty() || rec) return;
  const { L0, len } = loop(), L1 = L0 + len;
  if (inst === 'voice') {
    for (const c of song.clips.filter(c => c.beat >= L0 && c.beat < L1)) dropClip(c.id);
    song.clips = song.clips.filter(c => !(c.beat >= L0 && c.beat < L1));
    const id = 'c' + Date.now().toString(36);
    clipAudio.set(id, { data: take.clip.data, sr: take.clip.sr });
    idb.put(id, { data: take.clip.data, sr: take.clip.sr }).catch(() => say('We couldn’t save that recording on this device. It will play until you close the page.'));
    song.clips.push({ id, beat: L0, beats: len });
  } else {
    song.events = song.events.filter(e => !(e.inst === inst && e.beat >= L0 && e.beat < L1));
    for (const e of take.events) song.events.push({ inst, beat: L0 + e.lb, dur: e.dur, n: e.n, snd: song.sound[inst] });
  }
  clearTake();
  save();
  flash(`Kept. The ${inst} part is now in ${barsLabel()}.`);
}
function dropClip(id) { clipAudio.delete(id); bufCache.delete(id); idb.del(id).catch(() => {}); }
function clearTake() { take = { events: [], clip: null }; takeBuf = null; render(); }
function undoPass() {
  if (take.clip) { take.clip = null; takeBuf = null; }
  else if (take.events.length) {
    const last = Math.max(...take.events.map(e => e.pass));
    take.events = take.events.filter(e => e.pass !== last);
  }
  render();
}
async function erase() {
  const { L0, len } = loop(), L1 = L0 + len;
  const has = inst === 'voice' ? song.clips.some(c => c.beat >= L0 && c.beat < L1) : song.events.some(e => e.inst === inst && e.beat >= L0 && e.beat < L1);
  if (!has) return flash(`Nothing to erase: ${barsLabel()} has no ${inst} yet.`);
  if (!await ask(`Erase the ${inst} in ${barsLabel()}? This can’t be undone.`, 'Erase')) return;
  if (inst === 'voice') {
    for (const c of song.clips.filter(c => c.beat >= L0 && c.beat < L1)) dropClip(c.id);
    song.clips = song.clips.filter(c => !(c.beat >= L0 && c.beat < L1));
  } else song.events = song.events.filter(e => !(e.inst === inst && e.beat >= L0 && e.beat < L1));
  save();
  flash(`Erased the ${inst} in ${barsLabel()}.`);
}
async function okToDropTake() {
  if (takeEmpty() && !rec) return true;
  if (takeEmpty()) { cancelRec(); return true; }
  if (!await ask('Throw away what you just played? Press Keep first if you want it.', 'Throw it away')) return false;
  if (rec) cancelRec();
  clearTake();
  return true;
}

// ---------- Voice recording ----------
async function openMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const code = `registerProcessor('capture', class extends AudioWorkletProcessor {
    constructor() { super(); this.on = false; this.buf = new Float32Array(2048); this.n = 0; this.t = 0;
      this.port.onmessage = e => { this.on = e.data; this.n = 0; }; }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (this.on && ch) {
        if (this.n === 0) this.t = currentTime;
        this.buf.set(ch, this.n); this.n += ch.length;
        if (this.n >= this.buf.length) { this.port.postMessage({ t: this.t, d: this.buf.slice(0) }); this.n = 0; }
      }
      return true;
    } });`;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
  const src = ctx.createMediaStreamSource(stream), node = new AudioWorkletNode(ctx, 'capture'), sink = ctx.createGain();
  sink.gain.value = 0;
  src.connect(node).connect(sink).connect(ctx.destination);
  node.port.onmessage = e => { if (rec) rec.chunks.push(e.data); };
  const tr = stream.getAudioTracks()[0], set = tr.getSettings ? tr.getSettings() : {};
  mic = { stream, node, inLat: set.latency || 0.02 };
}
async function toggleRecord() {
  audio();
  if (rec) { cancelRec(); return render(); }
  if (!mic) {
    say('Asking to use the microphone…');
    try { await openMic(); } catch {
      return say('We couldn’t use the microphone. Check that this page is allowed to use it, then try again.');
    }
  }
  if (!play) startPlay(true);
  const e = elapsedAt(ctx.currentTime);
  let pass = Math.max(0, Math.floor(e / play.len) + 1);
  if ((pass * play.len - e) < 1) pass++; // always at least one beat to get ready
  const T0 = play.t0 + pass * play.len * spb();
  rec = { pass, T0, T1: T0 + play.len * spb(), lat: outLat() + mic.inLat, chunks: [], on: false };
  mic.node.port.postMessage(true);
  render();
}
function cancelRec() {
  rec = null;
  if (mic) mic.node.port.postMessage(false);
}
function recTick(now) {
  if (!rec.on && now >= rec.T0) { rec.on = true; render(); }
  if (now < rec.T1 + rec.lat + 0.12) return;
  // Line each chunk up with the beat the singer was hearing, then cut exactly one time round.
  const sr = ctx.sampleRate, N = Math.round((rec.T1 - rec.T0) * sr), data = new Float32Array(N);
  for (const c of rec.chunks) {
    const s = Math.round((c.t - rec.lat - rec.T0) * sr);
    for (let i = 0; i < c.d.length; i++) { const j = s + i; if (j >= 0 && j < N) data[j] = c.d[i]; }
  }
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0.001 ? Math.min(4, 0.7 / peak) : 1; // bring quiet mics up to a usable level
  for (let i = 0; i < N; i++) data[i] *= gain;
  take.clip = { data, sr, pass: rec.pass };
  takeBuf = null;
  cancelRec();
  peaksCache.delete('take');
  render();
  flash('Recorded. It plays back next time round. Keep it, or tap Record to try again.');
}

// ---------- Song strip ----------
const cv = $('#timeline'), g = cv.getContext('2d');
const peaksCache = new Map();
function peaks(key, data, points) {
  if (!peaksCache.has(key)) {
    const out = new Float32Array(points), step = data.length / points;
    for (let p = 0; p < points; p++) {
      let m = 0;
      for (let i = Math.floor(p * step); i < Math.floor((p + 1) * step); i += 8) m = Math.max(m, Math.abs(data[i]));
      out[p] = m;
    }
    peaksCache.set(key, out);
  }
  return peaksCache.get(key);
}
function drawStrip() {
  const cs = getComputedStyle(document.documentElement), col = k => cs.getPropertyValue('--' + k).trim();
  const W = song.bars * BAR_W, H = STRIP_H, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const top = 20, laneH = (H - top - 6) / 4, bx = beat => beat * BAR_W / BEATS;
  const lanes = { drums: 0, bass: 1, lead: 2, voice: 3 };
  const laneCol = { drums: col('ink'), bass: col('ocean'), lead: col('aqua'), voice: col('blush') };
  const { L0, len } = loop(), muted = !takeEmpty();
  const used = new Set();
  for (const e of song.events) used.add(Math.floor(e.beat / BEATS));
  for (const c of song.clips) for (let b = Math.floor(c.beat / BEATS); b < (c.beat + c.beats) / BEATS; b++) used.add(b);

  g.font = '600 11px "Source Sans 3", system-ui, sans-serif';
  for (let i = 0; i < song.bars; i++) {
    const x = i * BAR_W, inSel = i >= sel.a && i <= sel.b;
    if (used.has(i)) { g.fillStyle = col('sky'); roundRect(x + 3, top, BAR_W - 6, H - top - 4, 6); g.fill(); }
    g.fillStyle = inSel ? col('ocean') : col('ink-muted');
    g.fillText(String(i + 1), x + 7, 14);
    g.strokeStyle = col('line'); g.lineWidth = 1;
    for (let b = 1; b < BEATS; b++) { g.beginPath(); g.moveTo(x + b * BAR_W / BEATS + 0.5, top + 4); g.lineTo(x + b * BAR_W / BEATS + 0.5, H - 8); g.stroke(); }
    if (i > 0) { g.strokeStyle = col('ink-muted'); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x + 0.5, 4); g.lineTo(x + 0.5, H - 4); g.stroke(); g.globalAlpha = 1; }
  }
  // Selection
  g.fillStyle = col('ocean'); g.globalAlpha = 0.14;
  roundRect(sel.a * BAR_W + 1, 2, (sel.b - sel.a + 1) * BAR_W - 2, H - 4, 8); g.fill();
  g.globalAlpha = 1; g.strokeStyle = col('ocean'); g.lineWidth = 2; g.stroke();

  const mark = (which, beat, n, dur, alpha) => {
    const y = top + lanes[which] * laneH;
    g.globalAlpha = alpha; g.fillStyle = laneCol[which];
    if (which === 'drums') g.fillRect(bx(beat) + 1, y + 2 + (n % 4) * (laneH - 4) / 4, 3, Math.max(2, (laneH - 4) / 4 - 1));
    else g.fillRect(bx(beat) + 1, y + 1 + (1 - (n % 12) / 11) * (laneH - 5), Math.max(3, bx(dur) - 2), 3);
  };
  for (const e of song.events) mark(e.inst, e.beat, e.n, e.dur, muted && e.inst === inst && e.beat >= L0 && e.beat < L0 + len ? 0.2 : 1);
  for (const e of take.events) mark(inst, L0 + e.lb, e.n, e.dur, 0.6);
  const wave = (key, data, beat, beats, alpha) => {
    const y = top + 3 * laneH, x0 = bx(beat), w = bx(beats), pk = peaks(key, data, Math.max(1, Math.floor(w / 2)));
    g.globalAlpha = alpha; g.fillStyle = laneCol.voice;
    for (let p = 0; p < pk.length; p++) { const h = Math.max(1, pk[p] * (laneH - 2)); g.fillRect(x0 + p * 2, y + (laneH - h) / 2, 1.5, h); }
  };
  for (const c of song.clips) { const a = clipAudio.get(c.id); if (a) wave(c.id, a.data, c.beat, c.beats, muted && inst === 'voice' && c.beat >= L0 && c.beat < L0 + len ? 0.2 : 1); }
  if (take.clip) wave('take', take.clip.data, L0, len, 0.6);
  g.globalAlpha = 1;

  if (play && ctx) {
    const e = elapsedAt(ctx.currentTime - outLat());
    if (e >= 0) {
      const x = bx(play.L0 + (e % play.len));
      if (rec && rec.on) { g.fillStyle = col('danger'); g.globalAlpha = 0.12; g.fillRect(bx(play.L0), 2, bx(play.len), H - 4); g.globalAlpha = 1; }
      g.fillStyle = rec && rec.on ? col('danger') : col('ink');
      g.fillRect(x - 1, 2, 2, H - 4);
    }
  }
}
function roundRect(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function frame() {
  drawStrip();
  if (rec) updateStatus();
  if (play) requestAnimationFrame(frame); else frameOn = false;
}

cv.addEventListener('click', async e => {
  const i = Math.floor(e.offsetX / BAR_W);
  if (i < 0 || i >= song.bars) return;
  let next;
  if (stretchNext && i !== sel.a) { next = { a: Math.min(i, sel.a), b: Math.max(i, sel.a) }; stretchNext = false; }
  else { next = { a: i, b: i }; stretchNext = true; }
  if (next.a === sel.a && next.b === sel.b) return render();
  if (!await okToDropTake()) return;
  const wasPlaying = !!play;
  if (wasPlaying) stopPlay();
  sel = next;
  if (wasPlaying) startPlay();
  render();
});

// ---------- Screen ----------
let flashMsg = null, flashTimer = 0;
function flash(msg) { flashMsg = msg; clearTimeout(flashTimer); flashTimer = setTimeout(() => { flashMsg = null; updateStatus(); }, 3500); render(); }
function say(msg) { flash(msg); }
function updateStatus() {
  const st = $('#status'), bars = barsLabel(), Bars = bars[0].toUpperCase() + bars.slice(1);
  let html;
  if (rec) {
    if (rec.on) html = '<b>Recording…</b> one time round, then it plays back.';
    else {
      const left = Math.max(0, Math.ceil((rec.T0 - ctx.currentTime) / spb()));
      html = `<b>Get ready: ${left}</b> Recording starts at the top of the loop.`;
    }
  } else if (flashMsg) html = flashMsg;
  else if (!play) html = `<b>${Bars}</b> selected. Press Play to loop ${sel.a === sel.b ? 'it' : 'them'}${stretchNext ? ', or tap another bar to stretch the selection' : ''}.`;
  else if (!takeEmpty()) html = inst === 'voice' ? '<b>Take recorded.</b> Keep it, or Record again.' : `<b>${take.events.length} ${inst === 'drums' ? 'hit' : 'note'}${take.events.length === 1 ? '' : 's'} so far.</b> Keep it, keep adding, or Undo.`;
  else html = inst === 'voice' ? `<b>Looping ${bars}.</b> Tap Record to record one time round.` : `<b>Looping ${bars}.</b> Play the ${inst} along with it.`;
  if (st.innerHTML !== html) st.innerHTML = html;
}
function render() {
  $('#tempoBtn').textContent = `${song.bpm} BPM · ${song.bars} bars`;
  const pb = $('#playBtn');
  pb.classList.toggle('playing', !!play);
  pb.querySelector('.ic').textContent = play ? '■' : '▶';
  pb.querySelector('.tx').textContent = play ? 'Stop' : 'Play';
  $('#keepBtn').disabled = takeEmpty() || !!rec;
  $('#keepBtn').classList.toggle('ready', !takeEmpty() && !rec);
  $('#undoBtn').disabled = takeEmpty();
  $('#clearBtn').disabled = takeEmpty();
  for (const t of document.querySelectorAll('#tabs button')) t.setAttribute('aria-selected', t.dataset.inst === inst);
  const rb = $('#recBtn');
  rb.classList.toggle('armed', !!rec && !rec.on);
  rb.classList.toggle('rec', !!rec && rec.on);
  rb.setAttribute('aria-label', rec ? 'Cancel recording' : 'Record');
  updateStatus();
  drawStrip();
}

function buildSounds() {
  const box = $('#sounds');
  box.innerHTML = '';
  box.style.visibility = inst === 'voice' ? 'hidden' : '';
  if (inst === 'voice') return;
  const list = inst === 'drums' ? KITS : SYNTHS[inst];
  for (const id in list) {
    const b = document.createElement('button');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', song.sound[inst] === id);
    b.textContent = list[id].name;
    b.onclick = () => {
      song.sound[inst] = id; save();
      for (const x of box.children) x.setAttribute('aria-checked', x === b);
      audio();
      if (!play) { if (inst === 'drums') playDrum(0, id, ctx.currentTime); else synthNote(inst, id, song.oct[inst] + 7, ctx.currentTime).stop(ctx.currentTime + 0.35); }
    };
    box.appendChild(b);
  }
}

function buildPads() {
  const box = $('#pads');
  PADS.forEach((name, n) => {
    const b = document.createElement('button');
    b.className = 'pad'; b.dataset.n = n; b.textContent = name;
    b.addEventListener('pointerdown', e => { e.preventDefault(); hitPad(n); });
    box.appendChild(b);
  });
}

const WHITE = [0, 2, 4, 5, 7, 9, 11], BLACK = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]]; // [semitone, white keys to its left]
const keyEl = midi => document.querySelector(`#keyboard [data-midi="${midi}"]`);
function buildKeyboard() {
  const box = $('#keyboard'), base = song.oct[inst];
  box.innerHTML = '';
  for (const s of WHITE) {
    const k = document.createElement('div');
    k.className = 'wkey'; k.dataset.midi = base + s;
    k.textContent = s === 0 ? noteName(base) : NOTE_NAMES[s];
    box.appendChild(k);
  }
  for (const [s, left] of BLACK) {
    const k = document.createElement('div');
    k.className = 'bkey'; k.dataset.midi = base + s;
    k.style.left = `calc(${left * 100 / 7}% - 4.75%)`;
    box.appendChild(k);
  }
  $('#octLabel').textContent = noteName(base);
  $('#octDown').disabled = base <= OCT_RANGE[inst][0];
  $('#octUp').disabled = base >= OCT_RANGE[inst][1];
}
// Fingers can slide across keys; each finger plays one note at a time.
const fingers = new Map();
const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#keyboard [data-midi]') ? +el.closest('[data-midi]').dataset.midi : null; };
$('#keyboard').addEventListener('pointerdown', e => {
  e.preventDefault();
  $('#keyboard').setPointerCapture(e.pointerId);
  const m = keyAt(e.clientX, e.clientY);
  fingers.set(e.pointerId, m);
  if (m !== null) noteOn(m);
});
$('#keyboard').addEventListener('pointermove', e => {
  if (!fingers.has(e.pointerId)) return;
  const m = keyAt(e.clientX, e.clientY), old = fingers.get(e.pointerId);
  if (m === old) return;
  if (old !== null) noteOff(old);
  if (m !== null) noteOn(m);
  fingers.set(e.pointerId, m);
});
const liftFinger = e => {
  if (!fingers.has(e.pointerId)) return;
  const m = fingers.get(e.pointerId);
  fingers.delete(e.pointerId);
  if (m !== null) noteOff(m);
};
$('#keyboard').addEventListener('pointerup', liftFinger);
$('#keyboard').addEventListener('pointercancel', liftFinger);

function moveOctave(dir) {
  if (inst !== 'bass' && inst !== 'lead') return;
  const [lo, hi] = OCT_RANGE[inst], next = song.oct[inst] + dir * 12;
  if (next < lo || next > hi) return;
  releaseAllKeys(); fingers.clear();
  song.oct[inst] = next; save();
  buildKeyboard();
}
$('#octUp').onclick = () => moveOctave(1);
$('#octDown').onclick = () => moveOctave(-1);

async function setInst(next) {
  if (next === inst) return;
  if (!await okToDropTake()) return;
  releaseAllKeys(); fingers.clear();
  inst = next;
  $('#drumsPanel').hidden = inst !== 'drums';
  $('#keysPanel').hidden = inst !== 'bass' && inst !== 'lead';
  $('#voicePanel').hidden = inst !== 'voice';
  if (!$('#keysPanel').hidden) buildKeyboard();
  buildSounds();
  render();
}
for (const t of document.querySelectorAll('#tabs button')) t.onclick = () => setInst(t.dataset.inst);

$('#playBtn').onclick = () => (play ? stopPlay() : startPlay());
$('#keepBtn').onclick = keep;
$('#undoBtn').onclick = undoPass;
$('#clearBtn').onclick = () => { if (rec) cancelRec(); clearTake(); };
$('#eraseBtn').onclick = erase;
$('#recBtn').onclick = toggleRecord;

for (const [id, key] of [['#fxReverb', 'reverb'], ['#fxEcho', 'echo']]) {
  $(id).value = song.fx[key];
  $(id).oninput = () => { song.fx[key] = +$(id).value; applyFx(); save(); };
}
$('#fxRadio').checked = song.fx.radio;
$('#fxRadio').onchange = () => { song.fx.radio = $('#fxRadio').checked; applyFx(); save(); };

// ---------- Dialogs ----------
function ask(text, yes) {
  return new Promise(res => {
    const d = $('#confirm');
    $('#confirmText').textContent = text;
    $('#confirmYes').textContent = yes;
    d.returnValue = '';
    d.onclose = () => res(d.returnValue === 'yes');
    d.showModal();
  });
}
function lastUsedBar() {
  let last = 0;
  for (const e of song.events) last = Math.max(last, Math.floor(e.beat / BEATS) + 1);
  for (const c of song.clips) last = Math.max(last, Math.ceil((c.beat + c.beats) / BEATS));
  return last;
}
function openSettings() {
  stopPlay();
  $('#bpmOut').textContent = song.bpm + ' BPM';
  $('#clickChk').checked = song.click;
  $('#snapChk').checked = song.snap;
  const used = lastUsedBar();
  for (const o of $('#barsSel').options) o.disabled = +o.value < used;
  $('#barsSel').value = song.bars;
  $('#settings').showModal();
}
$('#tempoBtn').onclick = openSettings;
$('#settingsBtn').onclick = openSettings;
const setBpm = d => { song.bpm = Math.max(70, Math.min(170, song.bpm + d)); $('#bpmOut').textContent = song.bpm + ' BPM'; save(); render(); };
$('#bpmDown').onclick = () => setBpm(-5);
$('#bpmUp').onclick = () => setBpm(5);
$('#barsSel').onchange = () => {
  song.bars = +$('#barsSel').value;
  if (sel.b >= song.bars) sel = { a: 0, b: 0 };
  save(); render();
};
$('#clickChk').onchange = () => { song.click = $('#clickChk').checked; save(); };
$('#snapChk').onchange = () => { song.snap = $('#snapChk').checked; save(); };
$('#newSongBtn').onclick = async () => {
  $('#settings').close();
  if (!await ask('Start a new song? Everything in this one will be deleted.', 'Start new song')) return;
  song = blankSong(); save();
  clipAudio.clear(); bufCache.clear(); peaksCache.clear();
  idb.clear().catch(() => {});
  clearTake();
  sel = { a: 0, b: 1 }; stretchNext = false;
  $('#fxReverb').value = song.fx.reverb; $('#fxEcho').value = song.fx.echo; $('#fxRadio').checked = song.fx.radio;
  applyFx();
  buildSounds();
  render();
};
$('#ver').textContent = VERSION;

// ---------- Computer keyboard (for testing on a laptop) ----------
const PIANO_KEYS = 'awsedftgyhuj', DRUM_KEYS = 'qwerasdf';
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); return play ? stopPlay() : startPlay(); }
  if (k === 'enter') { e.preventDefault(); return keep(); }
  if (inst === 'drums') {
    const n = DRUM_KEYS.indexOf(k) >= 0 ? DRUM_KEYS.indexOf(k) : '12345678'.indexOf(k);
    if (n >= 0) hitPad(n);
  } else if (inst === 'bass' || inst === 'lead') {
    if (k === 'z') return moveOctave(-1);
    if (k === 'x') return moveOctave(1);
    const s = PIANO_KEYS.indexOf(k);
    if (s >= 0) noteOn(song.oct[inst] + s);
  }
});
document.addEventListener('keyup', e => {
  const s = PIANO_KEYS.indexOf(e.key.toLowerCase());
  if (s >= 0 && (inst === 'bass' || inst === 'lead')) noteOff(song.oct[inst] + s);
});
window.addEventListener('resize', drawStrip);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawStrip);

// ---------- Start ----------
buildPads();
buildSounds();
render();
Promise.all(song.clips.map(c => idb.get(c.id).then(a => { if (a) clipAudio.set(c.id, a); }).catch(() => {})))
  .then(() => {
    const missing = song.clips.filter(c => !clipAudio.has(c.id));
    if (missing.length) { song.clips = song.clips.filter(c => clipAudio.has(c.id)); save(); flash('Some voice recordings couldn’t be loaded from this device, so they were removed.'); }
    render();
  });
