// Clickbait Campus: music and sound effects.
// Music is the Suno tracks in audio/music/. Effects are soft, rounded tones made right here in code,
// so there are no sound files to download or license.
// Sound.music(name) picks what plays, Sound.play(name) plays an effect, Sound.setStress(n) muffles the music.
(function () {
  'use strict';
  const TRACKS = {
    title: { file: 'title', loop: true },
    'study-a': { file: 'study-a', next: 'study-b' },
    'study-b': { file: 'study-b', next: 'study-a' },
    crunch: { file: 'crunch', loop: true },
    'ending-hopeful': { file: 'ending-hopeful', cut: 60 },
    'ending-moody': { file: 'ending-moody', cut: 60 }
  };
  const MUSIC_VOL = 0.35, SFX_VOL = 0.5, FADE = 1.5;

  // Settings are remembered per browser. ?sound=off (the teacher link) starts silent without saving.
  const settings = { music: true, sfx: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('cc-sound') || '{}')); } catch (e) { /* storage blocked */ }
  // A class code also starts silent, so a room full of laptops stays quiet. Choices made then aren't saved.
  const q = new URLSearchParams(location.search);
  const temporary = q.get('sound') === 'off' || !!q.get('code');
  if (temporary) { settings.music = false; settings.sfx = false; }
  const save = () => { if (temporary) return; try { localStorage.setItem('cc-sound', JSON.stringify(settings)); } catch (e) { /* storage blocked */ } };

  let ctx = null, musicBus, filter, sfxBus, noiseBuf;
  const players = {};
  let current = null, wanted = null, paused = false, stress = 0;

  // Browsers only allow sound after the first click, so everything starts on that click
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 20000; filter.Q.value = 0.7;
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? MUSIC_VOL : 0;
    filter.connect(musicBus).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setStress(stress);
    if (wanted) startTrack(wanted);
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);

  // ---------- Music ----------
  function player(key) {
    if (players[key]) return players[key];
    const el = new Audio(`audio/music/${TRACKS[key].file}.mp3`);
    el.preload = 'none';
    el.loop = !!TRACKS[key].loop;
    const gain = ctx.createGain(); gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain).connect(filter);
    el.addEventListener('ended', () => { if (current === key && TRACKS[key].next) startTrack(TRACKS[key].next); });
    el.addEventListener('timeupdate', () => { // endings play their first minute, then fade away
      if (current === key && TRACKS[key].cut && el.currentTime > TRACKS[key].cut && !el.fading) { el.fading = true; fadeOut(key); }
    });
    return (players[key] = { el, gain });
  }

  function fadeOut(key) {
    const p = players[key];
    if (!p) return;
    const now = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + FADE);
    setTimeout(() => { if (current !== key) p.el.pause(); }, FADE * 1000 + 50);
  }

  function startTrack(key) {
    wanted = key;
    if (!ctx || !settings.music) return;
    if (current === key && !players[key].el.paused) return;
    if (current && current !== key) { const old = current; current = null; fadeOut(old); }
    const p = player(key);
    current = key;
    p.el.fading = false;
    p.el.currentTime = 0;
    const now = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(0, now);
    p.gain.gain.linearRampToValueAtTime(1, now + FADE);
    p.el.play().catch(() => { /* not allowed yet; the next click retries */ });
  }

  // 'study' alternates the two study tracks; other names map straight to a track
  function music(name) {
    if (name === 'study') {
      if (current === 'study-a' || current === 'study-b') return;
      name = Math.random() < 0.5 ? 'study-a' : 'study-b';
    }
    if (!name) { wanted = null; if (current) { const old = current; current = null; fadeOut(old); } return; }
    startTrack(name);
  }

  // High stress muffles the music, as if your head is full. Nothing changes below 60.
  function setStress(s) {
    stress = s;
    if (!ctx) return;
    const f = s < 60 ? 20000 : 20000 * Math.pow(0.045, (s - 60) / 40);
    filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.6);
  }

  function setPaused(p) {
    paused = p;
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(settings.music ? (p ? MUSIC_VOL * 0.3 : MUSIC_VOL) : 0, ctx.currentTime, 0.3);
  }

  // ---------- Effects ----------
  // A soft mallet note: a sine with a quiet overtone and a quick fade, like a marimba
  function mallet(freq, at = 0, vol = 0.5, dur = 0.5, type = 'sine') {
    const t = ctx.currentTime + at;
    [[freq, 1], [freq * 4, 0.12]].forEach(([f, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (v < 1 ? dur * 0.4 : dur));
      o.connect(g).connect(sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function glide(from, to, dur, vol = 0.4, type = 'sine', at = 0) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function hush(dur, fromHz, toHz, vol = 0.25, at = 0) { // filtered noise: whooshes and pencil scratches
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(fromHz, t);
    bp.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const N = { D4: 293.7, F4: 349.2, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, B5: 987.8, C6: 1046.5, E6: 1318.5, G6: 1568 };
  const SOUNDS = {
    mail: () => { mallet(N.C6, 0, 0.35); mallet(N.G6, 0.09, 0.3); },
    text: () => { glide(700, 620, 0.09, 0.3); glide(700, 620, 0.09, 0.3, 'sine', 0.13); },
    quiz: () => { mallet(N.C5, 0, 0.4); mallet(N.E5, 0.08, 0.4); mallet(N.G5, 0.16, 0.4, 0.7); },
    news: () => { mallet(N.G4, 0, 0.45, 0.4, 'triangle'); mallet(N.C5, 0.12, 0.45, 0.4, 'triangle'); mallet(N.E5, 0.24, 0.45, 0.8, 'triangle'); },
    sent: () => hush(0.28, 500, 2600, 0.22),
    submit: () => { hush(0.07, 3500, 3000, 0.15); hush(0.07, 3800, 3200, 0.15, 0.09); mallet(N.E5, 0.2, 0.4); mallet(N.B5, 0.28, 0.35, 0.7); },
    coin: () => { mallet(N.B5, 0, 0.35, 0.2); mallet(N.E6, 0.07, 0.35, 0.6); },
    spend: () => { mallet(N.G5, 0, 0.3, 0.3, 'triangle'); mallet(N.D5, 0.1, 0.3, 0.5, 'triangle'); },
    stressUp: () => { glide(150, 85, 0.4, 0.5); glide(159, 90, 0.35, 0.18, 'triangle'); },
    stressDown: () => { mallet(N.E5, 0, 0.3, 0.6); mallet(N.A5, 0.12, 0.3, 0.9); },
    scam: () => { [0, 0.12, 0.24].forEach((at, i) => mallet(i % 2 ? 392 : 523, at, 0.4, 0.14, 'triangle')); glide(220, 110, 0.5, 0.3, 'triangle', 0.36); },
    missed: () => glide(392, 175, 0.75, 0.4, 'triangle'),
    endGood: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => mallet(f, i * 0.12, 0.4, i === 3 ? 1.2 : 0.5)),
    endBad: () => [N.A4, N.F4, N.D4].forEach((f, i) => mallet(f, i * 0.2, 0.4, i === 2 ? 1.2 : 0.5, 'triangle')),
    tick: () => mallet(1800, 0, 0.12, 0.05),
    jump: () => glide(380, 760, 0.13, 0.22),
    point: () => mallet(N.A5, 0, 0.3, 0.25),
    bump: () => glide(170, 80, 0.22, 0.4)
  };

  // Big moments (a scam, a missed quiz) briefly hold back the smaller sounds they cause
  const BIG = new Set(['scam', 'missed', 'endGood', 'endBad']);
  let holdUntil = 0;
  const lastPlayed = {};
  function play(name) {
    if (!ctx || !settings.sfx || !SOUNDS[name]) return;
    const now = performance.now();
    if (!BIG.has(name) && now < holdUntil) return;
    if (now - (lastPlayed[name] || 0) < 120) return;
    lastPlayed[name] = now;
    if (BIG.has(name)) holdUntil = now + 700;
    SOUNDS[name]();
  }

  function toggle(which) {
    settings[which] = !settings[which];
    save();
    if (which === 'music') {
      if (!ctx) return settings;
      if (settings.music) { musicBus.gain.setTargetAtTime(paused ? MUSIC_VOL * 0.3 : MUSIC_VOL, ctx.currentTime, 0.2); if (wanted) startTrack(wanted); }
      else { musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.2); if (current) { players[current].el.pause(); current = null; } }
    }
    return settings;
  }

  // For testing: what is playing right now and how muffled it is
  const status = () => ({ running: !!ctx && ctx.state, track: current, playing: !!(current && !players[current].el.paused), muffleHz: ctx ? Math.round(filter.frequency.value) : null });

  window.Sound = { music, play, setStress, setPaused, toggle, settings, status };
})();
