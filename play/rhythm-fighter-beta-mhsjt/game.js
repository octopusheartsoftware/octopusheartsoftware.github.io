'use strict';
// Rhythm Fighter, playable test: one opponent, three tap zones, attacks that land on the beat.
// Everything is timed from the audio clock so sound, pictures and judging agree.

const $ = s => document.querySelector(s);
const stage = $('#stage'), canvas = $('#game'), g = canvas.getContext('2d');

// ---------- Settings remembered on this device ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('rf.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rf.' + k, JSON.stringify(v)); } catch {} },
};
const settings = { bpm: store.get('bpm', 100), offset: store.get('offset', 0), zones: store.get('zones', true), sound: store.get('sound', true) };

// ---------- Tuning ----------
const PERFECT = 0.07, OK = 0.16;          // seconds either side of the moment a punch lands
const ZONE_SPLIT = 0.655;                  // Dodge strip starts this far down the screen
const DMG = { jab: 7, heavy: 20, guardBreak: 10, punch: 3, beatPunch: 6 };
const FOE_HP = 150;
const TELL = { jab: 1, heavy: 2 };         // beats of warning before each attack lands
const RECOVER = { jab: 0.45, heavy: 0.7 }; // beats he needs to get his guard back
// Fight script: 8 beats per phrase. - rest, J jab, H big swing, O taunt (guard down for 2 beats)
const OPENING = ['--J---J-', '-----H--', '--J-O---'];
const PHRASES = [
  ['--J---J-', '-----H--', '--J-O---', '---J-J--'], // health above 60
  ['-J-J--H-', 'J---O---', '--J-J-J-', '---H----'], // 30 to 60
  ['JJ--H---', 'J-J--H--', '-JJJ-O--'],             // below 30
];

const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - (1 - t) * (1 - t), easeIn = t => t * t, easeInOut = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);

// ---------- Sound (made in code for now; Michael's own sounds replace these later) ----------
let ctx = null, master, noiseBuf;
function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = settings.sound ? 0.8 : 0;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function env(node, t, peak, attack, decay) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function tone(t, type, f0, f1, dur, vol) {
  const o = ctx.createOscillator(), a = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(a, t, vol, 0.003, dur);
  o.connect(a).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(t, dur, vol, type, freq, freqEnd, q = 1) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  env(a, t, vol, 0.004, dur);
  s.connect(f).connect(a).connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  return s;
}
const sfx = {
  kick: t => tone(t, 'sine', 140, 45, 0.16, 0.55),
  hat: t => noise(t, 0.035, 0.08, 'highpass', 7000),
  bass: (t, f, dur) => tone(t, 'triangle', f, f, dur, 0.2),
  click: (t, accent) => tone(t, 'square', accent ? 1500 : 1000, accent ? 1500 : 1000, 0.03, 0.18),
  jabCue: t => [tone(t, 'square', 1250, 1250, 0.035, 0.1), tone(t, 'sine', 620, 620, 0.07, 0.25)],
  heavyCue(t0, t1) { // the "uplifter": filtered noise and a saw that both rise until the swing lands
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(6000, t1);
    a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(0.35, t1 - 0.02); a.gain.linearRampToValueAtTime(0, t1);
    s.connect(f).connect(a).connect(master); s.start(t0); s.stop(t1 + 0.05);
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), b = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    b.gain.setValueAtTime(0.0001, t0); b.gain.exponentialRampToValueAtTime(0.12, t1 - 0.02); b.gain.linearRampToValueAtTime(0, t1);
    o.connect(lp).connect(b).connect(master); o.start(t0); o.stop(t1 + 0.05);
    return [s, o];
  },
  block(t) { tone(t, 'sine', 180, 70, 0.12, 0.5); noise(t, 0.05, 0.25, 'bandpass', 1800); },
  perfect(t) { tone(t, 'triangle', 1320, 1320, 0.18, 0.18); tone(t + 0.05, 'triangle', 1760, 1760, 0.2, 0.14); },
  dodge: t => noise(t, 0.22, 0.3, 'bandpass', 2500, 400, 2),
  hurt(t) { noise(t, 0.25, 0.6, 'lowpass', 1200, 200); tone(t, 'sawtooth', 160, 50, 0.25, 0.25); },
  punch(t) { noise(t, 0.08, 0.45, 'lowpass', 2500, 500); tone(t, 'sine', 220, 80, 0.1, 0.4); },
  beatPunch(t) { sfx.punch(t); tone(t, 'triangle', 990, 990, 0.12, 0.2); },
  guarded(t) { tone(t, 'square', 300, 200, 0.05, 0.12); noise(t, 0.04, 0.2, 'highpass', 3000); },
  bell(t) { for (const [f, v] of [[880, 0.3], [1320, 0.15], [2200, 0.07]]) tone(t, 'sine', f, f, 1.6, v); },
  thud(t) { tone(t, 'sine', 90, 30, 0.5, 0.6); noise(t, 0.3, 0.3, 'lowpass', 600, 100); },
};
const BASSLINE = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49];

