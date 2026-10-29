'use strict';
// Rhythm Fighter, playable test: one opponent, three tap zones, attacks that land on the beat.
// Everything is timed from the audio clock so sound, pictures and judging agree.
// Look: pen and ink on paper. Solid ink shapes with hand-drawn edges that gently "boil",
// dry-brush smears behind fast movement, and ink splatters on hits. Red ink only means danger or impact.

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
const ON_BEAT = 0.09;                      // a punch this close to a beat counts as on the beat
const ZONE_SPLIT = 0.76;                   // Dodge strip starts this far down the screen
const FLOW_STRIP = 0.1;                    // the Flow strip along the top (at least 86 units tall)
// Flow: landing hits fills the Rhythm bar; when it's full, tap the top strip for 3 rhythm combos.
const FLOW_OK = 0.1;                       // seconds either side of each half-beat in a Flow combo
const RHYTHM = { offBeat: 4, chain: 8, measure: 15, block: 3, perfectBlock: 10, dodge: 6, perfectDodge: 12, hurt: -15 };
const FLOW_DMG = { arrow: 2, finish: 8 };  // per arrow, plus a finishing blow for completing a combo
// Flow combos: 8 half-beats each. L = Block zone (←), R = Attack zone (→), D = Dodge strip (↓), . = rest.
// Rename or rewrite these freely; each Flow picks 3 at random.
const COMBOS = [
  ['Method Madness', 'RLRLDDR.'],
  ['Four on the Floor', 'D.D.D.D.'],
  ['Double Time', 'LLRRLLRR'],
  ['Syncopation', 'L.RL.RD.'],
  ['Call and Response', 'LLR.RRL.'],
  ['Ghost Notes', 'L.LR.RLD'],
  ['Drop', 'LRLR.DD.'],
  ['Crescendo', 'L.R.LRDD'],
];
// Punching in an opening: off-beat punches do a little; on-beat punches build a chain (1, 2, 3)
// that keeps him open, and the 4th beat in a row is a FULL MEASURE finisher.
const DMG = { jab: 7, heavy: 20, guardBreak: 10, offBeat: 3, chain: [4, 5, 6], measure: 12 };
const FOE_HP = 180;
const TELL = { jab: 1, heavy: 2 };         // beats of warning before each attack lands
const RECOVER = { jab: 0.45, heavy: 0.7 }; // beats he needs to get his guard back
// Fight script: 8 beats per phrase. - rest, J jab, H big swing, O taunt (guard down for 2 beats)
const OPENING = ['--J---J-', '-----H--', '--J-O---'];
const PHRASES = [
  ['--J---J-', '-----H--', '--J-O---', '---J-J--'], // health above 60
  ['-J-J--H-', 'J---O---', '--J-J-J-', '---H----'], // 30 to 60
  ['JJ--H---', 'J-J--H--', '-JJJ-O--'],             // below 30
];
const INK = '#15120f', PAPER = '#efe8dc', RED = '#b3262c', WASH = '#5b524b';
const FONT = "'Permanent Marker', system-ui, sans-serif";

const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - (1 - t) * (1 - t), easeIn = t => t * t, easeInOut = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
const hash = n => { const h = Math.sin(n * 12.9898) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; }; // steady "random" in -1..1

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
  beatPunch(t, n) { sfx.punch(t); tone(t, 'triangle', 990 * Math.pow(1.122, n - 1), 990 * Math.pow(1.122, n - 1), 0.14, 0.22); },
  measure(t) {
    sfx.punch(t); tone(t, 'sine', 90, 28, 0.7, 0.8); noise(t, 0.9, 0.3, 'highpass', 6000, 2500);
    for (const [f, d] of [[1250, 0], [1575, 0.04], [1870, 0.08]]) tone(t + d, 'triangle', f, f, 0.35, 0.16);
  },
  guarded(t) { tone(t, 'square', 300, 200, 0.05, 0.12); noise(t, 0.04, 0.2, 'highpass', 3000); },
  bell(t) { for (const [f, v] of [[880, 0.3], [1320, 0.15], [2200, 0.07]]) tone(t, 'sine', f, f, 1.6, v); },
  flowIn(t) { noise(t, 0.5, 0.3, 'bandpass', 500, 6000, 2); tone(t, 'triangle', 660, 1320, 0.4, 0.2); },
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
  hitReact: P({ y: 8, rot: -0.06, hx: 12, hy: -10, hr: 0.35, lx: -78, ly: 105, rx: 80, ry: 92 }),
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
    chain: 0, chainBeat: -9, rhythm: 0, flow: null,
    knock: { x: 0, y: 0, rot: 0, hr: 0, vx: 0, vy: 0, vrot: 0, vhr: 0 }, // springy knockback on top of his pose
    hitStop: 0, zoom: 0, ink: [], slashes: [],
    hitReact: -9, hitSide: 1, guardTight: -9, shake: 0, hurtAt: -9, flashes: {}, texts: [],
    over: null, overAt: 0, shown: false,
    stats: { perfect: 0, blocks: 0, dodges: 0, hitsTaken: 0, punches: 0, onBeat: 0, measures: 0, flows: 0, combos: 0 },
  };
  trails.l = []; trails.r = [];
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
// He's dazed until beat `until`: clear what he had planned and pick up the script again afterwards.
function openUntil(nb, until, rest = 1) {
  game.stunUntil = until;
  for (const m of game.moves) if (!m.cancelled && (m.type === 'taunt' || (!m.resolved && m.hit > nb))) cancel(m);
  game.nextFill = Math.ceil(until) + rest;
  game.phrase = [];
}
const stun = (nb, beats) => openUntil(nb, Math.max(game.stunUntil, nb + beats));
const tauntAt = nb => game.moves.find(m => m.type === 'taunt' && !m.cancelled && nb >= m.hit && nb < m.end);
const isOpen = nb => nb < game.stunUntil || !!tauntAt(nb);
const activeMove = nb => game.moves.find(m => m.type !== 'taunt' && !m.cancelled && nb >= m.tellStart && nb <= m.hit + RECOVER[m.type]);

