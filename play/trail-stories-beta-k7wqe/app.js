// Trail Stories test: walk one trail section with a slider.
// Two parts: "The Walk" (every stop is read aloud when you reach it) and "Field guide" (browse; nothing plays on its own).
const VERSION = '0.3';
const S = window.SECTION;
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TOPICS = [['history', 'History'], ['people', 'People'], ['nature', 'Nature'], ['land', 'The land'], ['fun', 'Fun facts']];
const KIND = { history: 'History', people: 'People', nature: 'Nature', land: 'The land', fun: 'Fun fact' };
const GUIDE = [['nature', 'Nature'], ['rocks', 'Under your feet'], ['archives', 'Archives & places']];
const GROUPS = [['all', 'Everything'], ['plant', 'Plants'], ['bird', 'Birds'], ['fungus', 'Fungi'], ['animal', 'Other animals']];
const TOTAL = S.trail.at(-1).mi;
const REACHED = 0.02; // a stop counts as reached this close to its spot
const CATCH_UP = 0.15; // after a jump, stops this far behind you are still read; ones further back count as passed

// ---------- saved settings (this device only) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('ts2.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ts2.' + k, JSON.stringify(v)); } catch {} },
};
const state = {
  mile: 0, view: store.get('view', 'walk'), guide: store.get('guide', 'nature'), month: store.get('month', new Date().getMonth() + 1),
  group: 'all', topics: new Set(store.get('topics', TOPICS.map(([t]) => t))),
  heard: new Set(), passed: new Set(), open: new Set(), walking: false,
};

// ---------- trail helpers ----------
const pointAt = (mi) => S.trail.find((p) => p.mi >= mi) || S.trail.at(-1);
const reached = (s, mi = state.mile) => mi >= s.mi - REACHED;
const willRead = (s) => s.intro || state.topics.has(s.tab);
const zoneAt = (mi) => S.nature.zones.find((z) => mi >= z.from && mi <= z.to) || S.nature.zones.at(-1);
const rockAt = (mi) => S.rocks.find((r) => mi >= r.from && mi <= r.to + 0.25) || S.rocks.at(-1);
const placeNear = (mi) => { const p = S.places.slice().sort((a, b) => Math.abs(a.mi - mi) - Math.abs(b.mi - mi))[0]; return p && Math.abs(p.mi - mi) < 0.35 ? p.name : ''; };
const away = (mi) => { const d = mi - state.mile; return Math.abs(d) < 0.05 ? 'Here' : `${Math.abs(d).toFixed(1)} mi ${d > 0 ? 'ahead' : 'back'}`; };

// ---------- theme and colors ----------
const C = {};
function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['paper', 'card', 'ink', 'ink-2', 'forest', 'line', 'trail-ahead', 'blaze', 'bark']) C[k] = cs.getPropertyValue('--' + k).trim();
}