// ---------- Poses ----------
// A pose is a handful of numbers: body position and lean, head offset and tilt,
// and where each glove is (l = screen-left glove, r = screen-right glove; s = how close to you).
// The arms bend to reach the gloves on their own, and the game slides smoothly between poses.
const BASE = { x: 0, y: 0, rot: 0, hx: 0, hy: 0, hr: 0, lx: -32, ly: -58, ls: 1, rx: 30, ry: -52, rs: 1, glow: 0, spark: 0 };
const P = o => Object.assign({}, BASE, o);
const POSE = {
  guard: P({}),
  guardTight: P({ y: 5, lx: -16, ly: -66, ls: 1.1, rx: 16, ry: -64, rs: 1.1 }),
  jabCock: P({ rot: 0.06, x: 6, rx: 78, ry: -22, rs: 0.9, spark: 1 }),
  jabHit: P({ rot: -0.04, x: -4, rx: 6, ry: -34, rs: 3.0, ly: -50 }),
  heavyWind: P({ rot: -0.22, x: -25, y: -6, hr: -0.1, lx: -132, ly: -112, ls: 1.15, rx: 40, ry: -62, glow: 1 }),
  heavyMid: P({ rot: 0.05, x: -10, lx: -70, ly: -40, ls: 2.4, glow: 1 }),
  heavyHit: P({ rot: 0.28, x: 25, hr: 0.12, lx: 90, ly: -10, ls: 3.4, glow: 0.6 }),
  open: P({ y: 16, rot: 0.04, hr: 0.22, hy: 6, lx: -62, ly: 120, ls: 0.9, rx: 64, ry: 125, rs: 0.9 }),
  taunt: P({ y: -4, hr: -0.12, hy: -4, lx: -122, ly: 40, rx: 122, ry: 40 }),
  hitReact: P({ y: 8, rot: -0.06, hx: 12, hy: -10, hr: 0.35, lx: -70, ly: 100, rx: 72, ry: 95 }),
  ko: P({ y: 520, rot: 0.5, hr: 0.6, lx: -90, ly: 200, rx: 90, ry: 180 }),
};
// Each attack as key poses, measured in beats from the moment it lands.
const ANIM = {
  jab: [[-1, POSE.guard], [-0.2, POSE.jabCock, easeOut], [0, POSE.jabHit, easeIn], [0.45, POSE.guard, easeOut]],
  heavy: [[-2, POSE.guard], [-0.3, POSE.heavyWind, easeOut], [-0.1, POSE.heavyMid, easeIn], [0, POSE.heavyHit, easeIn], [0.7, POSE.guard, easeInOut]],
};
function mix(a, b, t) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; }
function track(keys, x) {
  if (x <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [x0, p0] = keys[i - 1], [x1, p1, ease] = keys[i];
      return mix(p0, p1, (ease || easeInOut)((x - x0) / (x1 - x0)));
    }
  }
  return { ...keys[keys.length - 1][1] };
}

// ---------- Game state ----------
let mode = 'menu', paused = false, game = null, cal = null;
let pose = { ...POSE.guard };
const view = { W: 400, H: 800, scale: 1, k: 1, dpr: 1 };
const taught = {};

function newGame() {
  const spb = 60 / settings.bpm;
  game = {
    spb, start: ctx.currentTime + 0.4, moves: [], nextFill: 4, phrase: OPENING.join('').split(''), lastPhrase: '',
    stunUntil: -1, me: 100, foe: FOE_HP, musicBeat: 0, lastCount: -1,
    player: { type: 'idle', t0: -9, side: 1 }, punchSide: 1, busyUntil: 0, punchReady: 0,
    hitReact: -9, hitSide: 1, guardTight: -9, shake: 0, hurtAt: -9, flashes: {}, texts: [],
    over: null, overAt: 0, shown: false,
    stats: { perfect: 0, blocks: 0, dodges: 0, hitsTaken: 0, punches: 0, onBeat: 0 },
  };
}
const beatAt = t => (t - game.start) / game.spb;
const timeAt = b => game.start + b * game.spb;
const clock = () => ctx ? ctx.currentTime : performance.now() / 1000;

function pickPhrase() {
  const pct = game.foe / FOE_HP * 100, tier = pct > 60 ? 0 : pct > 30 ? 1 : 2;
  const pool = PHRASES.slice(0, tier + 1).flat().concat(PHRASES[tier]).filter(p => p !== game.lastPhrase);
  return (game.lastPhrase = pool[Math.floor(Math.random() * pool.length)]);
}
function addMove(type, b) {
  const m = { type, hit: b, tellStart: b - TELL[type], time: timeAt(b), resolved: false, cancelled: false, nodes: [] };
  m.nodes = type === 'jab' ? sfx.jabCue(timeAt(m.tellStart)) : sfx.heavyCue(timeAt(m.tellStart), m.time);
  game.moves.push(m);
  return m;
}
function cancel(m) {
  m.cancelled = m.resolved = true;
  for (const n of m.nodes) try { n.stop(); } catch {}
}
function fillAhead(nb) {
  while (game.nextFill <= nb + 6) {
    if (!game.phrase.length) game.phrase = pickPhrase().split('');
    const tok = game.phrase.shift(), b = game.nextFill++;
    if (tok === 'J') addMove('jab', b);
    else if (tok === 'H') addMove('heavy', b);
    else if (tok === 'O') game.moves.push({ type: 'taunt', hit: b, end: b + 2, resolved: true, cancelled: false, nodes: [] });
  }
}
// He's dazed: clear what he had planned and pick up the script again afterwards.
function stun(nb, beats) {
  game.stunUntil = Math.max(game.stunUntil, nb + beats);
  for (const m of game.moves) if (!m.cancelled && (m.hit > nb || m.type === 'taunt') && !(m.resolved && m.type !== 'taunt')) cancel(m);
  game.nextFill = Math.ceil(game.stunUntil) + 1;
  game.phrase = [];
}
const tauntAt = nb => game.moves.find(m => m.type === 'taunt' && !m.cancelled && nb >= m.hit && nb < m.end);
const isOpen = nb => nb < game.stunUntil || !!tauntAt(nb);
const activeMove = nb => game.moves.find(m => m.type !== 'taunt' && !m.cancelled && nb >= m.tellStart && nb <= m.hit + RECOVER[m.type]);