// ---------- Player actions ----------
function act(action) {
  if (mode !== 'fight' || paused || !game || game.over) return;
  const real = ctx.currentTime, t = real - settings.offset, nb = beatAt(t);
  game.flashes[action] = real;
  if (nb < 3) return; // no fighting during the countdown
  if (action === 'flow') return game.rhythm >= 100 ? startFlow(nb) : teach('flowEmpty', 'That top strip is for FLOW.\nLand hits to fill the Rhythm bar first.');
  if (game.flow) return flowInput(action, real, t);
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
    sfx.block(real); game.stats.blocks++; gainRhythm(perfect ? RHYTHM.perfectBlock : RHYTHM.block);
    splat(200, view.H * 0.6, 0, -1, 0.4, 'ink');
    if (perfect) { sfx.perfect(real); game.stats.perfect++; say('PERFECT BLOCK'); stun(nb, 1); opening(); }
    else say('BLOCK', { size: 26 });
  } else if (action === 'dodge' && m.type === 'heavy') {
    sfx.dodge(real); game.stats.dodges++; gainRhythm(perfect ? RHYTHM.perfectDodge : RHYTHM.dodge);
    game.slashes.push({ t0: clock(), dy: 0, seed: Math.random() * 99 });
    if (perfect) { sfx.perfect(real); game.stats.perfect++; say('PERFECT DODGE'); stun(nb, 3); }
    else { say('DODGE!'); stun(nb, 2); }
    opening();
  } else if (action === 'block') {
    hurt(DMG.guardBreak, 'GUARD BROKEN', 'heavyBlock', true);
  } else {
    hurt(DMG.jab, 'TOO SLOW', 'jabDodge', false);
  }
}
function opening() {
  say('OPENING!', { color: RED });
  game.chain = 0; game.chainBeat = -9;
  teach('opening', 'He’s open! Punch ON the beat.\nFour beats in a row = FULL MEASURE.');
}
function attack(real, nb) {
  if (real < game.punchReady) return;
  game.punchReady = real + 0.15;
  game.punchSide = -game.punchSide;
  game.player = { type: 'punch', t0: real, side: game.punchSide };
  game.stats.punches++;
  if (!isOpen(nb)) {
    sfx.guarded(real);
    game.guardTight = real;
    game.chain = 0; game.chainBeat = -9;
    say('GUARDED', { color: WASH, size: 22 });
    teach('guarded', 'He’s guarding, and he’ll punish that.\nWait for an opening first.');
    return counter(nb);
  }
  const taunt = tauntAt(nb);
  if (taunt) stun(nb, taunt.end - nb);
  const beat = Math.round(nb), onBeat = Math.abs(nb - beat) * game.spb <= ON_BEAT;
  let dmg = DMG.offBeat, power = 0.6;
  if (onBeat && beat !== game.chainBeat) {
    game.chain = game.chainBeat === beat - 1 ? game.chain + 1 : 1;
    game.chainBeat = beat;
    game.stats.onBeat++;
    if (game.chain >= 4) { // FULL MEASURE: a huge hit that knocks him out of the opening
      dmg = DMG.measure; power = 3.2;
      game.chain = 0; game.chainBeat = -9; game.stats.measures++;
      gainRhythm(RHYTHM.measure);
      openUntil(nb, nb + 0.9, 2);
      sfx.measure(real);
      say('FULL MEASURE!', { where: 'big', color: RED, size: 50, life: 1.2 });
    } else {
      dmg = DMG.chain[game.chain - 1]; power = 1 + game.chain * 0.45;
      stun(nb, beat + 1.45 - nb); // staying on the beat keeps him open for the next one
      sfx.beatPunch(real, game.chain);
      gainRhythm(RHYTHM.chain);
      say(String(game.chain), { where: 'combo', color: game.chain === 3 ? RED : INK, size: 40 + game.chain * 12 });
    }
  } else {
    if (!onBeat) { game.chain = 0; game.chainBeat = -9; }
    sfx.punch(real);
    gainRhythm(RHYTHM.offBeat);
  }
  game.foe = Math.max(0, game.foe - dmg);
  impact(power);
  if (game.foe <= 0) finish('win');
}
// The feel of a landed punch: a tiny freeze, a camera push, springy knockback and ink.
function impact(power) {
  const dir = -game.punchSide, kn = game.knock;
  kn.vx += dir * 260 * power; kn.vrot += dir * 1.3 * power; kn.vhr += dir * 2.6 * power; kn.vy -= 70 * power;
  game.hitReact = clock(); game.hitSide = game.punchSide;
  game.hitStop = performance.now() / 1000 + 0.035 + 0.035 * power;
  game.zoom = Math.min(0.14, 0.02 + 0.035 * power);
  game.shake = Math.max(game.shake, 0.2 * power);
  splat(headPos.x + game.punchSide * 12, headPos.y, dir, -0.35, power, power >= 3 ? 'mix' : 'ink');
}
// Punch into his guard and he answers with a jab two beats later (if he isn't busy).
function counter(nb) {
  const b = Math.floor(nb) + 2;
  if (game.moves.some(m => !m.cancelled && m.type !== 'taunt' && m.hit >= b - 2 && m.hit <= b + 1)) return;
  for (const m of game.moves) if (!m.cancelled && m.hit > b && m.hit <= b + 2) cancel(m);
  addMove('jab', b);
}
function hurt(dmg, label, lesson, big) {
  const real = ctx.currentTime;
  game.me = Math.max(0, game.me - dmg);
  game.shake = big ? 1.2 : 0.8; game.hurtAt = real; game.stats.hitsTaken++;
  game.chain = 0; game.chainBeat = -9;
  sfx.hurt(real);
  gainRhythm(RHYTHM.hurt);
  say(label, { color: RED });
  splat(-10, view.H * 0.2, 1, 0.25, big ? 1.6 : 0.9, 'red');
  if (big) { splat(410, view.H * 0.2, -1, 0.25, 1.6, 'red'); game.slashes.push({ t0: clock(), dy: view.H * 0.22, seed: Math.random() * 99 }); }
  const lessons = {
    heavyBlock: 'Big swings break your guard.\nDodge those instead!',
    jabDodge: 'Quick jabs are too fast to dodge.\nBlock those instead!',
    heavyHit: 'Red brush circle + rising whoosh = big swing.\nTap Dodge as it lands.',
    jabHit: 'Glint + wooden tock = quick jab.\nTap Block as it lands.',
  };
  if (lesson) teach(lesson, lessons[lesson]);
  if (game.me <= 0) finish('lose');
}
function finish(result) {
  const real = ctx.currentTime;
  game.over = result; game.overAt = real; game.flow = null;
  for (const m of game.moves) if (!m.resolved || m.type === 'taunt') cancel(m);
  if (result === 'win') {
    sfx.bell(real + 0.1);
    splat(headPos.x, headPos.y, -game.punchSide, -0.5, 4, 'mix');
    say('K.O.!', { where: 'big', color: RED, life: 2 });
  } else { sfx.thud(real); say('DOWN!', { where: 'big', color: RED, life: 2 }); }
}

