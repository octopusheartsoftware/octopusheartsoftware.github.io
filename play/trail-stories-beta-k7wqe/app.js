// Trail Stories test: walk one trail section with a slider and hear what's around you.
const VERSION = '0.1';
const S = window.SECTION;
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TABS = [['near', 'Near me'], ['nature', 'Nature'], ['history', 'History'], ['people', 'People'], ['land', 'The land'], ['fun', 'Fun facts']];
const KIND = { nature: 'Nature', history: 'History', people: 'People', land: 'The land', fun: 'Fun fact' };
const GROUPS = [['all', 'Everything'], ['plant', 'Plants'], ['bird', 'Birds'], ['fungus', 'Fungi'], ['animal', 'Other animals']];
const TOTAL = S.trail.at(-1).mi;

// ---------- saved settings (this device only) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('ts.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ts.' + k, JSON.stringify(v)); } catch {} },
};
const state = {
  mile: Math.min(store.get('mile', 0), TOTAL), tab: store.get('tab', 'near'), month: store.get('month', new Date().getMonth() + 1),
  group: 'all', walking: false, heard: new Set(), lastMile: null,
};

// ---------- trail helpers ----------
const pointAt = (mi) => {
  const i = Math.min(S.trail.length - 1, Math.max(0, S.trail.findIndex((p) => p.mi >= mi)));
  return S.trail[i === -1 ? S.trail.length - 1 : i];
};
const near = (s, mi = state.mile) => Math.abs(s.mi - mi) <= s.reach;
const distText = (mi) => {
  const d = mi - state.mile;
  if (Math.abs(d) < 0.08) return 'Here';
  return `${Math.abs(d).toFixed(1)} mi ${d > 0 ? 'ahead' : 'back'}`;
};
const zoneAt = (mi) => S.nature.zones.find((z) => mi >= z.from && mi <= z.to) || S.nature.zones.at(-1);
const rockAt = (mi) => S.rocks.find((r) => mi >= r.from && mi <= r.to + 0.25) || S.rocks.at(-1);
const placeNear = (mi) => {
  const p = S.stories.filter((s) => s.place).sort((a, b) => Math.abs(a.mi - mi) - Math.abs(b.mi - mi))[0];
  return p && Math.abs(p.mi - mi) < 0.35 ? p.place : '';
};

// ---------- colors from the brand kit ----------
let C = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['ocean', 'aqua', 'sky', 'line', 'ink', 'ink-muted', 'surface', 'surface-raised']) C[k] = cs.getPropertyValue('--' + k).trim();
}