// ---------- Player actions ----------
function act(action) {
  if (mode !== 'fight' || paused || !game || game.over) return;
  const real = ctx.currentTime, t = real - settings.offset, nb = beatAt(t);
  game.flashes[action] = real;
  if (nb < 3) return; // no fighting during the countdown
  if (action === 'attack') return attack(real, nb);
  if (real < game.busyUntil) return;
  game.player = { type: action, t0: real, side: 1 };
  let m = null, best = OK;
  for (const c of game.moves) {
    if (c.resolved || c.type === 'taunt') continue;
    const d = Math.abs(c.time - t);
    if (d <= best) { best = d; m = c; }
  }
  if (!m) { // nothing coming: a wasted move leaves you briefly stuck
    game.busyUntil = real + 0.4;
    if (action === 'dodge') sfx.dodge(real);
    return;
  }
  m.resolved = true;
  game.busyUntil = real + 0.25;
  const perfect = best <= PERFECT;
  if (action === 'block' && m.type === 'jab') {
    sfx.block(real); game.stats.blocks++;
    if (perfect) { sfx.perfect(real); game.stats.perfect++; say('PERFECT BLOCK', { color: '#9fe8ff' }); stun(nb, 1); opening(); }
    else say('BLOCK', { color: '#cfd8ff' });
  } else if (action === 'dodge' && m.type === 'heavy') {
    sfx.dodge(real); game.stats.dodges++;
    if (perfect) { sfx.perfect(real); game.stats.perfect++; say('PERFECT DODGE', { color: '#9fe8ff' }); stun(nb, 3); }
    else { say('DODGE!', { color: '#b9f5c4' }); stun(nb, 2); }
    opening();
  } else if (action === 'block') {
    hurt(DMG.guardBreak, 'GUARD BROKEN', 'heavyBlock');
  } else {
    hurt(DMG.jab, 'TOO SLOW', 'jabDodge');
  }
}
function opening() {
  say('OPENING!', { color: '#ffd27a' });
  teach('opening', 'He’s open! Tap Attack now.\nPunches on the beat do double damage.');
}
function attack(real, nb) {
  if (real < game.punchReady) return;
  game.punchReady = real + 0.15;
  game.punchSide = -game.punchSide;
  game.player = { type: 'punch', t0: real, side: game.punchSide };
  game.stats.punches++;
  if (isOpen(nb)) {
    const taunt = tauntAt(nb);
    if (taunt) { taunt.cancelled = true; game.stunUntil = Math.max(game.stunUntil, taunt.end); }
    const onBeat = Math.abs(nb - Math.round(nb)) * game.spb <= 0.08;
    game.foe = Math.max(0, game.foe - (onBeat ? DMG.beatPunch : DMG.punch));
    game.hitReact = real; game.hitSide = game.punchSide;
    if (onBeat) { sfx.beatPunch(real); game.stats.onBeat++; say('ON BEAT ×2', { color: '#ffd27a' }); } else sfx.punch(real);
    if (game.foe <= 0) finish('win');
  } else {
    sfx.guarded(real);
    game.guardTight = real;
    say('GUARDED', { color: '#aab0c8', size: 22 });
    teach('guarded', 'He’s guarding, and he’ll punish that.\nWait for an opening first.');
    counter(nb);
  }
}
// Punch into his guard and he answers with a jab two beats later (if he isn't busy).
function counter(nb) {
  const b = Math.floor(nb) + 2;
  if (game.moves.some(m => !m.cancelled && m.type !== 'taunt' && m.hit >= b - 2 && m.hit <= b + 1)) return;
  for (const m of game.moves) if (!m.cancelled && m.hit > b && m.hit <= b + 2) cancel(m);
  addMove('jab', b);
}
function hurt(dmg, label, lesson) {
  const real = ctx.currentTime;
  game.me = Math.max(0, game.me - dmg);
  game.shake = 1; game.hurtAt = real; game.stats.hitsTaken++;
  sfx.hurt(real);
  say(label, { color: '#ff8f8f' });
  const lessons = {
    heavyBlock: 'Big glowing swings break your guard.\nDodge those instead!',
    jabDodge: 'Quick jabs are too fast to dodge.\nBlock those instead!',
    heavyHit: 'Orange glow + rising whoosh = big swing.\nTap Dodge as it lands.',
    jabHit: 'Glint + wooden tock = quick jab.\nTap Block as it lands.',
  };
  if (lesson) teach(lesson, lessons[lesson]);
  if (game.me <= 0) finish('lose');
}
function finish(result) {
  const real = ctx.currentTime;
  game.over = result; game.overAt = real;
  for (const m of game.moves) if (!m.resolved || m.type === 'taunt') cancel(m);
  if (result === 'win') { sfx.bell(real + 0.1); say('K.O.!', { where: 'big', color: '#ffd27a', life: 2 }); }
  else { sfx.thud(real); say('DOWN!', { where: 'big', color: '#ff8f8f', life: 2 }); }
}