// ---------- Flow ----------
function gainRhythm(n) {
  if (game.flow) return;
  const was = game.rhythm;
  game.rhythm = clamp(game.rhythm + n, 0, 100);
  if (was < 100 && game.rhythm >= 100) {
    sfx.perfect(clock());
    say('FLOW READY', { color: RED });
    teach('flowReady', 'Rhythm bar full! Tap the strip at the top\n(or press ↑) to enter FLOW.');
  }
}
const flowAt = nb => !!game.flow && nb >= game.flow.first && nb < game.flow.end;
const nextArrow = (pat, from) => { for (let i = from; i < pat.length; i++) if (pat[i] !== '.') return i; return -1; };
const slotTime = (c, i) => timeAt(c.start + i * 0.5);
// Flow starts on the next beat. Each combo is two bars: a bar to read the arrows (with a
// "3, 2, 1" count-in on its last three beats), then a bar of punching on the half-beats.
const FLOW_LEN = 25; // beats: 4 + 3 combos × 8, plus a little room after the last one
function startFlow(nb) {
  if (game.flow) return;
  const first = Math.ceil(nb) + 1, picks = [...COMBOS].sort(() => Math.random() - 0.5).slice(0, 3);
  game.flow = {
    first, end: first + FLOW_LEN,
    combos: picks.map(([name, pattern], i) => ({ name, pattern: pattern.split(''), start: first + 4 + i * 8, hits: [], next: nextArrow(pattern.split(''), 0), state: 'ready' })),
  };
  game.rhythm = 0; game.chain = 0; game.chainBeat = -9; game.stats.flows++;
  openUntil(nb, first + FLOW_LEN, 2);
  sfx.flowIn(clock());
  say('FLOW!', { where: 'big', color: RED, size: 64, life: 1 });
  teach('flow', 'FLOW! After 3, 2, 1, punch each arrow\nas the red ring lands on it.\n← Block zone    → Attack zone    ↓ Dodge strip');
}
function flowInput(action, real, t) {
  const nb = beatAt(t), c = game.flow.combos.find(c => nb >= c.start - 1 && nb < c.start + 4.5);
  if (!c || c.state === 'done' || c.state === 'dropped' || c.next < 0) return;
  if (t < slotTime(c, 0) - FLOW_OK) return; // still reading the arrows
  const key = { block: 'L', attack: 'R', dodge: 'D' }[action], d = t - slotTime(c, c.next);
  if (d < -FLOW_OK) return dropCombo(c, 'TOO EARLY');
  if (d > FLOW_OK) return dropCombo(c, 'MISSED');
  if (key !== c.pattern[c.next]) return dropCombo(c, 'WRONG WAY');
  c.hits.push(c.next); c.state = 'live';
  const side = key === 'L' ? -1 : key === 'R' ? 1 : -game.punchSide;
  game.punchSide = side;
  game.player = { type: 'punch', t0: real, side, low: key === 'D' };
  game.stats.punches++;
  c.next = nextArrow(c.pattern, c.next + 1);
  let dmg = FLOW_DMG.arrow, power = 0.9;
  if (c.next < 0) { // the whole combo landed: finishing blow
    c.state = 'done'; game.stats.combos++;
    dmg += FLOW_DMG.finish; power = 3;
    sfx.measure(real);
    say(c.name.toUpperCase() + '!', { where: 'big', color: RED, size: 40, life: 1.1 });
  } else sfx.beatPunch(real, 1 + (c.hits.length % 4));
  game.foe = Math.max(0, game.foe - dmg);
  impact(power);
  if (game.foe <= 0) finish('win');
}
function dropCombo(c, why) {
  c.state = 'dropped';
  sfx.guarded(clock());
  say(why, { color: WASH, size: 24 });
}
function updateFlow(now, nb) {
  const f = game.flow, t = now - settings.offset;
  for (const c of f.combos) if ((c.state === 'ready' || c.state === 'live') && c.next >= 0 && t > slotTime(c, c.next) + FLOW_OK) dropCombo(c, 'MISSED');
  if (nb >= f.end) { game.flow = null; say('FLOW ENDS', { color: WASH, size: 24 }); }
}