// ---------- map and elevation ----------
const map = $('#map'), prof = $('#profile');
let proj = null;
function canvas(cv) {
  const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
function drawMap() {
  const { ctx, w, h } = canvas(map);
  const lats = S.trail.map((p) => p.lat), lngs = S.trail.map((p) => p.lng);
  const s0 = Math.min(...lats), n0 = Math.max(...lats), w0 = Math.min(...lngs), e0 = Math.max(...lngs);
  const k = Math.cos(((s0 + n0) / 2) * Math.PI / 180), pad = 36;
  const sc = Math.min((w - pad * 2) / ((e0 - w0) * k), (h - pad * 2) / (n0 - s0));
  const ox = (w - (e0 - w0) * k * sc) / 2, oy = (h - (n0 - s0) * sc) / 2;
  proj = (lat, lng) => [ox + (lng - w0) * k * sc, oy + (n0 - lat) * sc];
  ctx.clearRect(0, 0, w, h);
  const line = (from, to, color, width) => {
    ctx.beginPath(); let first = true;
    for (const p of S.trail) if (p.mi >= from && p.mi <= to) { const [x, y] = proj(p.lat, p.lng); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  line(0, TOTAL, C['trail-ahead'], 6);
  line(0, state.mile, C.forest, 6);
  // a white blaze at each stop (filled green once heard)
  for (const s of S.stories) {
    const p = pointAt(s.mi), [x, y] = proj(p.lat, p.lng), big = speaking?.id === s.id;
    const bw = big ? 9 : 6, bh = big ? 15 : 10;
    ctx.fillStyle = state.heard.has(s.id) ? C.forest : C.blaze; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh); ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
  }
  ctx.font = '700 14px "Source Sans 3", system-ui, sans-serif'; ctx.textBaseline = 'middle';
  const taken = [];
  for (const pl of S.places) {
    const p = pointAt(pl.mi), [x, y] = proj(p.lat, p.lng), tw = ctx.measureText(pl.name).width;
    // Try right-above, left-above, right-below, left-below; take the first spot that doesn't cover another label.
    const spots = [[x + 10, y - 14], [x - 10 - tw, y - 14], [x + 10, y + 14], [x - 10 - tw, y + 14]];
    const fits = ([lx, ly]) => lx >= 2 && lx + tw <= w - 2 && !taken.some((r) => lx < r.x + r.w + 4 && lx + tw + 4 > r.x && Math.abs(ly - r.y) < 16);
    const [lx, ly] = spots.find(fits) || spots[0];
    taken.push({ x: lx, y: ly, w: tw });
    ctx.textAlign = 'left';
    ctx.lineWidth = 5; ctx.strokeStyle = C.card; ctx.strokeText(pl.name, lx, ly);
    ctx.fillStyle = C.ink; ctx.fillText(pl.name, lx, ly);
  }
  const me = pointAt(state.mile), [mx, my] = proj(me.lat, me.lng);
  ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fillStyle = C.card; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fillStyle = C.forest; ctx.fill();
  ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.font = '700 13px "Source Sans 3", system-ui, sans-serif';
  ctx.fillText('N ↑', 10, 16);
  const barPx = (1 / 69.17) * sc; // one mile is about 1/69 of a degree of latitude
  ctx.fillRect(10, h - 14, barPx, 3); ctx.fillText('1 mile', 14 + barPx, h - 12);
  ctx.textAlign = 'right'; ctx.fillText('Tennessee ↑  North Carolina ↓', w - 10, h - 12);
}
function drawProfile() {
  const { ctx, w, h } = canvas(prof);
  const fts = S.trail.map((p) => p.ft), lo = Math.min(...fts) - 100, hi = Math.max(...fts) + 100;
  const X = (mi) => 8 + (mi / TOTAL) * (w - 16), Y = (ft) => 6 + (1 - (ft - lo) / (hi - lo)) * (h - 24);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.moveTo(X(0), h - 18); for (const p of S.trail) ctx.lineTo(X(p.mi), Y(p.ft)); ctx.lineTo(X(TOTAL), h - 18); ctx.closePath();
  ctx.fillStyle = C.line; ctx.fill();
  ctx.beginPath(); S.trail.forEach((p, i) => (i ? ctx.lineTo(X(p.mi), Y(p.ft)) : ctx.moveTo(X(p.mi), Y(p.ft))));
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.forest; ctx.fillRect(X(state.mile) - 1.5, 4, 3, h - 22);
  ctx.beginPath(); ctx.arc(X(state.mile), Y(pointAt(state.mile).ft), 5, 0, Math.PI * 2); ctx.fill();
  ctx.font = '600 13px "Source Sans 3", system-ui, sans-serif'; ctx.fillStyle = C['ink-2']; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('mile 0', X(0), h - 3);
  ctx.textAlign = 'right'; ctx.fillText(`mile ${TOTAL.toFixed(1)}`, X(TOTAL), h - 3);
  ctx.textAlign = 'center'; ctx.fillText(`${Math.max(...fts).toLocaleString()} ft high · ${Math.min(...fts).toLocaleString()} ft low`, w / 2, h - 3);
}
function mileFromMap(ev) {
  if (!proj) return;
  const r = map.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  let best = 0, d = Infinity;
  for (const p of S.trail) { const [px, py] = proj(p.lat, p.lng), dd = (px - x) ** 2 + (py - y) ** 2; if (dd < d) { d = dd; best = p.mi; } }
  setMile(best, 'jump');
}
let dragging = false;
map.addEventListener('pointerdown', (e) => { dragging = true; map.setPointerCapture(e.pointerId); mileFromMap(e); });
map.addEventListener('pointermove', (e) => dragging && mileFromMap(e));
map.addEventListener('pointerup', () => (dragging = false));

// ---------- reading aloud ----------
const synth = window.speechSynthesis;
const queue = [];
let speaking = null, walkTimer = null, pausedForStory = false;
const voices = () => (synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []);
function fillVoices() {
  const want = store.get('voice', ''), vs = voices();
  $('#voice').innerHTML = vs.length ? vs.map((v) => `<option${v.name === want ? ' selected' : ''}>${esc(v.name)}</option>`).join('') : '<option>This browser has no voices</option>';
}
if (synth) { fillVoices(); synth.onvoiceschanged = fillVoices; }
// Split only where a sentence really ends: the period in "11.6" or after "St." is not an ending (same rule as tools/voice/narrate.py).
function sentences(text) {
  const out = [];
  for (const part of text.trim().split(/(?<=[.!?]["”']?)\s+/)) {
    if (out.length && (/\b(St|Mt|Mr|Mrs|Dr|Jr|Sr|U\.S)\.$/.test(out.at(-1)) || /^[a-z]/.test(part))) out[out.length - 1] += ' ' + part;
    else if (part) out.push(part);
  }
  return out;
}
function say(item) { queue.push(item); if (!speaking) next(); }
function next() {
  const item = queue.shift() || null;
  speaking = item;
  $('#nowPlaying').hidden = !item;
  if (item) $('#nowTitle').textContent = item.title;
  pausedForStory = !!item && state.walking; // the walk waits while a stop is read
  updateWalk();
  syncGuideButtons();
  drawMap();
  if (!item) return;
  if (recorded(item.id)) return play(item);
  speakWithDevice(item);
}
// Recorded narration (Kokoro). A stop without a recording, or one that fails to load, uses the device's voice.
const AUDIO = window.AUDIO || { voices: [], files: {} };
let player = null;
const narrator = () => $('#narrator').value;
const recorded = (id) => !!AUDIO.files[narrator()]?.includes(id);
function play(item) {
  player = new Audio(`audio/${narrator()}/${item.id}.mp3`);
  player.playbackRate = +$('#rate').value;
  const done = (fn) => () => { if (speaking === item) fn(); };
  player.onended = done(() => { player = null; finish(item); });
  player.onerror = done(() => { player = null; speakWithDevice(item); });
  player.play().catch(done(() => { player = null; speakWithDevice(item); }));
}
function speakWithDevice(item) {
  if (!synth) { finish(item); return; }
  const v = voices().find((x) => x.name === $('#voice').value);
  // Some browsers cut off long speech, so read a sentence at a time.
  const parts = sentences(item.title + '. ' + item.text);
  let i = 0;
  const one = () => {
    if (speaking !== item) return;
    if (i >= parts.length) return finish(item);
    const u = new SpeechSynthesisUtterance(parts[i++].trim());
    if (v) { u.voice = v; u.lang = v.lang; } // Android Chrome ignores the voice unless the language matches it
    u.rate = +$('#rate').value;
    u.onend = one; u.onerror = one;
    synth.speak(u);
  };
  one();
}
function finish(item) { if (S.stories.includes(item)) state.heard.add(item.id); next(); }
function stopSpeaking() { queue.length = 0; speaking = null; player?.pause(); player = null; synth?.cancel(); next(); }
$('#stopBtn').onclick = stopSpeaking;

// ---------- walking ----------
function setWalking(on) {
  state.walking = on;
  clearInterval(walkTimer);
  $('#walkBtn .ic').textContent = on ? '❚❚' : '▶';
  $('#walkBtn .tx').textContent = on ? 'Pause' : 'Walk';
  if (!on) { pausedForStory = false; return; }
  if (state.mile >= TOTAL) setMile(0, 'jump');
  catchUp();
  pausedForStory = !!speaking;
  walkTimer = setInterval(() => {
    if (pausedForStory) return;
    setMile(Math.min(TOTAL, state.mile + +$('#speed').value / 4), 'walk');
    if (state.mile >= TOTAL && !speaking) setWalking(false);
  }, 250);
}
$('#walkBtn').onclick = () => setWalking(!state.walking);
// Read stops you're standing at (or just past) that haven't been read yet.
function catchUp() {
  if (!$('#autoRead').checked) return;
  for (const s of S.stories) {
    if (reached(s) && state.mile - s.mi <= CATCH_UP && willRead(s) && !state.heard.has(s.id) && !queue.includes(s) && speaking !== s) { state.passed.delete(s.id); say(s); }
  }
}

function setMile(mi, how) {
  const before = state.mile;
  state.mile = Math.max(0, Math.min(TOTAL, +(+mi).toFixed(2)));
  $('#mile').value = state.mile;
  if (state.mile < before) {
    // Going back: stops ahead of you can be heard again.
    for (const s of S.stories) if (!reached(s)) { state.heard.delete(s.id); state.passed.delete(s.id); }
  } else {
    for (const s of S.stories) {
      if (!reached(s) || reached(s, before)) continue; // only stops you've just walked past
      const tooFar = how === 'jump' && state.mile - s.mi > CATCH_UP;
      if (tooFar || !$('#autoRead').checked || !willRead(s)) state.passed.add(s.id);
      else if (!state.heard.has(s.id) && !queue.includes(s) && speaking !== s) say(s);
    }
  }
  const p = pointAt(state.mile);
  $('#mileRead').textContent = `Mile ${state.mile.toFixed(1)} of ${TOTAL.toFixed(1)}`;
  $('#elevRead').textContent = `${p.ft.toLocaleString()} ft`;
  $('#placeRead').textContent = placeNear(state.mile);
  drawMap(); drawProfile();
  updateWalk();
  if (state.view === 'guide') renderGuide(true);
}
$('#mile').max = TOTAL;
$('#mile').addEventListener('input', (e) => setMile(e.target.value, 'jump'));

// ---------- The Walk: every stop in trail order, one line each ----------
function rowBody(s) {
  return `<p>${esc(s.text)}</p>
    ${s.record ? `<div class="record"><h3>For the record</h3><p>${esc(s.record)}</p></div>` : ''}
    ${s.note ? `<p class="note">To do: ${esc(s.note)}</p>` : ''}
    <div class="actions"><button data-listen="${esc(s.id)}">${speaking?.id === s.id ? '■ Stop' : '▶ Listen now'}</button>
      ${s.checked ? '' : '<span class="draft">Draft · not fact-checked yet</span>'}</div>
    ${recorded(s.id) ? '<p class="draft">Narrated by a computer-generated voice (Kokoro).</p>' : ''}
    <details><summary>Where this comes from</summary><ul>${s.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join('')}</ul></details>`;
}
function buildWalk() {
  $('#topics').innerHTML = TOPICS.map(([t, l]) => `<button class="chip" data-topic="${t}" aria-pressed="${state.topics.has(t)}">${l}</button>`).join('');
  $('#stops').innerHTML = S.stories.map((s) => `<li class="row" data-id="${esc(s.id)}">
      <button class="row-head" aria-expanded="false" data-toggle="${esc(s.id)}">
        <span class="blaze" aria-hidden="true"></span>
        <span class="row-title"><span class="kind">${s.intro ? 'Introduction · always read' : KIND[s.tab]}</span><span class="name">${esc(s.title)}</span></span>
        <span class="status"></span>
      </button>
      <div class="row-body" hidden></div></li>`).join('') + '<li class="here"></li>';
}
let lastPlaying = null;
function updateWalk() {
  const list = $('#stops'), here = list.querySelector('.here');
  if (!here) return;
  // Keep the "You are here" line between the stops behind you and the stops ahead.
  const nextStop = S.stories.find((s) => !reached(s));
  const anchor = nextStop ? list.querySelector(`[data-id="${CSS.escape(nextStop.id)}"]`) : null;
  if (anchor ? here.nextElementSibling !== anchor : here !== list.lastElementChild) list.insertBefore(here, anchor);
  here.textContent = `You are here · mile ${state.mile.toFixed(1)}`;
  for (const s of S.stories) {
    const li = list.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
    const playing = speaking?.id === s.id, heard = state.heard.has(s.id), dist = Math.max(0.1, s.mi - state.mile).toFixed(1);
    li.querySelector('.status').textContent = playing ? 'Reading now' : heard ? 'Heard ✓'
      : !willRead(s) ? (reached(s) ? 'Not read aloud' : `in ${dist} mi · not read aloud`)
      : state.passed.has(s.id) ? 'Passed' : queue.includes(s) ? 'Up next' : reached(s) ? 'Here' : `in ${dist} mi`;
    li.classList.toggle('heard', heard); li.classList.toggle('playing', playing); li.classList.toggle('muted', !willRead(s));
    // A row opens only when you open it, or while it's being read.
    const open = playing || state.open.has(s.id), body = li.querySelector('.row-body');
    if (open === body.hidden) {
      body.hidden = !open;
      li.querySelector('.row-head').setAttribute('aria-expanded', open);
      if (open) body.innerHTML = rowBody(s);
    }
    const btn = open && body.querySelector('[data-listen]');
    if (btn) btn.textContent = playing ? '■ Stop' : '▶ Listen now';
  }
  if (speaking && speaking.id !== lastPlaying && state.view === 'walk' && S.stories.includes(speaking)) {
    list.querySelector(`[data-id="${CSS.escape(speaking.id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  lastPlaying = speaking?.id || null;
}

// ---------- Field guide: browse; nothing plays on its own ----------
const guideItems = {};
function guideRow(x, status) {
  guideItems[x.id] = x;
  const open = state.open.has(x.id);
  return `<li class="row" data-id="${esc(x.id)}"><button class="row-head" aria-expanded="${open}" data-gtoggle="${esc(x.id)}">
      <span class="blaze" aria-hidden="true" style="visibility:hidden"></span>
      <span class="row-title"><span class="kind">${esc(x.kind)}</span><span class="name">${esc(x.name)}</span></span><span class="status">${esc(status)}</span></button>
    <div class="row-body"${open ? '' : ' hidden'}>${open ? x.body : ''}</div></li>`;
}
function rockText(r) {
  const made = r.made.length > 1 ? r.made.slice(0, -1).join(', ') + ' and ' + r.made.at(-1) : r.made[0];
  return `The ${r.name}${made ? `: mostly ${made}` : ''}. It's about ${r.ma} million years old, from the ${r.age}.`
    + (r.squeezed ? ' It started out as mud and sand, then was squeezed and heated deep underground when the Appalachians were pushed up.' : '')
    + (r.pyrite ? ' In places it holds pyrite, fool\'s gold.' : '');
}
// Where a species' "About it" comes from, said plainly.
function aboutCredit(s) {
  const wiki = s.wiki ? `<a href="${esc(s.wiki)}" target="_blank" rel="noopener">Wikipedia</a>` : '';
  const more = s.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`);
  return s.aboutFrom === 'written' ? `<p class="credit">Draft · not fact-checked yet. Sources: ${[wiki, ...more].filter(Boolean).join('; ')}</p>`
    : s.aboutFrom === 'wikipedia' ? `<p class="credit">From ${wiki} (CC BY-SA). Not yet checked against original sources.</p>` : '';
}
// Listen buttons show Stop while their entry is playing (updated in place, so open "About it" boxes stay open).
function syncGuideButtons() {
  document.querySelectorAll('#guide [data-sp], #guide [data-say]').forEach((b) => {
    const id = b.dataset.sp ? b.dataset.sp : guideItems[b.dataset.say]?.audio || b.dataset.say;
    b.textContent = speaking?.id === id ? '■ Stop' : '▶ Listen';
  });
}
const LISTEN = Object.fromEntries((S.listen || []).map((x) => [x.id, x]));
let guideKey = '';
function renderGuide(fromWalk = false) {
  // While walking, only redraw when something you'd see changes.
  const key = [state.guide, state.month, state.group, zoneAt(state.mile).from, rockAt(state.mile).name, state.guide === 'nature' ? '' : state.mile.toFixed(1)].join('|');
  if (fromWalk && key === guideKey) return;
  guideKey = key;
  $('#guideTabs').innerHTML = GUIDE.map(([g, l]) => `<button role="tab" data-guide="${g}" aria-selected="${state.guide === g}">${l}</button>`).join('');
  let html = '';
  if (state.guide === 'nature') {
    const z = zoneAt(state.mile), list = z.months[state.month] || [];
    const inGroup = (g) => state.group === 'all' || (state.group === 'animal' ? !['plant', 'bird', 'fungus'].includes(g) : g === state.group);
    const items = list.map(([key, n]) => ({ key, n, ...S.nature.species[key] })).filter((s) => inGroup(s.group));
    html += `<div class="guide-bar"><label for="month"><strong>Month</strong></label>
      <select id="month">${MONTHS.map((m, i) => `<option value="${i + 1}"${i + 1 === state.month ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
      <p class="guide-note">Plants and animals people have recorded between mile ${z.from.toFixed(1)} and ${z.to.toFixed(1)} in past ${MONTHS[state.month - 1]}s. Exact spots are never shown, and rare or poached species are left out.</p>
      <div class="filters" role="group" aria-label="Show">${GROUPS.map(([g, l]) => `<button class="chip" data-group="${g}" aria-pressed="${state.group === g}">${l}</button>`).join('')}</div>`;
    // Hand-picked well-known ones first (the sighting records barely include them), then what people have recorded here.
    const common = (S.nature.common || []).filter((c) => c.months.includes(state.month) && inGroup(c.group));
    const card = (s, id, line) => `<div class="sp">
        ${s.photo ? `<img class="ph" loading="lazy" src="${esc(s.photo.url)}" alt="">` : '<span class="ph"></span>'}
        <span class="nm">${esc(s.name)}</span><span class="sci">${esc(s.sci)}</span>
        <span class="ct">${esc(line)}${s.photo ? ` · Photo: ${esc(s.photo.by)}, ${s.photo.license}` : ''}</span>
        <button data-sp="${esc(id)}">${speaking?.id === id ? '■ Stop' : '▶ Listen'}</button>
        <details class="about"><summary>About it</summary><p>${esc(s.about)}</p>${aboutCredit(s)}</details></div>`;
    if (common.length) html += `<h3 class="section-title" style="margin-top:0">Common along this ridge</h3>
      <p class="guide-note">Well-known plants and animals of the high crest, picked from the park's official species list.</p>
      <div class="species">${common.map((c) => card({ ...c, aboutFrom: 'written' }, c.id, c.when)).join('')}</div>
      <h3 class="section-title">Recorded on this stretch</h3>`;
    html += items.length ? `<div class="species">${items.map((s) => card(s, 'sp-' + s.key, `${s.n} record${s.n === 1 ? '' : 's'}`)).join('')}</div>`
      : `<p class="panel empty">Nobody has shared openly licensed records of these here in ${MONTHS[state.month - 1]} yet. Try another month or group.</p>`;
  } else if (state.guide === 'rocks') {
    const r = rockAt(state.mile);
    state.open.add('rock-here');
    html += `<h3 class="section-title" style="margin-top:0">Right here</h3><ol class="rows">`
      + guideRow({ id: 'rock-here', audio: 'rock-' + S.rocks.indexOf(r), kind: `Mile ${r.from.toFixed(1)}–${r.to.toFixed(1)}`, name: r.name, text: rockText(r),
        body: `<p>${esc(rockText(r))}</p><div class="actions"><button data-say="rock-here">▶ Listen</button></div><p class="credit">Macrostrat geologic map data (CC BY 4.0)</p>` }, '') + '</ol>';
    html += `<h3 class="section-title">Along the whole walk</h3><ol class="rows">` + S.rocks.map((x, i) => guideRow({ id: 'rock-' + i,
      kind: `Mile ${x.from.toFixed(1)}–${x.to.toFixed(1)}`, name: x.name, text: rockText(x),
      body: `<p>${esc(rockText(x))}</p><div class="actions"><button data-say="rock-${i}">▶ Listen</button></div>` }, away(x.from))).join('') + '</ol>';
  } else {
    const items = [
      ...S.archives.map((a, i) => ({ id: 'arch-' + i, mi: a.mi, kind: a.newspaper ? 'Old newspaper' : 'Old photo or drawing', name: a.title,
        body: `<img loading="lazy" src="${esc(a.image)}" alt="">
          ${a.newspaper ? `<p>This page mentions ${esc(a.about === 'Kuwohi' ? 'Clingmans Dome' : a.about)}. We haven't read it yet; it's here to show what the newspaper archive holds.</p>` : ''}
          <p class="credit">Library of Congress${a.newspaper ? ', Chronicling America' : ''}${a.date ? ', ' + esc(a.date) : ''}. ${esc(a.rights)}.</p>
          <div class="actions"><a href="${esc(a.url)}" target="_blank" rel="noopener">See it at the Library of Congress</a></div>` })),
      ...S.wiki.map((p, i) => ({ id: 'wiki-' + i, mi: p.mi, kind: 'Nearby place', name: p.title, text: p.text,
        body: `<p>${esc(p.text)}</p><div class="actions"><button data-say="wiki-${i}">▶ Listen</button></div>
          <p class="credit">From <a href="${esc(p.url)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA). Not yet checked against original sources.</p>` })),
    ].sort((a, b) => Math.abs(a.mi - state.mile) - Math.abs(b.mi - state.mile));
    html += `<p class="guide-note">Closest to you first.</p><ol class="rows">` + items.map((x) => guideRow(x, away(x.mi))).join('') + '</ol>';
  }
  $('#guide').innerHTML = html;
  const m = $('#month'); if (m) m.onchange = (e) => { state.month = +e.target.value; store.set('month', state.month); renderGuide(); };
}

// ---------- switching views ----------
function showView(v) {
  state.view = v; store.set('view', v);
  $('#walkView').hidden = v !== 'walk'; $('#guideView').hidden = v !== 'guide';
  document.querySelectorAll('#viewNav button').forEach((b) => (b.dataset.view === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  if (v === 'guide') renderGuide();
}

// ---------- clicks ----------
document.addEventListener('click', (e) => {
  const t = (sel) => e.target.closest(sel);
  let b;
  if ((b = t('[data-view]'))) return showView(b.dataset.view);
  if ((b = t('[data-toggle]'))) {
    const id = b.dataset.toggle, opening = b.getAttribute('aria-expanded') !== 'true';
    opening ? state.open.add(id) : state.open.delete(id);
    const body = b.closest('.row').querySelector('.row-body');
    body.hidden = !opening; b.setAttribute('aria-expanded', opening);
    if (opening) body.innerHTML = rowBody(S.stories.find((s) => s.id === id));
    return;
  }
  if ((b = t('[data-gtoggle]'))) {
    const id = b.dataset.gtoggle, opening = b.getAttribute('aria-expanded') !== 'true';
    opening ? state.open.add(id) : state.open.delete(id);
    const body = b.closest('.row').querySelector('.row-body');
    body.hidden = !opening; b.setAttribute('aria-expanded', opening);
    if (opening) body.innerHTML = guideItems[id].body;
    return;
  }
  if ((b = t('[data-listen]'))) {
    const s = S.stories.find((x) => x.id === b.dataset.listen);
    if (speaking?.id === s.id) return stopSpeaking();
    stopSpeaking(); return say(s);
  }
  // Field guide: the same recorded voice as the walk (ids match S.listen), or the device voice if there's no recording.
  const guideSay = (item) => {
    const playing = speaking?.id === item.id;
    stopSpeaking();
    if (!playing) say(item);
  };
  if ((b = t('[data-say]'))) {
    const x = guideItems[b.dataset.say], id = x.audio || x.id;
    return guideSay(LISTEN[id] || { id, title: x.name, text: x.text || '' });
  }
  if ((b = t('[data-sp]'))) {
    const id = b.dataset.sp, s = id.startsWith('cm-') ? S.nature.common.find((c) => c.id === id) : S.nature.species[id.slice(3)];
    return guideSay({ id, title: s.name, text: s.about });
  }
  if ((b = t('[data-topic]'))) {
    const tp = b.dataset.topic;
    state.topics.has(tp) ? state.topics.delete(tp) : state.topics.add(tp);
    store.set('topics', [...state.topics]); b.setAttribute('aria-pressed', state.topics.has(tp));
    for (let i = queue.length - 1; i >= 0; i--) if (S.stories.includes(queue[i]) && !willRead(queue[i])) queue.splice(i, 1);
    if (speaking && S.stories.includes(speaking) && !willRead(speaking)) stopSpeaking();
    return updateWalk();
  }
  if ((b = t('[data-guide]'))) { state.guide = b.dataset.guide; store.set('guide', state.guide); return renderGuide(); }
  if ((b = t('[data-group]'))) { state.group = b.dataset.group; return renderGuide(); }
});

// ---------- menu ----------
$('#menuBtn').onclick = () => $('#menu').showModal();
$('#closeMenu').onclick = () => $('#menu').close();
$('#feedbackBtn').onclick = () => { $('#menu').close(); OHFeedback.open({ app: 'Trail Stories', version: VERSION }); };
$('#theme').value = store.get('theme', 'auto');
$('#theme').onchange = (e) => { store.set('theme', e.target.value); applyTheme(); drawMap(); drawProfile(); };
$('#rate').value = store.get('rate', 1);
$('#rate').oninput = (e) => { store.set('rate', +e.target.value); if (player) player.playbackRate = +e.target.value; };
$('#voice').onchange = (e) => store.set('voice', e.target.value);
// Narrator: the recorded voices first, then the device's own voice.
$('#narrator').innerHTML = AUDIO.voices.map((v) => `<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('') + '<option value="device">This device\'s voice</option>';
$('#narrator').value = store.get('narrator', AUDIO.voices[0]?.id || 'device');
if (!$('#narrator').value) $('#narrator').value = AUDIO.voices[0]?.id || 'device';
function narratorChanged() {
  const n = narrator(), have = AUDIO.files[n]?.length || 0;
  $('#voiceField').hidden = n !== 'device' && have >= S.stories.length;
  $('#narratorNote').textContent = n === 'device' ? 'Uses the voices built into your phone or computer.'
    : `A natural-sounding voice made by computer with Kokoro, a free open-source voice. ${have >= S.stories.length ? 'Every stop is recorded.' : `In this test ${have} of ${S.stories.length} stops are recorded; the rest use the device voice below.`}`;
  S.stories.forEach((s) => { const b = $(`#stops .row[data-id="${CSS.escape(s.id)}"] .row-body`); if (b && !b.hidden) b.innerHTML = rowBody(s); });
}
narratorChanged();
$('#narrator').onchange = (e) => { store.set('narrator', e.target.value); narratorChanged(); };
$('#autoRead').checked = store.get('autoRead', true);
$('#autoRead').onchange = (e) => { store.set('autoRead', e.target.checked); if (e.target.checked) catchUp(); };

// ---------- start ----------
$("#sectionName").textContent = `${S.name} · ${TOTAL.toFixed(1)} miles · ${S.area.replace(" National Park", "")}`;
$('#gathered').textContent = `Data gathered ${S.gathered}. Version ${VERSION}.`;
if (!synth) $('#autoRead').closest('label').insertAdjacentHTML('afterend', '<p class="hint">This browser can\'t read aloud, but every stop can be read on screen.</p>');
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); drawMap(); drawProfile(); });
addEventListener('resize', () => { drawMap(); drawProfile(); });
buildWalk();
showView(state.view);
setMile(0, 'none'); // every walk starts at the trailhead; press Walk to hear the introduction