// ---------- Floating words ----------
function say(text, o = {}) { game.texts.push({ text, t0: clock(), color: o.color || '#fff', size: o.size || 30, where: o.where || 'low', life: o.life || 0.8 }); }
function teach(key, text) {
  if (taught[key]) return;
  taught[key] = true;
  game.texts = game.texts.filter(x => x.where !== 'teach');
  say(text, { where: 'teach', size: 17, life: 3.2, color: '#fff6ea' });
}

// ---------- Each frame ----------
function update() {
  const now = ctx.currentTime, nb = beatAt(now);
  // music: kick on the beat, hats between, a little bassline
  while (!game.over && timeAt(game.musicBeat) < now + 0.25) {
    const b = game.musicBeat, t = timeAt(b);
    if (b >= 0) {
      sfx.kick(t); sfx.hat(t + game.spb / 2);
      if (b >= 4) sfx.bass(t, BASSLINE[b % 8], game.spb * 0.5);
    }
    game.musicBeat++;
  }
  if (nb >= 0 && nb < 4 && Math.floor(nb) !== game.lastCount) {
    game.lastCount = Math.floor(nb);
    say(['3', '2', '1', 'FIGHT!'][game.lastCount], { where: 'big', color: game.lastCount === 3 ? '#ffd27a' : '#fff', life: game.spb * 0.9 });
  }
  if (game.over) {
    if (!game.shown && now - game.overAt > 2.2) { game.shown = true; showEnd(); }
    return;
  }
  fillAhead(nb);
  // anything not blocked or dodged in time lands
  for (const m of game.moves) {
    if (m.resolved || m.type === 'taunt' || now - settings.offset <= m.time + OK) continue;
    m.resolved = true;
    hurt(DMG[m.type], m.type === 'heavy' ? 'OOF!' : 'OUCH', m.type === 'heavy' ? 'heavyHit' : 'jabHit');
    if (game.over) return;
  }
  game.moves = game.moves.filter(m => (m.end || m.hit) > nb - 4);
}

function targetPose(now, nb) {
  if (game.over === 'win') return mix(POSE.hitReact, POSE.ko, easeIn(clamp((now - game.overAt) / 0.9, 0, 1)));
  if (game.over === 'lose') return POSE.taunt;
  if (now - game.hitReact < 0.22) {
    const s = game.hitSide;
    return { ...POSE.hitReact, hx: POSE.hitReact.hx * s, hr: POSE.hitReact.hr * s, rot: POSE.hitReact.rot * s };
  }
  if (nb < game.stunUntil) { const p = { ...POSE.open }; p.x += Math.sin(now * 3) * 8; p.hr += Math.sin(now * 3) * 0.08; return p; }
  const m = activeMove(nb);
  if (m) {
    const p = track(ANIM[m.type], nb - m.hit);
    if (m.type === 'heavy' && nb - m.hit < -0.3) p.x += Math.sin(now * 70) * 2.5; // trembling wind-up
    return p;
  }
  if (tauntAt(nb)) return POSE.taunt;
  if (now - game.guardTight < 0.25) return POSE.guardTight;
  return bobbing(nb);
}
function beatDip(nb) { const d = nb - Math.round(nb); return Math.exp(-d * d * 30); }
function bobbing(nb) { const b = beatDip(nb); return { ...POSE.guard, y: b * 5, ly: POSE.guard.ly + b * 3, ry: POSE.guard.ry + b * 3 }; }

// ---------- Drawing ----------
const COLORS = { body: '#0f1226', glove: '#1d2244', hot: '#3a1f2a', trunks: '#3b1c3c', belt: '#6b3a5a' };

function resize() {
  const r = stage.getBoundingClientRect();
  view.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * view.dpr);
  canvas.height = Math.round(r.height * view.dpr);
  view.scale = r.width / view.W;
  view.H = r.height / view.scale;
  view.k = clamp(view.H / 780, 0.8, 1.2);
}

function drawBackground(ox, oy) {
  const { W, H } = view, horizon = H * 0.62;
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#141b38'); sky.addColorStop(0.55, '#3b3f74'); sky.addColorStop(1, '#e0876a');
  g.fillStyle = sky; g.fillRect(-60, -60, W + 120, horizon + 60);
  const glow = g.createRadialGradient(200 + ox, H * 0.3 + oy, 10, 200 + ox, H * 0.3 + oy, 210);
  glow.addColorStop(0, 'rgba(255,222,176,0.95)'); glow.addColorStop(0.5, 'rgba(246,190,140,0.45)'); glow.addColorStop(1, 'rgba(246,190,140,0)');
  g.fillStyle = glow; g.fillRect(-60, -60, W + 120, H + 120);
  g.fillStyle = '#1a1530'; g.fillRect(-60, horizon + oy, W + 120, H);
  // ring ropes and posts
  g.strokeStyle = '#120f22'; g.lineWidth = 5;
  for (const f of [0.45, 0.51, 0.57]) {
    const y = H * f + oy;
    g.beginPath(); g.moveTo(-60, y); g.quadraticCurveTo(200 + ox, y + 14, W + 60, y); g.stroke();
  }
  g.fillStyle = '#120f22';
  g.fillRect(12 + ox * 0.6, H * 0.42 + oy, 12, H * 0.22);
  g.fillRect(W - 24 + ox * 0.6, H * 0.42 + oy, 12, H * 0.22);
}