// ---------- Floating words ----------
function say(text, o = {}) { game.texts.push({ text, t0: clock(), color: o.color || INK, size: o.size || 30, where: o.where || 'low', life: o.life || 0.8 }); }
function teach(key, text) {
  if (taught[key]) return;
  taught[key] = true;
  game.texts = game.texts.filter(x => x.where !== 'teach');
  say(text, { where: 'teach', size: 16, life: 3.4, color: PAPER });
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
      if (flowAt(b)) { sfx.hat(t + game.spb / 4); sfx.hat(t + game.spb * 3 / 4); sfx.kick(t + game.spb / 2); } // double time in Flow
      if (game.flow) for (const c of game.flow.combos) if (b >= c.start - 3 && b < c.start) sfx.click(t, b === c.start - 1); // "3, 2, 1" ticks
    }
    game.musicBeat++;
  }
  if (nb >= 0 && nb < 4 && Math.floor(nb) !== game.lastCount) {
    game.lastCount = Math.floor(nb);
    say(['3', '2', '1', 'FIGHT!'][game.lastCount], { where: 'big', color: game.lastCount === 3 ? RED : INK, life: game.spb * 0.9 });
  }
  if (game.over) {
    if (!game.shown && now - game.overAt > 2.2) { game.shown = true; showEnd(); }
    return;
  }
  fillAhead(nb);
  if (game.flow) updateFlow(now, nb);
  // anything not blocked or dodged in time lands
  for (const m of game.moves) {
    if (m.resolved || m.type === 'taunt' || now - settings.offset <= m.time + OK) continue;
    m.resolved = true;
    const heavy = m.type === 'heavy';
    hurt(DMG[m.type], heavy ? 'OOF!' : 'OUCH', heavy ? 'heavyHit' : 'jabHit', heavy);
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
  if (nb < game.stunUntil) { // dazed: a loose, staggering sway
    const p = { ...POSE.open };
    p.x += Math.sin(now * 3.1) * 16; p.rot += Math.sin(now * 3.1 + 0.6) * 0.07; p.hr += Math.sin(now * 2.3) * 0.16;
    p.ly += Math.sin(now * 4) * 8; p.ry += Math.sin(now * 4 + 1.5) * 8;
    return p;
  }
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
function stepKnock(dt) {
  const kn = game.knock, K = 70, D = 9;
  for (const [p, v] of [['x', 'vx'], ['y', 'vy'], ['rot', 'vrot'], ['hr', 'vhr']]) { kn[v] += (-K * kn[p] - D * kn[v]) * dt; kn[p] += kn[v] * dt; }
}

// ---------- Ink: splatters, drips and brush strokes ----------
function splat(x, y, dx, dy, power, color) {
  const n = Math.round(8 + 7 * power), a0 = Math.atan2(dy, dx);
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.random() - 0.5) * (1.2 + 0.4 * power), sp = (180 + Math.random() * 520) * (0.7 + power * 0.3);
    game.ink.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.5 + Math.random() * (2.5 + power * 1.5), t: 0,
      fly: 0.1 + Math.random() * 0.25, stay: 0.8 + Math.random() * 0.8, color: color === 'mix' ? (Math.random() < 0.45 ? 'red' : 'ink') : color });
  }
  game.ink.push({ blot: true, x, y, r: 12 + power * 9, t: 0, fly: 0, stay: 0.35 + power * 0.15, color: color === 'red' ? 'red' : 'ink', seed: Math.random() * 99 });
  if (game.ink.length > 260) game.ink.splice(0, game.ink.length - 260);
}
function stepInk(dt) {
  for (const d of game.ink) {
    d.t += dt;
    if (!d.blot && d.t < d.fly) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      const f = Math.exp(-dt * 5); d.vx *= f; d.vy = d.vy * f + 420 * dt;
    }
  }
  game.ink = game.ink.filter(d => d.t < d.fly + d.stay);
}
function drawInk() {
  for (const d of game.ink) {
    g.fillStyle = d.color === 'red' ? RED : INK;
    if (d.blot) {
      const grow = clamp(d.t / 0.06, 0.2, 1);
      g.globalAlpha = 0.9 * (1 - clamp(d.t / d.stay, 0, 1));
      roughEllPath(g, d.x, d.y, d.r * grow, d.r * grow * 0.85, d.seed, d.seed, d.r * 0.35);
      g.fill();
    } else if (d.t < d.fly) { // flying drop, stretched along its path
      const st = 1 + Math.min(Math.hypot(d.vx, d.vy) / 150, 4);
      g.globalAlpha = 1;
      g.beginPath(); g.ellipse(d.x, d.y, d.r * st, d.r / Math.sqrt(st), Math.atan2(d.vy, d.vx), 0, Math.PI * 2); g.fill();
    } else { // landed drop, fading away
      g.globalAlpha = 0.85 * (1 - (d.t - d.fly) / d.stay);
      g.beginPath(); g.arc(d.x, d.y, d.r * 1.15, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalAlpha = 1;
}
// Hand-drawn outlines: edges get a small wobble that changes ~11 times a second, like re-inked frames.
function roughPolyPath(c, pts, seed, amp = 1.6) {
  c.beginPath();
  const n = pts.length / 2;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const x1 = pts[i * 2], y1 = pts[i * 2 + 1], x2 = pts[((i + 1) % n) * 2], y2 = pts[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, steps = Math.max(1, Math.round(len / 14)), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    for (let j = 0; j < steps; j++) {
      const t = j / steps, w = amp * hash(seed * 97 + k++);
      const x = x1 + (x2 - x1) * t + nx * w, y = y1 + (y2 - y1) * t + ny * w;
      if (i === 0 && j === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }
  c.closePath();
}
function roughEllPath(c, x, y, rx, ry, rot, seed, amp = 1.6) {
  c.beginPath();
  const n = 14 + Math.round(Math.max(rx, ry) / 6), cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, j = 1 + amp * hash(seed * 97 + i) / Math.max(rx, ry, 1);
    const px = Math.cos(a) * rx * j, py = Math.sin(a) * ry * j;
    const X = x + px * cr - py * sr, Y = y + px * sr + py * cr;
    if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
  }
  c.closePath();
}
// A dry-brush stroke: a few bristle lines along a path, some skipped for a scratchy texture.
// `shape(u)` sets the thickness along the stroke (u goes 0 to 1).
function dryBrush(c, pts, width, color, alpha, seed = 1, shape = u => u) {
  if (pts.length < 2) return;
  const bristles = 7;
  c.strokeStyle = color; c.lineCap = 'round';
  for (let b = 0; b < bristles; b++) {
    if (hash(seed * 13 + b) > 0.75) continue; // a dry gap
    const off = (b / (bristles - 1) - 0.5) * width * 0.8;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i], len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      const nx = -(p1.y - p0.y) / len, ny = (p1.x - p0.x) / len, f = shape(i / (pts.length - 1));
      c.globalAlpha = alpha * (0.55 + 0.45 * f);
      c.lineWidth = Math.max(0.5, width / bristles * 2.6 * f);
      c.beginPath(); c.moveTo(p0.x + nx * off * f, p0.y + ny * off * f); c.lineTo(p1.x + nx * off * f, p1.y + ny * off * f); c.stroke();
    }
  }
  c.globalAlpha = 1;
}

// ---------- Drawing ----------
const COLORS = { body: INK, glove: '#221c18', hot: RED, trunks: WASH, belt: INK };
const bg = document.createElement('canvas'), BGM = 80; // background drawn once, with a margin for camera moves
const trails = { l: [], r: [] };
let headPos = { x: 200, y: 200 }, camInv = new DOMMatrix(), frozenNow = false;

function resize() {
  const r = stage.getBoundingClientRect();
  view.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * view.dpr);
  canvas.height = Math.round(r.height * view.dpr);
  view.scale = r.width / view.W;
  view.H = r.height / view.scale;
  view.k = clamp(view.H / 780, 0.8, 1.2);
  buildBackground();
}

function buildBackground() {
  const s = view.dpr * view.scale, W = view.W + BGM * 2, H = view.H + BGM * 2, c = bg.getContext('2d');
  bg.width = Math.round(W * s); bg.height = Math.round(H * s);
  c.setTransform(s, 0, 0, s, BGM * s, BGM * s);
  c.fillStyle = PAPER; c.fillRect(-BGM, -BGM, W, H);
  for (let i = 0; i < 1800; i++) { // paper grain
    c.fillStyle = `rgba(70,50,30,${Math.random() * 0.06})`;
    c.fillRect(-BGM + Math.random() * W, -BGM + Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const sun = c.createRadialGradient(200, view.H * 0.27, 20, 200, view.H * 0.27, 200); // soft ink wash behind him
  sun.addColorStop(0, 'rgba(110,95,80,0.3)'); sun.addColorStop(0.7, 'rgba(110,95,80,0.1)'); sun.addColorStop(1, 'rgba(110,95,80,0)');
  c.fillStyle = sun; c.fillRect(-BGM, -BGM, W, H);
  const floor = c.createLinearGradient(0, view.H * 0.6, 0, view.H + BGM);
  floor.addColorStop(0, 'rgba(40,30,25,0)'); floor.addColorStop(1, 'rgba(40,30,25,0.2)');
  c.fillStyle = floor; c.fillRect(-BGM, view.H * 0.6, W, H);
  const flat = () => 1;
  [0.45, 0.51, 0.57].forEach((f, i) => { // ring ropes
    const pts = [], y = view.H * f;
    for (let j = 0; j <= 30; j++) { const t = j / 30, x = lerp(-BGM, view.W + BGM, t); pts.push({ x, y: y + Math.sin(Math.PI * t) * 14 + hash(i * 50 + j) * 0.8 }); }
    dryBrush(c, pts, 6, INK, 0.8, i + 3, flat);
  });
  for (const x of [18, view.W - 18]) dryBrush(c, [{ x, y: view.H * 0.41 }, { x, y: view.H * 0.64 }], 13, INK, 0.9, x, flat);
  const horizon = [];
  for (let j = 0; j <= 20; j++) horizon.push({ x: lerp(-BGM, view.W + BGM, j / 20), y: view.H * 0.64 + hash(j + 9) });
  dryBrush(c, horizon, 4, INK, 0.45, 7, flat);
}

// The red brush circle that grows behind him as a big swing winds up
function drawEnso(nb) {
  const m = game.moves.find(m => m.type === 'heavy' && !m.cancelled && nb >= m.tellStart && nb <= m.hit + 0.1);
  if (!m) return;
  const u = clamp((nb - m.tellStart) / TELL.heavy, 0, 1), R = 108 * view.k, pts = [], sweep = 5.7 * easeOut(u), n = 40;
  for (let i = 0; i <= n; i++) {
    const a = -2.4 + sweep * i / n, r = R * (1 + 0.035 * hash(i * 7.3));
    pts.push({ x: headPos.x + Math.cos(a) * r, y: headPos.y + 20 + Math.sin(a) * r });
  }
  dryBrush(g, pts, 26 * view.k, RED, 0.9, 3, t => 1 - 0.7 * t);
}

function drawOpponent(p, ox, oy, vel) {
  const k = view.k, seed = Math.floor(performance.now() / 90);
  g.save();
  g.translate(200 + ox + p.x * k, view.H * 0.34 + oy + p.y * k);
  g.scale(k, k);
  g.translate(0, 220); g.rotate(p.rot); g.translate(0, -220); // lean from the hips
  const toCam = (x, y) => camInv.transformPoint(g.getTransform().transformPoint({ x, y }));
  // Shapes go in layers (body, then each arm). Each arm gets a thin paper-coloured edge,
  // so arms stay readable when they cross in front of the solid-ink body.
  let shapes = [];
  const layers = [shapes], gloves = [];
  const poly = (pts, fill) => shapes.push({ fill, build: sd => roughPolyPath(g, pts, sd) });
  const ell = (x, y, rx, ry, fill, r = 0) => shapes.push({ fill, build: sd => roughEllPath(g, x, y, rx, ry, r, sd) });
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
  const hp = (x, y) => ({ x: hx + x * c - y * s, y: hy + x * s + y * c });
  ell(hx, hy, 31, 38, 'body', p.hr);
  poly(H([-27, 6, 27, 6, 18, 38, -18, 38]), 'body');
  poly(H([-33, -47, 33, -47, 31, -22, -31, -22]), 'body');
  for (const side of [-1, 1]) { const e = hp(side * 31, 4); ell(e.x, e.y, 6, 10, 'body', p.hr); }
  headPos = toCam(hx, hy);
  // arms reach for the gloves; the closer glove is drawn on top
  const arm = (side, gx, gy, gs) => {
    const sx = side * 70, sy = 12, L1 = 72, L2 = 64;
    const d = clamp(Math.hypot(gx - sx, gy - sy), Math.abs(L1 - L2) + 1, L1 + L2 - 1);
    const a = Math.atan2(gy - sy, gx - sx), B = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const e1 = [sx + L1 * Math.cos(a + B), sy + L1 * Math.sin(a + B)], e2 = [sx + L1 * Math.cos(a - B), sy + L1 * Math.sin(a - B)];
    const e = e1[1] > e2[1] ? e1 : e2; // elbows bend downwards
    limb(sx, sy, e[0], e[1], 30, 25, 'body');
    limb(e[0], e[1], gx, gy, 24, 19 * Math.pow(gs, 0.6), 'body');
    // fast gloves stretch along their path (a smear frame)
    const [vx, vy] = vel[side < 0 ? 'l' : 'r'], sp = Math.hypot(vx, vy), st = 1 + Math.min(sp / 900, 1);
    const gf = p.glow > 0.3 && side < 0 ? 'hot' : 'glove';
    ell(gx, gy, 25 * gs * st, 23 * gs / Math.sqrt(st), gf, sp > 1 ? Math.atan2(vy, vx) : 0);
    ell(gx - side * 17 * gs, gy - 3 * gs, 9 * gs, 12 * gs, gf);
    gloves.push({ x: gx, y: gy, s: gs, side });
    if (!frozenNow) {
      const tr = trails[side < 0 ? 'l' : 'r'];
      const pt = toCam(gx, gy); tr.push({ x: pt.x, y: pt.y, s: gs * k });
      if (tr.length > 8) tr.shift();
    }
  };
  const arms = [[-1, p.lx, p.ly, p.ls], [1, p.rx, p.ry, p.rs]].sort((a, b) => a[3] - b[3]);
  for (const a of arms) { layers.push(shapes = []); arm(...a); }

  const drawLayer = (layer, li) => {
    if (li) { g.strokeStyle = PAPER; g.lineWidth = 5; g.lineJoin = 'round'; layer.forEach((sh, i) => { sh.build(seed + li * 50 + i); g.stroke(); }); }
    layer.forEach((sh, i) => { sh.build(seed + li * 50 + i); g.fillStyle = COLORS[sh.fill]; g.fill(); });
  };
  drawLayer(layers[0], 0);
  // body details: a dry-brush highlight down one side, highlight on the cheek, eyes
  const arc = u => Math.sin(Math.PI * u);
  dryBrush(g, [{ x: 68, y: 4 }, { x: 62, y: 40 }, { x: 52, y: 100 }, { x: 46, y: 140 }], 7, PAPER, 0.6, seed, arc);
  dryBrush(g, [hp(23, -22), hp(27, -4), hp(22, 18)], 4, PAPER, 0.6, seed + 1, arc);
  g.fillStyle = PAPER;
  for (const side of [-1, 1]) { // narrow, angry eye slits
    const pts = H([side * 21, -10, side * 5, -5, side * 5, -1, side * 20, -5]);
    g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.fill();
  }
  for (let li = 1; li < layers.length; li++) drawLayer(layers[li], li);
  for (const gl of gloves) {
    dryBrush(g, [{ x: gl.x - 14 * gl.s, y: gl.y - 4 * gl.s }, { x: gl.x - 9 * gl.s, y: gl.y - 12 * gl.s }, { x: gl.x, y: gl.y - 15 * gl.s }], 4 * gl.s, PAPER, 0.55, seed + gl.side, arc);
  }
  if (p.spark > 0.05) { // glint on the right glove as a jab winds up
    const r = 26 * p.spark;
    g.beginPath();
    g.moveTo(p.rx, p.ry - r); g.lineTo(p.rx + r * 0.18, p.ry - r * 0.18); g.lineTo(p.rx + r, p.ry); g.lineTo(p.rx + r * 0.18, p.ry + r * 0.18);
    g.lineTo(p.rx, p.ry + r); g.lineTo(p.rx - r * 0.18, p.ry + r * 0.18); g.lineTo(p.rx - r, p.ry); g.lineTo(p.rx - r * 0.18, p.ry - r * 0.18);
    g.closePath();
    g.globalAlpha = p.spark; g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 2; g.fill(); g.stroke(); g.globalAlpha = 1;
  }
  g.restore();
}

// Dry-brush smears behind fast-moving gloves
function drawTrails() {
  for (const key of ['l', 'r']) {
    const pts = trails[key];
    if (pts.length < 3) continue;
    let travel = 0;
    for (let i = 1; i < pts.length; i++) travel += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (travel < 40) continue;
    const last = pts[pts.length - 1];
    dryBrush(g, pts, 44 * last.s, INK, clamp((travel - 40) / 120, 0, 0.6), key === 'l' ? 5 : 6);
  }
}

// A brush slash across the screen: the big swing missing you (or landing)
function drawSlashes(now) {
  game.slashes = game.slashes.filter(s => now - s.t0 < 0.45);
  for (const s of game.slashes) {
    const age = now - s.t0, reveal = clamp(age / 0.1, 0, 1), fade = 1 - clamp((age - 0.15) / 0.3, 0, 1), pts = [];
    for (let i = 0; i <= Math.round(24 * reveal); i++) { const t = i / 24; pts.push({ x: lerp(-30, 430, t), y: view.H * (0.16 + 0.2 * Math.sin(Math.PI * t)) + s.dy }); }
    dryBrush(g, pts, 34, RED, 0.85 * fade, s.seed, t => 0.15 + 0.85 * Math.sin(Math.PI * t));
  }
}

// Your own gloves: ink outlines on paper, at the bottom of the screen
function drawPlayer(now, nb, oy) {
  const H = view.H, pl = game ? game.player : { type: 'idle', t0: -9 }, t = now - pl.t0, seed = Math.floor(performance.now() / 90);
  const bob = beatDip(nb) * 4;
  let L = { x: 92, y: H * 0.95 + bob, s: 1.3 }, R = { x: 308, y: H * 0.95 + bob, s: 1.3 };
  const to = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u) });
  if (pl.type === 'block' && t < 0.4) {
    const u = t < 0.06 ? easeOut(t / 0.06) : t > 0.3 ? 1 - (t - 0.3) / 0.1 : 1;
    L = to(L, { x: 165, y: H * 0.68, s: 1.6 }, u); R = to(R, { x: 235, y: H * 0.68, s: 1.6 }, u);
  }
  if (pl.type === 'punch' && t < 0.2) {
    const u = t < 0.07 ? easeOut(t / 0.07) : 1 - easeIn((t - 0.07) / 0.13), aim = { x: 200 + pl.side * 22, y: H * (pl.low ? 0.52 : 0.34), s: 0.75 }; // ↓ in Flow is a body blow
    if (pl.side < 0) L = to(L, aim, u); else R = to(R, aim, u);
  }
  if (game && game.over === 'lose') { const u = clamp((now - game.overAt) / 0.6, 0, 1); L.y += u * 200; R.y += u * 200; }
  g.save();
  g.translate(0, oy);
  g.lineJoin = 'round';
  g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 3.5;
  for (const [gl, side] of [[L, -1], [R, 1]]) {
    // the arm runs back to your shoulder below the screen, narrowing towards the glove (perspective)
    const ex = 200 + side * 150, ey = H + 60, a = Math.atan2(ey - gl.y, ex - gl.x), nx = -Math.sin(a), ny = Math.cos(a);
    const w1 = 28 * gl.s, w2 = 70, sd = seed + side * 7;
    roughPolyPath(g, [gl.x + nx * w1 / 2, gl.y + ny * w1 / 2, ex + nx * w2 / 2, ey + ny * w2 / 2, ex - nx * w2 / 2, ey - ny * w2 / 2, gl.x - nx * w1 / 2, gl.y - ny * w1 / 2], sd, 1.2);
    g.fill(); g.stroke();
    roughEllPath(g, gl.x, gl.y, 30 * gl.s, 27 * gl.s, 0, sd + 1, 1.2); g.fill(); g.stroke();
    roughEllPath(g, gl.x - side * 20 * gl.s, gl.y - 4 * gl.s, 10 * gl.s, 14 * gl.s, 0, sd + 2, 1); g.fill(); g.stroke();
  }
  g.restore();
}