// ---------- map ----------
const map = $('#map'), prof = $('#profile');
let proj = null;
function setupCanvas(cv) {
  const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
function drawMap() {
  const { ctx, w, h } = setupCanvas(map);
  const lats = S.trail.map((p) => p.lat), lngs = S.trail.map((p) => p.lng);
  const s0 = Math.min(...lats), n0 = Math.max(...lats), w0 = Math.min(...lngs), e0 = Math.max(...lngs);
  const k = Math.cos(((s0 + n0) / 2) * Math.PI / 180);
  const pad = 34, sx = (w - pad * 2) / ((e0 - w0) * k), sy = (h - pad * 2) / (n0 - s0), sc = Math.min(sx, sy);
  const ox = (w - (e0 - w0) * k * sc) / 2, oy = (h - (n0 - s0) * sc) / 2;
  proj = (lat, lng) => [ox + (lng - w0) * k * sc, oy + (n0 - lat) * sc];
  ctx.clearRect(0, 0, w, h);

  const line = (from, to, color, width) => {
    ctx.beginPath(); let first = true;
    for (const p of S.trail) if (p.mi >= from && p.mi <= to) { const [x, y] = proj(p.lat, p.lng); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  line(0, TOTAL, C.line, 6);
  line(0, state.mile, C.ocean, 6);

  // story pins
  for (const s of S.stories) {
    const p = pointAt(s.mi), [x, y] = proj(p.lat, p.lng), on = near(s);
    ctx.beginPath(); ctx.arc(x, y, on ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = C['surface-raised']; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? C.ocean : C['ink-muted']; ctx.stroke();
  }
  // place labels
  ctx.font = '600 13px "Source Sans 3", system-ui, sans-serif'; ctx.textBaseline = 'middle';
  const labelled = new Set();
  for (const s of S.stories) {
    if (!s.place || labelled.has(s.place)) continue; labelled.add(s.place);
    const p = pointAt(s.mi), [x, y] = proj(p.lat, p.lng);
    const right = x < w * 0.6, tx = right ? x + 10 : x - 10;
    ctx.textAlign = right ? 'left' : 'right';
    ctx.lineWidth = 4; ctx.strokeStyle = C['surface-raised']; ctx.strokeText(s.place, tx, y - 12);
    ctx.fillStyle = C.ink; ctx.fillText(s.place, tx, y - 12);
  }
  // you
  const me = pointAt(state.mile), [mx, my] = proj(me.lat, me.lng);
  ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.fillStyle = C['surface-raised']; ctx.fill();
  ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fillStyle = C.aqua; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();

  // north arrow and a one-mile scale bar
  ctx.fillStyle = C['ink-muted']; ctx.textAlign = 'left'; ctx.font = '600 12px "Source Sans 3", system-ui, sans-serif';
  ctx.fillText('N ↑', 10, 16);
  const barPx = (1 / 69.17) * sc; // one mile is about 1/69 of a degree of latitude
  ctx.fillRect(10, h - 14, barPx, 3); ctx.fillText('1 mile', 14 + barPx, h - 12);
  ctx.textAlign = 'right'; ctx.fillText('North Carolina ↓  Tennessee ↑', w - 10, h - 12);
}
function drawProfile() {
  const { ctx, w, h } = setupCanvas(prof);
  const fts = S.trail.map((p) => p.ft), lo = Math.min(...fts) - 100, hi = Math.max(...fts) + 100;
  const X = (mi) => 8 + (mi / TOTAL) * (w - 16), Y = (ft) => 6 + (1 - (ft - lo) / (hi - lo)) * (h - 22);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.moveTo(X(0), h - 16);
  for (const p of S.trail) ctx.lineTo(X(p.mi), Y(p.ft));
  ctx.lineTo(X(TOTAL), h - 16); ctx.closePath(); ctx.fillStyle = C.sky; ctx.fill();
  ctx.beginPath(); S.trail.forEach((p, i) => (i ? ctx.lineTo(X(p.mi), Y(p.ft)) : ctx.moveTo(X(p.mi), Y(p.ft))));
  ctx.strokeStyle = C.ocean; ctx.lineWidth = 2; ctx.stroke();
  const me = pointAt(state.mile);
  ctx.fillStyle = C.ink; ctx.fillRect(X(state.mile) - 1, 4, 2, h - 20);
  ctx.beginPath(); ctx.arc(X(state.mile), Y(me.ft), 5, 0, Math.PI * 2); ctx.fillStyle = C.aqua; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '12px "Source Sans 3", system-ui, sans-serif'; ctx.fillStyle = C['ink-muted']; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('mile 0', X(0), h - 2);
  ctx.textAlign = 'right'; ctx.fillText(`mile ${TOTAL.toFixed(1)}`, X(TOTAL), h - 2);
  ctx.textAlign = 'center'; ctx.fillText(`${Math.max(...fts).toLocaleString()} ft high · ${Math.min(...fts).toLocaleString()} ft low`, w / 2, h - 2);
}
function mileFromMap(ev) {
  if (!proj) return;
  const r = map.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  let best = 0, d = Infinity;
  for (const p of S.trail) { const [px, py] = proj(p.lat, p.lng), dd = (px - x) ** 2 + (py - y) ** 2; if (dd < d) { d = dd; best = p.mi; } }
  setMile(best, true);
}
let dragging = false;
map.addEventListener('pointerdown', (e) => { dragging = true; map.setPointerCapture(e.pointerId); mileFromMap(e); });
map.addEventListener('pointermove', (e) => dragging && mileFromMap(e));
map.addEventListener('pointerup', () => (dragging = false));

// ---------- reading aloud ----------
const synth = window.speechSynthesis;
const queue = [];
let speaking = null;
function voices() { return synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []; }
function fillVoices() {
  const sel = $('#voice'), vs = voices(), want = store.get('voice', '');
  sel.innerHTML = vs.length ? vs.map((v) => `<option value="${esc(v.name)}"${v.name === want ? ' selected' : ''}>${esc(v.name)}</option>`).join('')
    : '<option>Your browser has no voices</option>';
}
if (synth) { fillVoices(); synth.onvoiceschanged = fillVoices; }
function say(item) { queue.push(item); if (!speaking) next(); }
function next() {
  const item = queue.shift();
  document.querySelectorAll('.story.speaking').forEach((el) => el.classList.remove('speaking'));
  if (!item || !synth) { speaking = null; $('#nowPlaying').hidden = true; resumeWalk(); return; }
  speaking = item;
  $('#nowPlaying').hidden = false; $('#nowTitle').textContent = item.title;
  document.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.add('speaking');
  // Chrome cuts off long speech, so read one sentence at a time.
  const parts = (item.title + '. ' + item.text).match(/[^.!?]+[.!?]+["”']?|\S[^.!?]*$/g) || [item.text];
  const v = voices().find((x) => x.name === $('#voice').value);
  let i = 0;
  const one = () => {
    if (speaking !== item) return;
    if (i >= parts.length) { state.heard.add(item.id); next(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++].trim());
    if (v) u.voice = v;
    u.rate = +$('#rate').value;
    u.onend = one; u.onerror = one;
    synth.speak(u);
  };
  one();
}
function stopSpeaking() { queue.length = 0; speaking = null; synth?.cancel(); next(); }
$('#stopBtn').onclick = stopSpeaking;

// ---------- walking ----------
let walkTimer = null, pausedForStory = false;
function setWalking(on) {
  state.walking = on;
  $('#walkBtn .ic').textContent = on ? '❚❚' : '▶';
  $('#walkBtn .tx').textContent = on ? 'Pause' : (state.mile >= TOTAL ? 'Walk again' : 'Walk');
  clearInterval(walkTimer);
  if (!on) return;
  if (state.mile >= TOTAL) setMile(0, true);
  walkTimer = setInterval(() => {
    if (pausedForStory) return;
    const m = Math.min(TOTAL, state.mile + +$('#speed').value / 4);
    setMile(m);
    if (m >= TOTAL) setWalking(false);
  }, 250);
}
function resumeWalk() { pausedForStory = false; }
$('#walkBtn').onclick = () => setWalking(!state.walking);

// ---------- moving along ----------
function setMile(mi, jumped = false) {
  const before = state.mile;
  state.mile = Math.max(0, Math.min(TOTAL, +(+mi).toFixed(2)));
  $('#mile').value = state.mile;
  store.set('mile', state.mile);
  // A jump back starts a fresh walk; moving forward reads anything you've just reached.
  if (state.mile < before) for (const s of S.stories) if (!near(s)) state.heard.delete(s.id); // going back lets you hear them again
  if ($('#autoRead').checked && state.mile >= before) {
    for (const s of S.stories) if (near(s) && !state.heard.has(s.id) && !queue.includes(s) && speaking !== s) {
      say(s); if (state.walking) pausedForStory = true;
    }
  }
  render();
}
$('#mile').max = TOTAL;
$('#mile').addEventListener('input', (e) => setMile(e.target.value, true));

// ---------- the list ----------
function storyCard(s, extra = '') {
  return `<article class="card story${speaking?.id === s.id ? ' speaking' : ''}" data-id="${esc(s.id)}">
    <div class="meta"><span class="label kind">${KIND[s.tab]}</span><span class="dist">${extra || distText(s.mi)}${!extra && s.off > 0.25 ? ` · ${s.off.toFixed(1)} mi side trail` : ''}</span>
      ${s.checked ? '' : '<span class="draft" title="Written from the sources below, not yet checked by a person">Draft · not fact-checked yet</span>'}</div>
    <h3 class="heading-3">${esc(s.title)}</h3>
    <p class="text">${esc(s.text)}</p>
    ${s.note ? `<p class="note">To do: ${esc(s.note)}</p>` : ''}
    <div class="actions"><button class="listen" data-listen="${esc(s.id)}">🔊 Listen</button></div>
    <details><summary>Where this comes from</summary><ul>${s.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join('')}</ul></details>
  </article>`;
}
function rockCard() {
  const r = rockAt(state.mile); if (!r) return '';
  const made = r.made.length > 1 ? r.made.slice(0, -1).join(', ') + ' and ' + r.made.at(-1) : r.made[0];
  const s = { id: 'rock-' + r.name, tab: 'land', title: `Under your feet: ${r.name}`, mi: state.mile, checked: 'data',
    text: `You're walking on the ${r.name}${made ? `: mostly ${made}` : ''}. It's about ${r.ma} million years old, from the ${r.age}.`
      + (r.squeezed ? ' It started out as mud and sand, then was squeezed and heated deep underground when the Appalachians were pushed up.' : '')
      + (r.pyrite ? ' In places it holds pyrite, fool\'s gold.' : ''),
    sources: [{ label: 'Macrostrat geologic map data (CC BY 4.0)', url: 'https://macrostrat.org/' }] };
  return storyCard(s, `Mile ${r.from.toFixed(1)}–${r.to.toFixed(1)}`).replace('data-id=', 'data-gen="1" data-id=');
}
function speciesGrid() {
  const z = zoneAt(state.mile), list = z.months[state.month] || [];
  const inGroup = (g) => state.group === 'all' || (state.group === 'animal' ? !['plant', 'bird', 'fungus'].includes(g) : g === state.group);
  const items = list.map(([key, n]) => ({ key, n, ...S.nature.species[key] })).filter((s) => inGroup(s.group));
  const filt = `<div class="filters" role="group" aria-label="Show">${GROUPS.map(([g, l]) => `<button data-group="${g}" aria-pressed="${state.group === g}">${l}</button>`).join('')}</div>`;
  if (!items.length) return filt + `<p class="card empty">Nobody has shared openly licensed records of these here in ${MONTHS[state.month - 1]} yet. Try another month or group.</p>`;
  return filt + `<p class="small muted">Recorded between mile ${z.from.toFixed(1)} and ${z.to.toFixed(1)} in past ${MONTHS[state.month - 1]}s. Exact spots are never shown, and rare or poached species are left out.</p>
    <div class="species">${items.map((s) => `<button class="sp" data-sp="${s.key}" aria-label="Listen: ${esc(s.common || s.sci)}">
      ${s.photo ? `<img class="ph" loading="lazy" src="${esc(s.photo.url)}" alt="">` : '<span class="ph"></span>'}
      <span class="nm">${esc(cap(s.common) || s.sci)}</span><span class="sci">${esc(s.sci)}</span>
      <span class="ct">${s.n} record${s.n === 1 ? '' : 's'}${s.photo ? ` · Photo: ${esc(s.photo.by)}, ${s.photo.license}` : ''}</span></button>`).join('')}</div>`;
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function archiveCards() {
  return S.archives.filter((a) => Math.abs(a.mi - state.mile) <= 0.75).slice(0, 5).map((a) => `<article class="card story">
    <div class="meta"><span class="label kind">${a.newspaper ? 'Old newspaper' : 'From the archives'}</span><span class="dist">${distText(a.mi)}</span></div>
    <img loading="lazy" src="${esc(a.image)}" alt="">
    <h3 class="heading-3">${esc(a.title)}</h3>
    ${a.newspaper ? `<p class="small">This page mentions ${esc(a.about === 'Kuwohi' ? 'Clingmans Dome' : a.about)}. We haven't read it yet; it's here to show what the newspaper archive holds.</p>` : ''}
    <p class="credit">Library of Congress${a.newspaper ? ', Chronicling America' : ''}. ${esc(a.rights)}.</p>
    <div class="actions"><a href="${esc(a.url)}" target="_blank" rel="noopener">See it at the Library of Congress</a></div></article>`).join('');
}
function wikiCards() {
  return S.wiki.filter((p) => Math.abs(p.mi - state.mile) <= 0.6).map((p) => `<article class="card story">
    <div class="meta"><span class="label kind">Nearby</span><span class="dist">${distText(p.mi)}${p.off > 0.2 ? `, ${p.off.toFixed(1)} mi off the trail` : ''}</span></div>
    <h3 class="heading-3">${esc(p.title)}</h3><p class="text">${esc(p.text)}</p>
    <p class="credit">From <a href="${esc(p.url)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA). Not yet checked against original sources.</p></article>`).join('');
}
function render() {
  const p = pointAt(state.mile);
  $('#mileRead').textContent = `Mile ${state.mile.toFixed(1)} of ${TOTAL.toFixed(1)}`;
  $('#elevRead').textContent = `${p.ft.toLocaleString()} ft`;
  $('#placeRead').textContent = placeNear(state.mile);
  drawMap(); drawProfile();

  const tab = state.tab;
  $('#month-row').hidden = tab !== 'nature';
  const here = S.stories.filter((s) => near(s) && (tab === 'near' || s.tab === tab)).sort((a, b) => Math.abs(a.mi - state.mile) - Math.abs(b.mi - state.mile));
  let html = here.map((s) => storyCard(s)).join('');
  if (tab === 'people') {
    const t = S.stories.find((s) => s.treaty);
    if (t && !here.includes(t)) html += storyCard(t, 'Applies to this whole section');
    html += `<p class="small muted">This section is written with care and will be offered to the Eastern Band of Cherokee Indians for review before it's shared beyond testing.</p>`;
  }
  if (tab === 'near' || tab === 'land') html += rockCard();
  if (tab === 'history') html += archiveCards() + wikiCards();
  if (tab === 'nature') html += `<h2 class="heading-3 section-title">Seen along this stretch</h2>` + speciesGrid();
  if (!html) html = `<p class="card empty">Nothing in this tab right around here. Keep walking, or see what's coming up below.</p>`;
  $('#list').innerHTML = html;

  const ahead = S.stories.filter((s) => s.mi - s.reach > state.mile && (tab === 'near' || tab === 'nature' || s.tab === tab)).filter((s) => tab !== 'nature' || s.tab === 'nature').slice(0, 3);
  $('#ahead').innerHTML = ahead.length ? `<h2 class="heading-3 section-title">Coming up</h2>` + ahead.map((s) =>
    `<button class="card story" data-goto="${s.mi - s.reach + 0.01}" style="text-align:left"><span class="meta"><span class="label kind">${KIND[s.tab]}</span><span class="dist">in ${(s.mi - s.reach - state.mile).toFixed(1)} mi</span></span><span class="heading-3">${esc(s.title)}</span></button>`).join('') : '';
}

// ---------- clicks in the list ----------
document.addEventListener('click', (e) => {
  const l = e.target.closest('[data-listen]');
  if (l) { const s = S.stories.find((x) => x.id === l.dataset.listen) || genStory(l); stopSpeaking(); say(s); return; }
  const g = e.target.closest('[data-group]');
  if (g) { state.group = g.dataset.group; render(); return; }
  const sp = e.target.closest('[data-sp]');
  if (sp) {
    const s = S.nature.species[sp.dataset.sp], n = (zoneAt(state.mile).months[state.month] || []).find(([k]) => k == sp.dataset.sp)?.[1];
    stopSpeaking();
    say({ id: 'sp' + sp.dataset.sp, title: cap(s.common) || s.sci, text: `${s.common ? `Its scientific name is ${s.sci}. ` : ''}People have recorded it along this stretch ${n} time${n === 1 ? '' : 's'} in past ${MONTHS[state.month - 1]}s.` });
    return;
  }
  const go = e.target.closest('[data-goto]');
  if (go) { setMile(+go.dataset.goto); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
function genStory(btn) { // the rock card isn't in the story list
  const card = btn.closest('.story');
  return { id: card.dataset.id, title: card.querySelector('h3').textContent, text: card.querySelector('.text').textContent };
}

// ---------- tabs, month, menu ----------
$('#tabs').innerHTML = TABS.map(([id, label]) => `<button role="tab" data-tab="${id}" aria-selected="${state.tab === id}">${label}</button>`).join('');
$('#tabs').onclick = (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  state.tab = b.dataset.tab; store.set('tab', state.tab);
  document.querySelectorAll('#tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
  render();
};
$('#month').innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}"${i + 1 === state.month ? ' selected' : ''}>${m}</option>`).join('');
$('#month').onchange = (e) => { state.month = +e.target.value; store.set('month', state.month); render(); };
$('#autoRead').checked = store.get('autoRead', true);
$('#autoRead').onchange = (e) => store.set('autoRead', e.target.checked);
$('#rate').value = store.get('rate', 1);
$('#rate').oninput = (e) => store.set('rate', +e.target.value);
$('#voice').onchange = (e) => store.set('voice', e.target.value);
$('#menuBtn').onclick = () => $('#menu').showModal();
$('#closeMenu').onclick = () => $('#menu').close();
$('#feedbackBtn').onclick = () => { $('#menu').close(); OHFeedback.open({ app: 'Trail Stories', version: VERSION }); };

$('#sectionName').textContent = `${S.name} · ${S.area} · ${TOTAL.toFixed(1)} miles of the Appalachian Trail`;
$('#gathered').textContent = `Data gathered ${S.gathered}. Version ${VERSION}.`;
if (!synth) $('#autoRead').closest('label').insertAdjacentHTML('afterend', '<p class="small muted">This browser can\'t read aloud, but everything is here to read.</p>');

readColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); render(); });
addEventListener('resize', () => render());
state.heard = new Set(S.stories.filter((s) => near(s)).map((s) => s.id)); // don't read out a pile of stories on load
setMile(state.mile);