function drawOpponent(p, ox, oy) {
  const k = view.k;
  g.save();
  g.translate(200 + ox + p.x * k, view.H * 0.34 + oy + p.y * k);
  g.scale(k, k);
  g.translate(0, 220); g.rotate(p.rot); g.translate(0, -220); // lean from the hips
  // Shapes go in layers (body, then each arm), and each layer gets its own outline,
  // so arms stay readable when they cross in front of the body.
  let shapes = [];
  const layers = [shapes], gloves = [];
  const poly = (pts, fill) => shapes.push({ fill, build() { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); } });
  const ell = (x, y, rx, ry, fill, r = 0) => shapes.push({ fill, build() { g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); } });
  const limb = (x1, y1, x2, y2, w1, w2, fill) => {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    poly([x1 + nx * w1 / 2, y1 + ny * w1 / 2, x2 + nx * w2 / 2, y2 + ny * w2 / 2, x2 - nx * w2 / 2, y2 - ny * w2 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2], fill);
    ell(x1, y1, w1 / 2, w1 / 2, fill); ell(x2, y2, w2 / 2, w2 / 2, fill);
  };
  // body: torso, trunks, belt, neck, shoulders
  poly([-80, -2, 80, -2, 72, 40, 50, 150, -50, 150, -72, 40], 'body');
  poly([-50, 148, 50, 148, 60, 340, -60, 340], 'trunks');
  poly([-51, 146, 51, 146, 52, 160, -52, 160], 'belt');
  poly([-18, 0, 18, 0, 15, -36, -15, -36], 'body');
  ell(-70, 10, 26, 24, 'body'); ell(70, 10, 26, 24, 'body');
  // head (flat-top, ears, square jaw), tilted by the pose
  const hx = p.hx, hy = -66 + p.hy, c = Math.cos(p.hr), s = Math.sin(p.hr);
  const H = (pts) => pts.map((v, i) => i % 2 ? hy + pts[i - 1] * s + v * c : hx + v * c - pts[i + 1] * s);
  const hp = (x, y) => [hx + x * c - y * s, hy + x * s + y * c];
  ell(hx, hy, 31, 38, 'body', p.hr);
  poly(H([-27, 6, 27, 6, 18, 38, -18, 38]), 'body');
  poly(H([-33, -47, 33, -47, 31, -22, -31, -22]), 'body');
  for (const side of [-1, 1]) { const [ex, ey] = hp(side * 31, 4); ell(ex, ey, 6, 10, 'body', p.hr); }
  // arms reach for the gloves; the closer glove is drawn on top
  const arm = (side, gx, gy, gs) => {
    const sx = side * 70, sy = 12, L1 = 72, L2 = 64;
    const d = clamp(Math.hypot(gx - sx, gy - sy), Math.abs(L1 - L2) + 1, L1 + L2 - 1);
    const a = Math.atan2(gy - sy, gx - sx), B = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const e1 = [sx + L1 * Math.cos(a + B), sy + L1 * Math.sin(a + B)], e2 = [sx + L1 * Math.cos(a - B), sy + L1 * Math.sin(a - B)];
    const e = e1[1] > e2[1] ? e1 : e2; // elbows bend downwards
    limb(sx, sy, e[0], e[1], 30, 25, 'body');
    limb(e[0], e[1], gx, gy, 24, 19 * Math.pow(gs, 0.6), 'body');
    const gf = p.glow > 0.3 && side < 0 ? 'hot' : 'glove';
    ell(gx, gy, 25 * gs, 23 * gs, gf);
    ell(gx - side * 17 * gs, gy - 3 * gs, 9 * gs, 12 * gs, gf);
    gloves.push({ x: gx, y: gy, s: gs });
  };
  const arms = [[-1, p.lx, p.ly, p.ls], [1, p.rx, p.ry, p.rs]].sort((a, b) => a[3] - b[3]);
  for (const a of arms) { layers.push(shapes = []); arm(...a); }

  // per layer: warm rim light around the outline (orange glow during a big swing), then flat fills
  g.lineJoin = 'round';
  const rim = p.glow > 0.01 ? `rgba(255,${Math.round(lerp(214, 140, p.glow))},${Math.round(lerp(170, 50, p.glow))},${lerp(0.55, 1, p.glow)})` : 'rgba(255,214,170,0.55)';
  layers.forEach((layer, i) => {
    g.lineWidth = i ? 4 : 6;
    g.strokeStyle = rim;
    if (p.glow > 0.01) { g.shadowColor = 'rgba(255,140,40,0.95)'; g.shadowBlur = 36 * p.glow * view.dpr * view.scale; }
    for (const sh of layer) { sh.build(); g.stroke(); }
    g.shadowBlur = 0;
    for (const sh of layer) { sh.build(); g.fillStyle = COLORS[sh.fill]; g.fill(); }
  });
  // pass 3: details
  g.fillStyle = '#ffe9c7';
  for (const side of [-1, 1]) {
    g.beginPath();
    const pts = H([side * 21, -10, side * 5, -5, side * 5, -1, side * 20, -5]);
    g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.13)';
  for (const gl of gloves) { g.beginPath(); g.ellipse(gl.x - 8 * gl.s, gl.y - 9 * gl.s, 9 * gl.s, 5 * gl.s, -0.6, 0, Math.PI * 2); g.fill(); }
  if (p.spark > 0.05) { // glint on the right glove as a jab winds up
    const r = 26 * p.spark;
    g.fillStyle = `rgba(255,255,255,${p.spark})`;
    g.beginPath();
    g.moveTo(p.rx, p.ry - r); g.lineTo(p.rx + r * 0.18, p.ry - r * 0.18); g.lineTo(p.rx + r, p.ry); g.lineTo(p.rx + r * 0.18, p.ry + r * 0.18);
    g.lineTo(p.rx, p.ry + r); g.lineTo(p.rx - r * 0.18, p.ry + r * 0.18); g.lineTo(p.rx - r, p.ry); g.lineTo(p.rx - r * 0.18, p.ry - r * 0.18);
    g.fill();
  }
  g.restore();
}