const flowStripH = () => Math.max(86, view.H * FLOW_STRIP);
function drawZones(now) {
  const { W, H } = view, top = flowStripH(), split = H * ZONE_SPLIT, inFlow = !!game.flow, ready = game.rhythm >= 100 && !inFlow;
  const zones = [
    ['flow', 0, 0, W, top, '179,38,44', ''],
    ['block', 0, top, W / 2, split - top, '120,140,200', inFlow ? '←' : 'BLOCK'],
    ['attack', W / 2, top, W / 2, split - top, '179,38,44', inFlow ? '→' : 'ATTACK'],
    ['dodge', 0, split, W, H - split, '60,140,90', inFlow ? '↓' : 'DODGE'],
  ];
  for (const [id, x, y, w, h, rgb, label] of zones) {
    const flash = Math.max(0, 1 - (now - (game.flashes[id] || -9)) / 0.25);
    const glow = id === 'flow' && ready ? 0.12 + 0.08 * Math.sin(now * 8) : 0;
    if (!settings.zones && flash <= 0 && glow <= 0) continue;
    g.fillStyle = `rgba(${rgb},${0.05 + glow + flash * 0.16})`;
    g.fillRect(x, y, w, h);
    if (!settings.zones) continue;
    g.strokeStyle = 'rgba(21,18,15,0.18)'; g.lineWidth = 1.5;
    g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    if (!label) continue;
    g.textAlign = 'center';
    if (inFlow) { g.fillStyle = 'rgba(21,18,15,0.3)'; g.font = '700 54px system-ui, sans-serif'; g.fillText(label, x + w / 2, y + h - (id === 'dodge' ? 40 : 30)); }
    else { g.fillStyle = 'rgba(21,18,15,0.5)'; g.font = `15px ${FONT}`; g.fillText(label, x + w / 2, y + h - 12); }
  }
}