// Your own gloves, outlined, at the bottom of the screen
function drawPlayer(now, nb, oy) {
  const H = view.H, pl = game ? game.player : { type: 'idle', t0: -9 }, t = now - pl.t0;
  const bob = beatDip(nb) * 4;
  let L = { x: 92, y: H * 0.95 + bob, s: 1.3 }, R = { x: 308, y: H * 0.95 + bob, s: 1.3 };
  const to = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u) });
  if (pl.type === 'block' && t < 0.4) {
    const u = t < 0.06 ? easeOut(t / 0.06) : t > 0.3 ? 1 - (t - 0.3) / 0.1 : 1;
    L = to(L, { x: 165, y: H * 0.66, s: 1.6 }, u); R = to(R, { x: 235, y: H * 0.66, s: 1.6 }, u);
  }
  if (pl.type === 'punch' && t < 0.2) {
    const u = t < 0.07 ? easeOut(t / 0.07) : 1 - easeIn((t - 0.07) / 0.13), aim = { x: 200 + pl.side * 22, y: H * 0.34, s: 0.75 };
    if (pl.side < 0) L = to(L, aim, u); else R = to(R, aim, u);
  }
  if (game && game.over === 'lose') { const u = clamp((now - game.overAt) / 0.6, 0, 1); L.y += u * 200; R.y += u * 200; }
  g.save();
  g.translate(0, oy);
  g.lineJoin = 'round';
  for (const [gl, side] of [[L, -1], [R, 1]]) {
    // the arm runs back to your shoulder below the screen, narrowing towards the glove (perspective)
    const ex = 200 + side * 150, ey = H + 60, a = Math.atan2(ey - gl.y, ex - gl.x), nx = -Math.sin(a), ny = Math.cos(a);
    const w1 = 28 * gl.s, w2 = 70;
    g.beginPath();
    g.moveTo(gl.x + nx * w1 / 2, gl.y + ny * w1 / 2); g.lineTo(ex + nx * w2 / 2, ey + ny * w2 / 2);
    g.lineTo(ex - nx * w2 / 2, ey - ny * w2 / 2); g.lineTo(gl.x - nx * w1 / 2, gl.y - ny * w1 / 2); g.closePath();
    g.fillStyle = '#1a1f3d'; g.strokeStyle = 'rgba(255,246,234,0.8)'; g.lineWidth = 3;
    g.fill(); g.stroke();
    g.beginPath(); g.ellipse(gl.x, gl.y, 30 * gl.s, 27 * gl.s, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.beginPath(); g.ellipse(gl.x - side * 20 * gl.s, gl.y - 4 * gl.s, 10 * gl.s, 14 * gl.s, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
  }
  g.restore();
}

function drawZones(now) {
  const { W, H } = view, split = H * ZONE_SPLIT;
  const zones = [
    ['block', 0, 0, W / 2, split, '242,160,170', 'BLOCK'],
    ['attack', W / 2, 0, W / 2, split, '140,190,240', 'ATTACK'],
    ['dodge', 0, split, W, H - split, '150,220,160', 'DODGE'],
  ];
  for (const [id, x, y, w, h, rgb, label] of zones) {
    const flash = game ? Math.max(0, 1 - (now - (game.flashes[id] || -9)) / 0.25) : 0;
    if (!settings.zones && flash <= 0) continue;
    g.fillStyle = `rgba(${rgb},${0.05 + flash * 0.22})`;
    g.fillRect(x, y, w, h);
    if (!settings.zones) continue;
    g.strokeStyle = `rgba(${rgb},0.35)`; g.lineWidth = 1.5;
    g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = `rgba(${rgb},0.75)`;
    g.font = '700 13px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(label, x + w / 2, y + h - 14);
  }
}

function drawHud() {
  const W = view.W;
  const bar = (x, w, frac, rgb, label, alignRight) => {
    g.fillStyle = 'rgba(11,14,28,0.6)'; g.fillRect(x - 2, 14, w + 4, 14);
    g.fillStyle = `rgb(${rgb})`;
    const fw = w * frac; g.fillRect(alignRight ? x + w - fw : x, 16, fw, 10);
    g.fillStyle = '#fff6ea'; g.font = '700 11px system-ui, sans-serif'; g.textAlign = alignRight ? 'right' : 'left';
    g.fillText(label, alignRight ? x + w : x, 44);
  };
  bar(14, 150, game.me / 100, '120,220,200', 'YOU', false);
  bar(W - 164, 150, game.foe / FOE_HP, '255,150,150', 'THE METRONOME', true);
}

function drawTexts(now) {
  const H = view.H, rows = { low: 0, big: 0, teach: 0 };
  game.texts = game.texts.filter(x => now - x.t0 < x.life);
  g.textAlign = 'center';
  for (const x of game.texts) {
    const age = (now - x.t0) / x.life, alpha = age < 0.8 ? 1 : 1 - (age - 0.8) / 0.2;
    const row = rows[x.where]++;
    let y = x.where === 'big' ? H * 0.42 : x.where === 'teach' ? H * 0.71 : H * 0.84 - row * 34 - age * 20;
    const size = x.where === 'big' ? 64 * (1 + Math.max(0, 0.15 - age)) : x.size;
    g.font = `800 ${size}px system-ui, sans-serif`;
    g.globalAlpha = Math.max(0, alpha);
    const lines = x.text.split('\n');
    if (x.where === 'teach') {
      g.fillStyle = 'rgba(11,14,28,0.78)';
      const bw = 360, bh = lines.length * 22 + 18;
      g.beginPath(); g.roundRect(20, y - 22, bw, bh, 12); g.fill();
    }
    for (const line of lines) {
      g.lineWidth = 5; g.strokeStyle = 'rgba(11,14,28,0.85)';
      if (x.where !== 'teach') g.strokeText(line, 200, y);
      g.fillStyle = x.color; g.fillText(line, 200, y);
      y += 22;
    }
    g.globalAlpha = 1;
  }
}

let lastFrame = performance.now();
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  if (mode === 'fight' && game && !paused) update();
  const now = clock(), nb = game ? beatAt(now) : now / 0.6;
  const target = game ? targetPose(now, nb) : bobbing(nb);
  if (!paused) pose = mix(pose, target, 1 - Math.exp(-dt * 28));

  // ducking moves the camera down, so the world rises
  const pl = game && game.player, dt2 = pl ? now - pl.t0 : 9;
  const duck = pl && pl.type === 'dodge' && dt2 < 0.42 ? Math.sin(Math.PI * dt2 / 0.42) : 0;
  let sx = 0, sy = 0;
  if (game && game.shake > 0) { sx = (Math.random() - 0.5) * 16 * game.shake; sy = (Math.random() - 0.5) * 16 * game.shake; if (!paused) game.shake = Math.max(0, game.shake - dt * 4); }

  const s = view.dpr * view.scale;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.clearRect(0, 0, view.W, view.H);
  g.save();
  g.translate(sx, sy);
  drawBackground(0, -duck * 30);
  drawOpponent(pose, 0, -duck * 70);
  drawPlayer(now, nb, duck * 60);
  g.restore();
  if (mode === 'fight' && game) {
    drawZones(now);
    const hurtA = Math.max(0, 1 - (now - game.hurtAt) / 0.35);
    if (hurtA > 0) {
      const v = g.createRadialGradient(200, view.H / 2, view.H * 0.25, 200, view.H / 2, view.H * 0.7);
      v.addColorStop(0, 'rgba(255,90,110,0)'); v.addColorStop(1, `rgba(255,90,110,${0.55 * hurtA})`);
      g.fillStyle = v; g.fillRect(0, 0, view.W, view.H);
    }
    drawHud();
    drawTexts(now);
  }
  if (cal) drawCal();
}

// ---------- Screens ----------
const panels = ['menu', 'cal', 'pause', 'end'];
function show(id) { for (const p of panels) $('#' + p).hidden = p !== id; $('#pauseBtn').hidden = id !== null || mode !== 'fight'; }

function startFight() {
  initAudio();
  ctx.resume();
  newGame();
  mode = 'fight'; paused = false;
  show(null);
}
function pauseGame() {
  if (mode !== 'fight' || paused || !game || game.over) return;
  paused = true; ctx.suspend(); show('pause');
}
function resumeGame() { paused = false; ctx.resume(); show(null); }
function toMenu() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (game) for (const m of game.moves) cancel(m);
  game = null; mode = 'menu'; paused = false;
  refreshMenu(); show('menu');
}
function showEnd() {
  const st = game.stats, win = game.over === 'win';
  $('#endTitle').textContent = win ? 'K.O.! You win' : 'Down! He got you';
  $('#endSub').textContent = win ? 'The Metronome is taking a nap.' : 'Every loss teaches you his rhythm. Go again?';
  const secs = Math.round(game.overAt - game.start);
  $('#endStats').innerHTML = [
    ['Fight length', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
    ['Perfect timing', st.perfect], ['Jabs blocked', st.blocks], ['Swings dodged', st.dodges],
    ['Punches on the beat', `${st.onBeat} of ${st.punches}`], ['Hits taken', st.hitsTaken],
  ].map(([k, v]) => `<li>${k}: <b>${v}</b></li>`).join('');
  show('end');
}
function refreshMenu() {
  for (const b of document.querySelectorAll('#tempo button')) b.classList.toggle('on', +b.dataset.bpm === settings.bpm);
  $('#soundBtn').textContent = settings.sound ? 'On' : 'Off'; $('#soundBtn').classList.toggle('on', settings.sound);
  $('#zonesBtn').textContent = settings.zones ? 'On' : 'Off'; $('#zonesBtn').classList.toggle('on', settings.zones);
  const ms = Math.round(settings.offset * 1000);
  $('#offsetLabel').textContent = ms === 0 ? 'not adjusted' : `adjusted ${Math.abs(ms)} ms ${ms > 0 ? 'later' : 'earlier'}`;
}

// ---------- Timing check ----------
const CAL_SPB = 0.6, CAL_LEAD = 4, CAL_CLICKS = 12;
function startCal() {
  initAudio(); ctx.resume();
  const t0 = ctx.currentTime + 0.5;
  cal = { t0, taps: [], done: false };
  for (let i = 0; i < CAL_LEAD + CAL_CLICKS; i++) sfx.click(t0 + i * CAL_SPB, i < CAL_LEAD);
  $('#calMsg').textContent = 'Get ready… 4 clicks, then tap along.';
  $('#calStart').hidden = true;
}
function calTap() {
  if (!cal || cal.done) return;
  cal.taps.push(ctx.currentTime);
}
function drawCal() {
  const now = ctx.currentTime, i = (now - cal.t0) / CAL_SPB;
  const ring = $('#calRing'), d = i - Math.round(i);
  ring.style.transform = `scale(${i >= -0.2 && i < CAL_LEAD + CAL_CLICKS ? 1 + 0.35 * Math.exp(-d * d * 60) : 1})`;
  ring.style.borderColor = i < CAL_LEAD - 0.5 ? '#c9c3d8' : '#ffb35c';
  if (i >= CAL_LEAD - 0.5 && i < CAL_LEAD + CAL_CLICKS && !cal.done) $('#calMsg').textContent = `Tap along! ${cal.taps.length} taps`;
  if (!cal.done && i > CAL_LEAD + CAL_CLICKS + 0.5) finishCal();
}
function finishCal() {
  cal.done = true;
  $('#calStart').hidden = false; $('#calStart').textContent = 'Try again';
  const first = cal.t0 + CAL_LEAD * CAL_SPB;
  const diffs = cal.taps.filter(t => t > first - CAL_SPB / 2).map(t => {
    const n = clamp(Math.round((t - first) / CAL_SPB), 0, CAL_CLICKS - 1);
    return t - (first + n * CAL_SPB);
  }).sort((a, b) => a - b);
  if (diffs.length < 6) { $('#calMsg').textContent = 'Not enough taps to measure. Try again, tapping with every click.'; return; }
  const median = diffs[Math.floor(diffs.length / 2)];
  settings.offset = clamp(median, -0.1, 0.35);
  store.set('offset', settings.offset);
  const ms = Math.round(settings.offset * 1000);
  $('#calMsg').textContent = Math.abs(ms) < 10 ? 'Spot on. No adjustment needed.' : `Your taps land about ${Math.abs(ms)} ms ${ms > 0 ? 'after' : 'before'} the clicks. The game now allows for that.`;
  refreshMenu();
}

// ---------- Input ----------
function zoneAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect(), x = (clientX - r.left) / view.scale, y = (clientY - r.top) / view.scale;
  return y > view.H * ZONE_SPLIT ? 'dodge' : x < view.W / 2 ? 'block' : 'attack';
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); act(zoneAt(e.clientX, e.clientY)); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (cal && !$('#cal').hidden) { if (e.key === ' ' || e.key.startsWith('Arrow')) { e.preventDefault(); calTap(); } return; }
  const map = { ArrowLeft: 'block', a: 'block', ArrowRight: 'attack', d: 'attack', ArrowDown: 'dodge', s: 'dodge', ' ': 'dodge' };
  if (map[e.key]) { e.preventDefault(); act(map[e.key]); }
  if (e.key === 'Escape' || e.key === 'p') paused ? resumeGame() : pauseGame();
});
$('#calPad').addEventListener('pointerdown', e => { e.preventDefault(); calTap(); });
$('#fightBtn').onclick = startFight;
$('#againBtn').onclick = startFight;
$('#menuBtn').onclick = toMenu;
$('#quitBtn').onclick = toMenu;
$('#resumeBtn').onclick = resumeGame;
$('#pauseBtn').onclick = pauseGame;
$('#calBtn').onclick = () => { $('#calMsg').textContent = ''; $('#calStart').hidden = false; $('#calStart').textContent = 'Start'; show('cal'); };
$('#calStart').onclick = startCal;
$('#calReset').onclick = () => { settings.offset = 0; store.set('offset', 0); $('#calMsg').textContent = 'Timing reset to zero.'; refreshMenu(); };
$('#calDone').onclick = () => { cal = null; $('#calRing').style.transform = ''; show('menu'); };
for (const b of document.querySelectorAll('#tempo button')) b.onclick = () => { settings.bpm = +b.dataset.bpm; store.set('bpm', settings.bpm); refreshMenu(); };
$('#soundBtn').onclick = () => { settings.sound = !settings.sound; store.set('sound', settings.sound); if (master) master.gain.value = settings.sound ? 0.8 : 0; refreshMenu(); };
$('#zonesBtn').onclick = () => { settings.zones = !settings.zones; store.set('zones', settings.zones); refreshMenu(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('resize', resize);

resize();
refreshMenu();
requestAnimationFrame(frame);