// Flying ink streaks while in Flow
function drawSpeedLines(now, nb) {
  const f = game.flow, fade = clamp(Math.min(nb - f.first + 1, f.end - nb), 0, 1);
  if (fade <= 0) return;
  for (let i = 0; i < 16; i++) {
    const y = -40 + (hash(i * 3.1) + 1) / 2 * view.H * 0.75, len = 120 + 70 * (hash(i * 5.7) + 1), sp = 900 + 250 * (hash(i * 9.1) + 1);
    const x = 460 - ((now * sp + (hash(i) + 1) * 400) % 900);
    dryBrush(g, [{ x, y }, { x: x + len * 0.5, y }, { x: x + len, y }], 4 + 3 * (hash(i * 2.3) + 1), i % 5 === 0 ? RED : INK, 0.55 * fade, i, u => 1 - u * 0.8);
  }
}

// The current Flow combo: its name, its arrows, and a red line that sweeps across them in time
function drawFlowPanel(now) {
  const f = game.flow, nb = beatAt(now), c = f.combos.find(c => nb < c.start + 4.6);
  if (!c) return;
  const top = flowStripH() + 10, sp = 40, x0 = 200 - sp * 3.5;
  g.fillStyle = 'rgba(239,232,220,0.88)';
  g.beginPath(); g.roundRect(24, top, 352, 112, 12); g.fill();
  g.textAlign = 'center'; g.fillStyle = INK; g.font = `26px ${FONT}`;
  g.fillText(c.name.toUpperCase(), 200, top + 33);
  g.textAlign = 'right'; g.fillStyle = WASH; g.font = `12px ${FONT}`;
  g.fillText(`combo ${f.combos.indexOf(c) + 1} of 3`, 366, top + 104);
  g.textAlign = 'center'; g.font = '900 34px system-ui, sans-serif';
  const live = c.state !== 'dropped' && c.state !== 'done';
  c.pattern.forEach((k, i) => {
    const x = x0 + i * sp, y = top + 78;
    if (k === '.') { g.fillStyle = 'rgba(21,18,15,0.3)'; g.beginPath(); g.arc(x, y - 10, 3, 0, Math.PI * 2); g.fill(); return; }
    g.fillStyle = c.hits.includes(i) ? RED : c.state === 'dropped' ? 'rgba(21,18,15,0.22)' : INK;
    g.fillText({ L: '←', R: '→', D: '↓' }[k], x, y);
    if (i === c.next && live) { // approach ring: closes in on the next arrow and lands on it when it's time to hit
      const prev = c.hits.length ? c.start + c.hits[c.hits.length - 1] * 0.5 : c.start - 3, due = c.start + i * 0.5;
      const u = clamp((due - nb) / (due - prev), 0, 1);
      g.strokeStyle = RED; g.lineWidth = 3; g.globalAlpha = 0.35 + 0.65 * (1 - u);
      g.beginPath(); g.arc(x, y - 11, 19 + 50 * u, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }
  });
  const ph = x0 + (nb - c.start) / 0.5 * sp;
  if (ph > 30 && ph < 370 && live) {
    g.strokeStyle = RED; g.lineWidth = 3;
    g.beginPath(); g.moveTo(ph, top + 46); g.lineTo(ph, top + 92); g.stroke();
  }
  if (nb >= c.start - 3 && nb < c.start && live) { // big "3, 2, 1" in time with the ticks
    const left = Math.ceil(c.start - nb), age = nb - (c.start - left);
    g.font = `${Math.round(90 * (1 + Math.max(0, 0.3 - age) ))}px ${FONT}`;
    g.globalAlpha = 1 - age * 0.6;
    g.lineWidth = 8; g.strokeStyle = PAPER; g.lineJoin = 'round';
    g.strokeText(String(left), 200, view.H * 0.47);
    g.fillStyle = left === 1 ? RED : INK; g.fillText(String(left), 200, view.H * 0.47);
    g.globalAlpha = 1;
  }
}

function drawHud() {
  const W = view.W, seed = Math.floor(performance.now() / 90);
  const bar = (x, w, frac, color, label, alignRight, sd) => {
    const fw = Math.max(0, w * frac);
    g.fillStyle = color;
    if (fw > 1) { roughPolyPath(g, [alignRight ? x + w - fw : x, 16, alignRight ? x + w : x + fw, 16, alignRight ? x + w : x + fw, 27, alignRight ? x + w - fw : x, 27], sd, 0.8); g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 2;
    roughPolyPath(g, [x - 2, 14, x + w + 2, 14, x + w + 2, 29, x - 2, 29], sd + 3, 0.8); g.stroke();
    g.fillStyle = INK; g.font = `13px ${FONT}`; g.textAlign = alignRight ? 'right' : 'left';
    g.fillText(label, alignRight ? x + w : x, 46);
  };
  bar(14, 150, game.me / 100, INK, 'YOU', false, seed);
  bar(W - 164, 150, game.foe / FOE_HP, RED, 'THE METRONOME', true, seed + 9);
  // Rhythm bar (drains while Flow lasts)
  const ready = game.rhythm >= 100 && !game.flow;
  const fr = game.flow ? clamp((game.flow.end - beatAt(clock())) / FLOW_LEN, 0, 1) : game.rhythm / 100;
  g.fillStyle = 'rgba(21,18,15,0.12)'; g.fillRect(14, 55, W - 28, 9);
  g.fillStyle = game.flow || ready ? RED : INK; g.fillRect(14, 55, (W - 28) * fr, 9);
  g.fillStyle = ready ? RED : INK; g.font = `12px ${FONT}`; g.textAlign = 'center';
  g.fillText(game.flow ? 'FLOW' : ready ? 'RHYTHM FULL! TAP HERE FOR FLOW' : 'RHYTHM', 200, 78);
}

function drawTexts(now) {
  const H = view.H, rows = { low: 0, big: 0, teach: 0, combo: 0 };
  game.texts = game.texts.filter(x => now - x.t0 < x.life);
  g.textAlign = 'center';
  for (const x of game.texts) {
    const age = (now - x.t0) / x.life, alpha = age < 0.75 ? 1 : 1 - (age - 0.75) / 0.25;
    const row = rows[x.where]++;
    let px = 200, y;
    if (x.where === 'big') y = H * 0.42;
    else if (x.where === 'teach') y = H * 0.69;
    else if (x.where === 'combo') { px = clamp(headPos.x + 95, 50, 350); y = headPos.y - 40 - age * 30; }
    else y = H * 0.84 - row * 34 - age * 20;
    const pop = Math.max(0, 0.15 - age * 0.6);
    const size = (x.where === 'big' ? (x.size > 30 ? x.size : 64) : x.size) * (1 + pop);
    g.globalAlpha = Math.max(0, alpha);
    const lines = x.text.split('\n');
    if (x.where === 'teach') {
      g.fillStyle = 'rgba(21,18,15,0.88)';
      g.beginPath(); g.roundRect(20, y - 21, 360, lines.length * 21 + 16, 10); g.fill();
      g.font = `700 ${size}px system-ui, sans-serif`;
    } else g.font = `${size}px ${FONT}`;
    for (const line of lines) {
      if (x.where !== 'teach') { g.lineWidth = 6; g.strokeStyle = PAPER; g.lineJoin = 'round'; g.strokeText(line, px, y); }
      g.fillStyle = x.color; g.fillText(line, px, y);
      y += 21;
    }
    g.globalAlpha = 1;
  }
}

let lastFrame = performance.now(), prevDrawn = { ...pose }, vel = { l: [0, 0], r: [0, 0] };
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  if (mode === 'fight' && game && !paused) update();
  const now = clock(), nb = game ? beatAt(now) : now / 0.6;
  frozenNow = paused || (!!game && ts / 1000 < game.hitStop); // the tiny freeze on a landed punch
  if (!frozenNow) {
    pose = mix(pose, game ? targetPose(now, nb) : bobbing(nb), 1 - Math.exp(-dt * 28));
    if (game) { stepKnock(dt); stepInk(dt); game.zoom *= Math.exp(-dt * 7); game.shake = Math.max(0, game.shake - dt * 4); }
  }
  const kn = game && game.knock;
  const drawn = kn ? { ...pose, x: pose.x + kn.x, y: pose.y + kn.y, rot: pose.rot + clamp(kn.rot, -0.6, 0.6), hr: pose.hr + clamp(kn.hr, -0.9, 0.9) } : pose;
  if (!frozenNow && dt > 0) {
    vel = { l: [(drawn.lx - prevDrawn.lx) / dt, (drawn.ly - prevDrawn.ly) / dt], r: [(drawn.rx - prevDrawn.rx) / dt, (drawn.ry - prevDrawn.ry) / dt] };
    prevDrawn = drawn;
  }

  // ducking moves the camera down, so the world rises
  const pl = game && game.player, since = pl ? now - pl.t0 : 9;
  const duck = pl && pl.type === 'dodge' && since < 0.42 ? Math.sin(Math.PI * since / 0.42) : 0;
  let sx = 0, sy = 0;
  if (game && game.shake > 0) { sx = (Math.random() - 0.5) * 16 * game.shake; sy = (Math.random() - 0.5) * 16 * game.shake; }

  const s = view.dpr * view.scale, z = 1 + (game ? game.zoom : 0), fy = view.H * 0.3;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.save();
  g.translate(200 + sx, fy + sy); g.scale(z, z); g.translate(-200, -fy);
  camInv = g.getTransform().invertSelf();
  g.drawImage(bg, -BGM, -BGM - duck * 30, view.W + BGM * 2, view.H + BGM * 2);
  if (game) drawEnso(nb);
  if (game && game.flow) drawSpeedLines(now, nb);
  drawOpponent(drawn, 0, -duck * 70, vel);
  if (game) { drawTrails(); drawInk(); drawSlashes(now); }
  drawPlayer(now, nb, duck * 60);
  g.restore();
  if (mode === 'fight' && game) {
    drawZones(now);
    const hurtA = Math.max(0, 1 - (now - game.hurtAt) / 0.35);
    if (hurtA > 0) { g.fillStyle = `rgba(179,38,44,${0.22 * hurtA})`; g.fillRect(0, 0, view.W, view.H); }
    drawHud();
    if (game.flow) drawFlowPanel(now);
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
    ['Punches on the beat', `${st.onBeat} of ${st.punches}`], ['Full measures', st.measures], ['Flow combos landed', `${st.combos} of ${st.flows * 3}`], ['Hits taken', st.hitsTaken],
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
  ring.style.borderColor = i < CAL_LEAD - 0.5 ? WASH : RED;
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
  return y < flowStripH() ? 'flow' : y > view.H * ZONE_SPLIT ? 'dodge' : x < view.W / 2 ? 'block' : 'attack';
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); act(zoneAt(e.clientX, e.clientY)); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (cal && !$('#cal').hidden) { if (e.key === ' ' || e.key.startsWith('Arrow')) { e.preventDefault(); calTap(); } return; }
  const map = { ArrowLeft: 'block', a: 'block', ArrowRight: 'attack', d: 'attack', ArrowDown: 'dodge', s: 'dodge', ' ': 'dodge', ArrowUp: 'flow', w: 'flow' };
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
if (document.fonts) document.fonts.load(`20px ${FONT}`).catch(() => {});

resize();
refreshMenu();
requestAnimationFrame(frame);
