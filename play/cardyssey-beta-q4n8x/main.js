// Cardyssey: the home screen, the editor (painting cards, items and props; buttons; placing things
// on cards), and switching between Make, Map and Play. Adventures autosave in this browser; nothing is sent anywhere.
import {
  CARD_W, CARD_H, ITEM_SIZE, MAX_CARDS, MAX_ITEMS, MAX_PROPS, MAX_LOOKS, uid, newCard, newItem, newProp, newLook, newButton,
  newAdventure, normalize, cardById, itemById, propById, lookById, buttonById, nextCardName, nextItemName, nextPropName,
  nextLookName, copyCard, buttonDoesSomething, buttonName, changeText, cardPreview, bounds, shapeSvg, esc, cleanAdventure,
} from './model.js';
import { saveAdventure, loadAdventure, listAdventures, deleteAdventure, askToKeep } from './store.js';
import { Painter } from './paint.js';
import { renderMap, findProblems } from './map.js';
import { createPlayer } from './play.js';
import { SOUNDS, playSound } from './sounds.js';
import { STAMPS, stampSvg } from './stamps.js';
import { buildDemo } from './demo.js';
import { buildKitten, buildPizza, buildAlien } from './examples.js';
import { createTour } from './tour.js';
import { icon } from './icons.js';

const VERSION = '0.6.0';
const FEEDBACK_EMAIL = 'support@octopusheartsoftware.com';
const FEEDBACK_URL = 'https://feedback.octopusheartsoftware.com/';
const $ = (id) => document.getElementById(id);
const withIcon = (name, text) => `${icon(name)}<span>${text}</span>`;

// Drawing colors (for pictures, not the interface): basics, rainbow, and a range of skin tones.
const PALETTE = ['#000000', '#5a5a5a', '#a6a6a6', '#ffffff', '#c0392b', '#f07f2e', '#f6d32d', '#8fd14f', '#2e8b3e', '#1fb5c9',
  '#7cc6f2', '#1f5fbf', '#1b2a6b', '#7d3cb5', '#f28ab2', '#7a4a22', '#f9e0cf', '#e8b48c', '#a8704a', '#5c3b26'];
const TOOLS = [['pencil', 'Pencil'], ['brush', 'Brush'], ['eraser', 'Eraser'], ['fill', 'Fill'], ['line', 'Line'], ['rect', 'Box'], ['oval', 'Oval'], ['text', 'Text'], ['stamp', 'Stamps']];
const SIZES = [['Small', 4], ['Medium', 12], ['Large', 30]];
const BUTTON_SHAPES = [['rect', 'Box'], ['oval', 'Oval'], ['free', 'Draw around']];
const PLACED_SIZE = { item: 120, prop: 180 };
const HELP = {
  item: 'Draw your item on the see-through background. Then open a card, choose Place, and put it there for players to find.',
  prop: 'Draw your prop on the see-through background. Add another look to show how it can change. The first look is how it starts.',
};

let adv = null;          // the adventure that's open
let editing = null;      // what Make is showing: { kind: 'card' | 'item' | 'prop', id, look }
let cardId = null;       // the card open in Make (or the last one, while an item or prop is open)
let view = null;
let mode = 'paint';      // on a card, Make has three modes: 'paint', 'buttons' and 'place'
let btnShape = 'rect';
let selBtn = null;       // the selected button's id
let selPlaced = null;    // the selected thing on the card: 'item:<placed id>' or 'prop:<placed id>'
let paintedKey = null;   // which picture the paint canvas shows: 'card:<id>', 'item:<id>' or 'prop:<id>:<look id>'
let imageDirty = false;
let saveTimer = 0;
let pending = null;      // an item or prop to open once Make has loaded (from the Map's list)
const foldsOpen = new Set(); // which folded sections of the button panel are open
let draft = { what: '', to: '' }; // a change being set up in the button panel

const painter = new Painter($('paper'), $('wet'), $('stage'));
const player = createPlayer($('player'));
const current = () => cardById(adv, cardId);
const onCard = () => editing && editing.kind === 'card';

function lookup(key) {
  const [kind, id, look] = key.split(':');
  if (kind === 'card') return cardById(adv, id);
  if (kind === 'item') return itemById(adv, id);
  return lookById(propById(adv, id), look);
}

// ---------- Saving ----------

function flushImage() {
  if (!imageDirty || !paintedKey) return;
  const thing = lookup(paintedKey);
  if (thing) thing.image = painter.toDataURL();
  imageDirty = false;
}

function changed() {
  adv.updated = Date.now();
  $('saveState').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}

async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  if (!adv) return;
  flushImage();
  try {
    await saveAdventure(adv);
    $('saveState').textContent = 'Saved in this browser';
    if (view === 'make') { renderLists(); renderLooks(); }
  } catch {
    $('saveState').textContent = "Couldn't save";
    toast("We couldn't save to this browser. It may be out of space or in private mode. Use Save to file so you don't lose your work.");
  }
}

async function flushSave() {
  if (adv && (saveTimer || imageDirty)) await saveNow();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

function downloadFile(a) {
  if (a === adv) flushImage();
  const data = JSON.stringify({ app: 'cardyssey', format: 1, version: VERSION, savedAt: new Date().toISOString(), adventure: a });
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const name = (a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'adventure') + '.cardyssey';
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  a.backedUp = Date.now();
  saveAdventure(a);
  toast(`Saved “${name}” to your downloads. Open it here any time with Open a saved file.`);
}

async function openFile(file) {
  try {
    const a = cleanAdventure(JSON.parse(await file.text()));
    await saveAdventure(a);
    location.hash = `#/make/${a.id}`;
  } catch {
    toast("That file isn't a Cardyssey adventure, or it's damaged. Try another file.");
  }
}

// ---------- Moving between screens ----------

function go(v, id = adv && adv.id, card) {
  location.hash = v === 'home' ? '#/' : `#/${v}/${id}${card ? `/${card}` : ''}`;
}

async function route() {
  const [, v, id, card] = location.hash.split('/');
  if (!['make', 'map', 'play'].includes(v) || !id) return showHome();
  if (!adv || adv.id !== id) {
    await flushSave();
    const loaded = await loadAdventure(id);
    if (!loaded) { location.hash = '#/'; return; }
    adv = normalize(loaded); editing = null; cardId = null; paintedKey = null; selBtn = null; selPlaced = null;
    askToKeep();
  }
  if (view === 'make' && v !== 'make') { painter.commitText(); flushImage(); }
  if (v === 'make') {
    if (pending && pending.kind === 'item' && itemById(adv, pending.id)) openItem(pending.id);
    else if (pending && pending.kind === 'prop' && propById(adv, pending.id)) openProp(pending.id);
    else openCard(cardById(adv, card) ? card : cardById(adv, cardId) ? cardId : adv.startId);
    pending = null;
  }
  showView(v);
  $('advTitle').value = adv.title;
  if (v === 'map') renderMapView();
  if (v === 'play') { flushImage(); setUpHints(); player.start(adv, card); }
}

function showView(v) {
  view = v;
  for (const s of document.querySelectorAll('.view')) s.hidden = s.id !== `view-${v}`;
  document.body.dataset.view = v;
  for (const t of document.querySelectorAll('.tab')) {
    t.href = `#/${t.dataset.view}/${adv ? adv.id : ''}`;
    t.classList.toggle('active', t.dataset.view === v);
    if (t.dataset.view === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
}

window.addEventListener('hashchange', route);

// ---------- Home ----------

async function showHome() {
  await flushSave();
  adv = null; editing = null; cardId = null; paintedKey = null;
  showView('home');
  const list = (await listAdventures()).sort((a, b) => b.updated - a.updated);
  $('advList').innerHTML = list.length ? list.map((a) => {
    normalize(a);
    const start = cardById(a, a.startId) || a.cards[0];
    const backup = a.backedUp ? `Backed up ${ago(a.backedUp)}` : 'Not backed up to a file yet';
    return `<li class="adv-tile">
      <a class="adv-open" href="#/make/${a.id}"><span class="thumb">${cardPreview(a, start)}</span>
        <span class="adv-title">${esc(a.title)}</span></a>
      <span class="small muted">${a.cards.length} ${a.cards.length === 1 ? 'card' : 'cards'} · edited ${ago(a.updated)}<br>${backup}</span>
      <span class="adv-actions">
        <a class="btn quiet small-btn" href="#/play/${a.id}">${withIcon('play', 'Play')}</a>
        <button class="btn quiet small-btn" data-act="file" data-id="${a.id}">${withIcon('download', 'Save to file')}</button>
        <button class="btn quiet small-btn danger-text" data-act="delete" data-id="${a.id}">${withIcon('trash', 'Delete')}</button>
      </span></li>`;
  }).join('') : `<li class="empty">No adventures yet. Press <b>New adventure</b> to draw your first card.</li>`;
  $('advList').onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = list.find((x) => x.id === b.dataset.id);
    if (b.dataset.act === 'file') downloadFile(a);
    if (b.dataset.act === 'delete' && await ask(`Delete “${a.title}”?`, `This removes it from this browser for good. If you saved it to a file, that file can bring it back.`, 'Delete adventure', true)) {
      await deleteAdventure(a.id);
      showHome();
    }
  };
}

function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

$('newAdv').innerHTML = withIcon('plus', 'New adventure');
$('newAdv').onclick = async () => {
  const a = newAdventure();
  await saveAdventure(a);
  location.hash = `#/make/${a.id}`;
};
const EXAMPLES = [
  ['The locked door', 'A tiny how-to: find a key, open a door, and see how props and changes work.', buildDemo],
  ['Find Mittens!', 'Made almost all from stamps, the way a young maker might.', buildKitten],
  ['Pizza Night', 'Drawn by hand, a bit wobbly, like a first try with the brush.', buildPizza],
  ['Solace', 'Drawn with a pen on a tablet: a quiet trip across an alien world.', buildAlien],
];
$('openDemo').onclick = () => {
  const d = $('dlg');
  d.innerHTML = `<form method="dialog"><h2 class="heading-3">Example adventures</h2>
    <p>Open one to play it or take it apart. You get your own copy, so change anything you like.</p>
    <ul class="examples">${EXAMPLES.map(([title, about], i) => `<li><button type="button" class="example" data-ex="${i}"><b>${esc(title)}</b><span class="small muted">${esc(about)}</span></button></li>`).join('')}</ul>
    <p class="dlg-actions"><button class="btn" value="close">Close</button></p></form>`;
  d.querySelector('.examples').onclick = async (e) => {
    const b = e.target.closest('[data-ex]');
    if (!b || b.disabled) return;
    b.disabled = true;
    b.querySelector('.muted').textContent = 'Getting it ready…';
    const a = await EXAMPLES[+b.dataset.ex][2]();
    await saveAdventure(a);
    d.close();
    location.hash = `#/map/${a.id}`;
    toast('This example is your own copy. Press Play to try it, or open a card in Make to see how it was made.');
  };
  d.showModal();
};
$('openFile').innerHTML = withIcon('upload', 'Open a saved file');
$('openFile').onclick = () => $('fileInput').click();
$('fileInput').onchange = (e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; };
$('toFile').innerHTML = withIcon('download', 'Save to file');
$('toFile').onclick = () => downloadFile(adv);
$('advTitle').oninput = (e) => { adv.title = e.target.value || 'My adventure'; changed(); };

// ---------- Make: the lists on the left ----------

const thumb = (src, cls = '') => `<span class="thumb ${cls}">${src ? `<img src="${src}" alt="">` : ''}</span>`;

function renderLists() {
  const is = (kind, id) => editing && editing.kind === kind && editing.id === id;
  $('cardList').innerHTML = adv.cards.map((c) => `<li><button class="card-item${is('card', c.id) ? ' active' : ''}" data-card="${c.id}">
      <span class="thumb">${cardPreview(adv, c)}</span><span class="card-item-name">${c.id === adv.startId ? icon('star') : ''}${c.ending ? icon('flag') : ''}${esc(c.name)}</span></button></li>`).join('');
  $('itemList').innerHTML = adv.items.map((it) => `<li><button class="card-item thing-item${is('item', it.id) ? ' active' : ''}" data-item="${it.id}">
      ${thumb(it.image, 'see-through')}<span class="card-item-name">${esc(it.name)}</span></button></li>`).join('');
  $('propList').innerHTML = adv.props.map((p) => `<li><button class="card-item thing-item${is('prop', p.id) ? ' active' : ''}" data-prop="${p.id}">
      ${thumb(p.looks[0].image, 'see-through')}<span class="card-item-name">${esc(p.name)}${p.looks.length > 1 ? ` <span class="muted">· ${p.looks.length} looks</span>` : ''}</span></button></li>`).join('');
  $('itemsHelp').hidden = adv.items.length > 0;
  $('propsHelp').hidden = adv.props.length > 0;
}
$('cardList').onclick = (e) => { const b = e.target.closest('[data-card]'); if (b) openCard(b.dataset.card); };
$('itemList').onclick = (e) => { const b = e.target.closest('[data-item]'); if (b) openItem(b.dataset.item); };
$('propList').onclick = (e) => { const b = e.target.closest('[data-prop]'); if (b) openProp(b.dataset.prop); };

// Point the paint canvas at a card, an item or a prop's look, saving whatever was there before.
function paintThing(key) {
  if (key === paintedKey) return;
  painter.commitText();
  flushImage();
  paintedKey = key;
  const onPaper = key.startsWith('card:');
  painter.setFormat(onPaper ? CARD_W : ITEM_SIZE, onPaper ? CARD_H : ITEM_SIZE, !onPaper);
  $('stage').dataset.kind = onPaper ? 'card' : 'thing';
  painter.load(lookup(key).image);
}

function openCard(id) {
  if (id !== cardId || !onCard()) { selBtn = null; selPlaced = null; }
  editing = { kind: 'card', id };
  cardId = id;
  paintThing(`card:${id}`);
  history.replaceState(null, '', `#/make/${adv.id}/${id}`);
  setMode(mode);
  renderEditor();
}

function openItem(id) {
  editing = { kind: 'item', id };
  paintThing(`item:${id}`);
  setMode('paint');
  renderEditor();
}

function openProp(id, lookId) {
  const prop = propById(adv, id);
  const look = lookById(prop, lookId) || prop.looks[0];
  editing = { kind: 'prop', id, look: look.id };
  paintThing(`prop:${id}:${look.id}`);
  setMode('paint');
  renderEditor();
}

function renderEditor() {
  const thing = !onCard();
  $('cardBar').hidden = thing;
  $('thingBar').hidden = !thing;
  document.querySelector('.mode-switch').hidden = thing;
  if (thing) {
    const t = editing.kind === 'item' ? itemById(adv, editing.id) : propById(adv, editing.id);
    $('thingKind').innerHTML = withIcon(editing.kind, editing.kind === 'item' ? 'Item' : 'Prop');
    $('thingName').value = t.name;
    $('thingHelp').textContent = HELP[editing.kind];
    $('thingHidden').checked = !!t.startsHidden;
    $('delThing').innerHTML = withIcon('trash', editing.kind === 'item' ? 'Delete item' : 'Delete prop');
  } else {
    const c = current();
    $('cardName').value = c.name;
    $('cardEnding').checked = c.ending;
    $('cardBack').checked = c.back;
    const isStart = c.id === adv.startId;
    $('startTag').hidden = !isStart;
    $('makeStart').hidden = isStart;
  }
  renderLists();
  renderLooks();
  renderButtons();
  renderBtnInfo();
  renderPlaced();
  renderPlaceTools();
  const active = document.querySelector('.cards-panel .active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

// ---------- Make: cards ----------

$('startTag').innerHTML = withIcon('star', 'Start card');
$('cardName').oninput = (e) => { current().name = e.target.value; renderLists(); changed(); };
$('cardName').onblur = (e) => { if (!e.target.value.trim()) { current().name = 'Untitled card'; renderEditor(); changed(); } };
$('cardEnding').onchange = (e) => { current().ending = e.target.checked; renderLists(); changed(); };
$('cardBack').onchange = (e) => { current().back = e.target.checked; changed(); };
$('makeStart').onclick = () => { adv.startId = cardId; renderEditor(); changed(); toast('Players will begin on this card.'); };

function addCard(name, after = cardId) {
  if (adv.cards.length >= MAX_CARDS) { toast(`An adventure can have up to ${MAX_CARDS} cards for now.`); return null; }
  const c = typeof name === 'string' ? newCard(name) : name;
  adv.cards.splice(adv.cards.findIndex((x) => x.id === after) + 1, 0, c);
  changed();
  return c;
}

// When something is deleted, forget any changes that pointed at it.
function dropChanges(test) {
  for (const c of adv.cards) for (const b of c.buttons) b.changes = b.changes.filter((ch) => !test(ch));
}

$('addCard').innerHTML = withIcon('plus', 'New card');
$('addCard').onclick = () => { const c = addCard(nextCardName(adv)); if (c) openCard(c.id); };
$('dupCard').innerHTML = withIcon('copy', 'Duplicate');
$('dupCard').onclick = () => {
  flushImage();
  const c = addCard(copyCard(current()));
  if (!c) return;
  openCard(c.id);
  toast('Made a copy. Paint your changes on it, then point a button at it.');
};
$('delCard').innerHTML = withIcon('trash', 'Delete');
$('delCard').onclick = async () => {
  const c = current();
  if (adv.cards.length === 1) return toast('An adventure needs at least one card.');
  const leadsHere = adv.cards.some((x) => x.buttons.some((b) => b.target === c.id));
  if (!await ask(`Delete “${c.name}”?`, `${leadsHere ? 'Buttons that lead here will go nowhere until you pick a new card for them. ' : ''}This can't be undone.`, 'Delete card', true)) return;
  const i = adv.cards.indexOf(c);
  adv.cards.splice(i, 1);
  for (const x of adv.cards) for (const b of x.buttons) if (b.target === c.id) b.target = null;
  const gone = new Set(c.buttons.map((b) => `button:${b.id}`));
  dropChanges((ch) => gone.has(ch.what));
  if (adv.startId === c.id) adv.startId = adv.cards[0].id;
  imageDirty = false;
  paintedKey = null;
  changed();
  openCard(adv.cards[Math.max(0, i - 1)].id);
};
$('playHere').innerHTML = withIcon('play', 'Play from here');
$('playHere').onclick = () => go('play', adv.id, cardId);

// ---------- Make: items and props ----------

$('addItem').innerHTML = withIcon('plus', 'New item');
$('addItem').onclick = () => {
  if (adv.items.length >= MAX_ITEMS) return toast(`An adventure can have up to ${MAX_ITEMS} items for now.`);
  const it = newItem(nextItemName(adv));
  adv.items.push(it);
  changed();
  openItem(it.id);
};
$('addProp').innerHTML = withIcon('plus', 'New prop');
$('addProp').onclick = () => {
  if (adv.props.length >= MAX_PROPS) return toast(`An adventure can have up to ${MAX_PROPS} props for now.`);
  const p = newProp(nextPropName(adv));
  adv.props.push(p);
  changed();
  openProp(p.id);
};

const editedThing = () => (editing.kind === 'item' ? itemById(adv, editing.id) : propById(adv, editing.id));
$('thingName').oninput = (e) => { editedThing().name = e.target.value; renderLists(); changed(); };
$('thingName').onblur = (e) => { if (!e.target.value.trim()) { editedThing().name = editing.kind === 'item' ? 'Untitled item' : 'Untitled prop'; renderEditor(); changed(); } };
$('thingHidden').onchange = (e) => { editedThing().startsHidden = e.target.checked; changed(); };
$('delThing').onclick = async () => {
  const kind = editing.kind, t = editedThing();
  const what = kind === 'item' ? "It's taken off every card it's on, and buttons that needed it will work for everyone." : "It's taken off every card it's on.";
  if (!await ask(`Delete “${t.name}”?`, `${what} This can't be undone.`, `Delete ${kind}`, true)) return;
  if (kind === 'item') {
    adv.items = adv.items.filter((x) => x !== t);
    for (const c of adv.cards) { c.items = c.items.filter((p) => p.itemId !== t.id); for (const b of c.buttons) if (b.needs === t.id) b.needs = null; }
  } else {
    adv.props = adv.props.filter((x) => x !== t);
    for (const c of adv.cards) c.props = c.props.filter((p) => p.propId !== t.id);
  }
  dropChanges((ch) => ch.what === `${kind}:${t.id}`);
  imageDirty = false;
  paintedKey = null;
  changed();
  openCard(cardId || adv.startId);
};

// A prop's looks, shown as a strip of thumbnails above the drawing.
function renderLooks() {
  const bar = $('looksBar');
  if (!editing || editing.kind !== 'prop') { bar.hidden = true; return; }
  bar.hidden = false;
  const prop = propById(adv, editing.id), look = lookById(prop, editing.look);
  bar.innerHTML = `<span class="label">Looks</span>
    ${prop.looks.map((l, i) => `<button class="look${l.id === look.id ? ' active' : ''}" data-look="${l.id}">${thumb(l.image, 'see-through')}<span>${esc(l.name)}${i === 0 ? ' <span class="muted">(start)</span>' : ''}</span></button>`).join('')}
    ${prop.looks.length < MAX_LOOKS ? `<button id="addLook" class="btn quiet small-btn">${withIcon('plus', 'Another look')}</button>` : ''}
    <span class="look-edit"><input id="lookName" class="text-field" maxlength="30" value="${esc(look.name)}" aria-label="Name of this look">
    ${prop.looks.length > 1 ? `<button id="delLook" class="btn quiet small-btn danger-text">${withIcon('trash', 'Delete this look')}</button>` : ''}</span>`;
}
$('looksBar').addEventListener('click', async (e) => {
  const prop = propById(adv, editing.id);
  const pick = e.target.closest('[data-look]');
  if (pick) { openProp(prop.id, pick.dataset.look); return; }
  if (e.target.closest('#addLook')) {
    flushImage();
    const from = lookById(prop, editing.look);
    const look = newLook(nextLookName(prop), from.image); // starts as a copy, so changes are easy to draw
    prop.looks.push(look);
    changed();
    openProp(prop.id, look.id);
    toast(`“${look.name}” starts as a copy. Paint how it changes, then give it a name.`);
    return;
  }
  if (e.target.closest('#delLook')) {
    const look = lookById(prop, editing.look);
    if (!await ask(`Delete the look “${look.name}”?`, "Buttons that switched the prop to this look won't anymore. This can't be undone.", 'Delete look', true)) return;
    prop.looks = prop.looks.filter((l) => l !== look);
    dropChanges((ch) => ch.to === `look:${look.id}`);
    imageDirty = false;
    paintedKey = null;
    changed();
    openProp(prop.id);
  }
});
$('looksBar').addEventListener('input', (e) => {
  if (e.target.id !== 'lookName') return;
  lookById(propById(adv, editing.id), editing.look).name = e.target.value || 'Look';
  changed();
});

// ---------- Make: Paint, Buttons and Place modes ----------

function setMode(m) {
  mode = onCard() ? m : 'paint';
  painter.commitText();
  for (const b of document.querySelectorAll('.mode-switch button')) b.setAttribute('aria-selected', b.dataset.mode === mode);
  $('stage').dataset.mode = mode;
  $('paintTools').hidden = mode !== 'paint';
  $('buttonTools').hidden = mode !== 'buttons';
  $('placeTools').hidden = mode !== 'place';
  renderButtons();
  renderPlaced();
  renderPlaceTools();
}
for (const b of document.querySelectorAll('.mode-switch button')) b.onclick = () => setMode(b.dataset.mode);

// ---------- Make: paint tools ----------

$('toolGrid').innerHTML = TOOLS.map(([t, label]) => `<button class="tool" data-tool="${t}" aria-pressed="false">${withIcon(t, label)}</button>`).join('');
$('stampGrid').innerHTML = STAMPS.map((s) => `<button class="stamp" data-stamp="${s}" aria-label="${s} stamp" title="${s[0].toUpperCase() + s.slice(1)}">${stampSvg(s)}</button>`).join('');
$('pickerTool').innerHTML = withIcon('picker', 'Pick a color from the picture');
$('sizes').innerHTML = SIZES.map(([label, n]) => `<button class="size" data-size="${n}" title="${label}" aria-label="${label}"><span style="width:${Math.min(n, 26)}px;height:${Math.min(n, 26)}px"></span></button>`).join('');
$('palette').innerHTML = PALETTE.map((c) => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('');
$('undo').innerHTML = withIcon('undo', 'Undo');
$('redo').innerHTML = withIcon('redo', 'Redo');
$('flipCard').innerHTML = withIcon('flip', 'Flip the picture left to right');
$('clearCard').innerHTML = withIcon('trash', 'Clear the whole picture');

function setTool(t) {
  painter.commitText();
  painter.tool = t;
  painter.wctx.clearRect(0, 0, painter.W, painter.H);
  for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', b.dataset.tool === t);
  $('stage').dataset.tool = t;
  $('stampPicker').hidden = t !== 'stamp';
}
function setStamp(s) {
  painter.stamp = s;
  for (const b of document.querySelectorAll('[data-stamp]')) b.setAttribute('aria-pressed', b.dataset.stamp === s);
  setTool('stamp');
}
function setColor(c) {
  painter.color = c;
  for (const b of document.querySelectorAll('.swatch')) b.setAttribute('aria-pressed', b.dataset.color === c);
  $('anyColor').value = c;
  if (['eraser', 'picker', 'stamp'].includes(painter.tool)) setTool('brush');
}
function setSize(n) {
  painter.size = n;
  for (const b of document.querySelectorAll('.size')) b.setAttribute('aria-pressed', +b.dataset.size === n);
  $('sizeSlider').value = n;
  $('sizeOut').textContent = n;
}

$('paintTools').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tool]'), s = e.target.closest('[data-size]'), c = e.target.closest('[data-color]'), st = e.target.closest('[data-stamp]');
  if (t) setTool(t.dataset.tool);
  if (s) setSize(+s.dataset.size);
  if (c) setColor(c.dataset.color);
  if (st) setStamp(st.dataset.stamp);
});
$('sizeSlider').oninput = (e) => setSize(+e.target.value);
$('opacitySlider').oninput = (e) => { painter.opacity = e.target.value / 100; $('opacityOut').textContent = `${100 - e.target.value}%`; };
$('filled').onchange = (e) => { painter.filled = e.target.checked; };
$('anyColor').oninput = (e) => setColor(e.target.value);
$('undo').onclick = () => painter.undo();
$('redo').onclick = () => painter.redo();
$('flipCard').onclick = () => painter.flip();
$('clearCard').onclick = async () => { if (await ask('Clear this picture?', 'Everything painted on it is wiped. You can still press Undo afterwards.', 'Clear it', true)) painter.clear(); };

painter.onChange = () => { imageDirty = true; changed(); };
painter.onPick = (c) => setColor(c);
painter.onHistory = () => { $('undo').disabled = !painter.undoStack.length; $('redo').disabled = !painter.redoStack.length; };

// ---------- Make: invisible buttons ----------

$('btnShapes').innerHTML = BUTTON_SHAPES.map(([k, label]) => `<button class="tool" data-shape="${k}">${withIcon(k, label)}</button>`).join('');
$('btnShapes').onclick = (e) => { const b = e.target.closest('[data-shape]'); if (b) setBtnShape(b.dataset.shape); };
function setBtnShape(k) {
  btnShape = k;
  for (const b of document.querySelectorAll('[data-shape]')) b.setAttribute('aria-pressed', b.dataset.shape === k);
}

function buttonLabel(b) {
  const need = itemById(adv, b.needs);
  const parts = [buttonName(adv, b), need ? `needs ${need.name}` : '', b.changes.length ? `${b.changes.length} ${b.changes.length === 1 ? 'change' : 'changes'}` : '', b.startsOff ? 'off at start' : ''].filter(Boolean);
  return parts.join(' · ');
}

// Labels sit in each button's top-left corner, cut to the button's width, so buttons stacked
// on top of each other (a lock, and the doorway it reveals) show their labels one under the other.
function renderButtons() {
  const c = current();
  if (!c || !onCard()) { $('btnLayer').innerHTML = ''; return; }
  $('btnLayer').innerHTML = c.buttons.map((b) => {
    const box = bounds(b), full = buttonLabel(b), fits = Math.max(4, Math.floor((box.w - 12) / 9));
    const label = full.length > fits ? full.slice(0, fits - 1) + '…' : full;
    const cls = `btn-shape${b.id === selBtn ? ' selected' : ''}${buttonDoesSomething(adv, b) ? '' : ' unlinked'}${b.startsOff ? ' off' : ''}`;
    return `<g class="${cls}" data-btn="${b.id}">${shapeSvg(b)}<title>${esc(full)}</title><text x="${box.x + 8}" y="${box.y + 16}">${esc(label)}</text></g>`;
  }).join('');
}

const opt = (value, label, selected) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
const soundOptions = (chosen) => opt('', 'No sound', !chosen) + SOUNDS.map(([id, label]) => opt(id, label, id === chosen)).join('');
const fold = (name, title, body, forceOpen) => `<details class="fold" data-fold="${name}"${forceOpen || foldsOpen.has(name) ? ' open' : ''}><summary>${title}</summary><div class="fold-body">${body}</div></details>`;

// Everything a change could affect, for the "What changes?" menu.
function changeChoices(self) {
  const group = (label, list) => (list.length ? `<optgroup label="${label}">${list.join('')}</optgroup>` : '');
  const buttons = adv.cards.flatMap((c) => c.buttons.filter((b) => b !== self).map((b) => opt(`button:${b.id}`, `Button ${buttonName(adv, b)} (on ${c.name})`, draft.what === `button:${b.id}`)));
  return group('Props', adv.props.map((p) => opt(`prop:${p.id}`, p.name, draft.what === `prop:${p.id}`)))
    + group('Items', adv.items.map((i) => opt(`item:${i.id}`, i.name, draft.what === `item:${i.id}`)))
    + group('Buttons', buttons);
}
function changeOutcomes() {
  const [kind, id] = draft.what.split(':');
  if (kind === 'button') return opt('show', 'turns on', draft.to === 'show') + opt('hide', 'turns off', draft.to === 'hide');
  const list = [opt('show', 'appears', draft.to === 'show'), opt('hide', 'disappears', draft.to === 'hide')];
  if (kind === 'prop') for (const l of propById(adv, id).looks) list.push(opt(`look:${l.id}`, `switches to “${l.name}”`, draft.to === `look:${l.id}`));
  return list.join('');
}

function renderBtnInfo() {
  const c = current(), b = c && onCard() && c.buttons.find((x) => x.id === selBtn);
  if (!b) {
    $('btnInfo').innerHTML = c && c.buttons.length ? `<p class="small muted">Click a button on the card to choose what it does, move it, or delete it.</p>` : '';
    return;
  }
  const cards = adv.cards.map((x) => opt(x.id, x.name + (x.id === c.id ? ' (this card)' : ''), x.id === b.target)).join('');
  const items = adv.items.map((it) => opt(it.id, it.name, it.id === b.needs)).join('');

  const lock = adv.items.length
    ? `<label class="small" for="btnNeeds">Only works if the player has</label>
       <select id="btnNeeds">${opt('', 'Nothing (always works)', !b.needs)}${items}</select>
       ${b.needs ? `<label class="check small"><input type="checkbox" id="btnUseUp"${b.useUp ? ' checked' : ''}> Use the item up</label>
         <label class="small" for="btnLocked">Message if they don't have it</label>
         <input id="btnLocked" class="text-field" maxlength="120" value="${esc(b.lockedMsg || '')}" placeholder="Leave empty for no message">
         <label class="small" for="btnLockedSound">Sound if they don't have it</label>
         <span class="row"><select id="btnLockedSound">${soundOptions(b.lockedSound)}</select>
           <button id="hearLocked" class="btn quiet small-btn"${b.lockedSound ? '' : ' disabled'}>${withIcon('sound', 'Listen')}</button></span>
         <p class="small muted">Once it opens, it stays open.</p>` : ''}`
    : `<p class="small muted">First draw an item (under Items, on the left). Then a button can need it, like a door that needs a key.</p>`;

  const anything = adv.props.length || adv.items.length || adv.cards.some((x) => x.buttons.length > 1);
  const listed = b.changes.map((ch) => `<li><span>${esc(changeText(adv, ch) || '')}</span><button class="btn quiet small-btn danger-text" data-drop="${ch.id}" aria-label="Remove this change">${icon('trash')}</button></li>`).join('');
  const changes = `${listed ? `<ul class="change-list">${listed}</ul>` : ''}
    ${anything ? `<label class="small" for="chWhat">What changes?</label>
      <select id="chWhat">${opt('', 'Choose something…', !draft.what)}${changeChoices(b)}</select>
      ${draft.what ? `<select id="chTo" aria-label="How it changes">${opt('', 'How?', !draft.to)}${changeOutcomes()}</select>
        <button id="chAdd" class="btn small-btn"${draft.to ? '' : ' disabled'}>${withIcon('plus', 'Add this change')}</button>` : ''}`
    : `<p class="small muted">Draw a prop (under Props, on the left), like a door with an open look. Then a button can change it.</p>`}
    <p class="small muted">Changes happen once and stay, on every card.</p>
    <label class="check small"><input type="checkbox" id="btnOff"${b.startsOff ? ' checked' : ''}> This button is off at the start (another button can turn it on)</label>`;

  $('btnInfo').innerHTML = `<div class="btn-info">
    <p class="selected-name">${icon('rect')} Button: ${esc(buttonName(adv, b))}${b.needs ? ' (locked)' : ''}</p>
    <label class="label" for="btnTarget">Goes to</label>
    <select id="btnTarget">${opt('', 'Nowhere (stay on this card)', !b.target)}${cards}<option value="__new">＋ A new card</option></select>
    ${cardById(adv, b.target) ? `<button id="openTarget" class="btn quiet">Open that card →</button>` : ''}
    <label class="label" for="btnSound">${b.needs ? 'Sound when it works' : 'Plays a sound'}</label>
    <span class="row"><select id="btnSound">${soundOptions(b.sound)}</select>
      <button id="hearSound" class="btn quiet small-btn"${b.sound ? '' : ' disabled'}>${withIcon('sound', 'Listen')}</button></span>
    ${fold('lock', `${icon('lock')} Lock it with an item`, lock, !!b.needs)}
    ${fold('changes', `${icon('change')} Also, after this is clicked…${b.changes.length ? ` (${b.changes.length})` : ''}`, changes, b.changes.length > 0 || b.startsOff)}
    <button id="delBtn" class="btn quiet danger-text">${withIcon('trash', 'Delete this button')}</button>
    <p class="small muted">Drag the button to move it. To reshape it, delete it and draw a new one.</p></div>`;

  const redraw = () => { changed(); renderButtons(); renderBtnInfo(); };
  for (const d of $('btnInfo').querySelectorAll('details')) d.ontoggle = () => { if (d.open) foldsOpen.add(d.dataset.fold); else foldsOpen.delete(d.dataset.fold); };
  $('btnTarget').onchange = (e) => {
    let t = e.target.value || null;
    if (t === '__new') {
      const n = addCard(nextCardName(adv));
      if (!n) { renderBtnInfo(); return; }
      t = n.id;
      toast(`Made a new card called “${n.name}”. Open it to paint it and give it a better name.`);
    }
    b.target = t;
    changed();
    renderEditor();
  };
  if ($('openTarget')) $('openTarget').onclick = () => openCard(b.target);
  $('btnSound').onchange = (e) => { b.sound = e.target.value || null; if (b.sound) playSound(b.sound); redraw(); };
  $('hearSound').onclick = () => playSound(b.sound);
  if ($('btnNeeds')) $('btnNeeds').onchange = (e) => { b.needs = e.target.value || null; redraw(); };
  if ($('btnUseUp')) $('btnUseUp').onchange = (e) => { b.useUp = e.target.checked; changed(); };
  if ($('btnLocked')) $('btnLocked').oninput = (e) => { b.lockedMsg = e.target.value; changed(); };
  if ($('btnLockedSound')) {
    $('btnLockedSound').onchange = (e) => { b.lockedSound = e.target.value || null; if (b.lockedSound) playSound(b.lockedSound); redraw(); };
    $('hearLocked').onclick = () => playSound(b.lockedSound);
  }
  if ($('chWhat')) $('chWhat').onchange = (e) => { draft = { what: e.target.value, to: '' }; renderBtnInfo(); $('chTo')?.focus(); };
  if ($('chTo')) $('chTo').onchange = (e) => { draft.to = e.target.value; renderBtnInfo(); $('chAdd')?.focus(); };
  if ($('chAdd')) $('chAdd').onclick = () => {
    b.changes = b.changes.filter((ch) => !(ch.what === draft.what && (ch.to.startsWith('look:') ? draft.to.startsWith('look:') : !draft.to.startsWith('look:'))));
    b.changes.push({ id: uid(), what: draft.what, to: draft.to });
    draft = { what: '', to: '' };
    redraw();
  };
  $('btnInfo').querySelector('.change-list')?.addEventListener('click', (e) => {
    const d = e.target.closest('[data-drop]');
    if (d) { b.changes = b.changes.filter((ch) => ch.id !== d.dataset.drop); redraw(); }
  });
  $('btnOff').onchange = (e) => { b.startsOff = e.target.checked; redraw(); };
  $('delBtn').onclick = deleteSelectedButton;
}

function deleteSelectedButton() {
  const c = current();
  c.buttons = c.buttons.filter((x) => x.id !== selBtn);
  dropChanges((ch) => ch.what === `button:${selBtn}`);
  selBtn = null;
  changed();
  renderButtons();
  renderBtnInfo();
}

// Positions on the card from a pointer event.
function cardPt(layer, e) {
  const r = layer.getBoundingClientRect();
  return [Math.max(0, Math.min(CARD_W, ((e.clientX - r.left) * CARD_W) / r.width)), Math.max(0, Math.min(CARD_H, ((e.clientY - r.top) * CARD_H) / r.height))];
}

// Drawing and moving buttons on the card.
const layer = $('btnLayer');
let bdrag = null;
layer.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || bdrag) return;
  const p = cardPt(layer, e);
  // Every button under the pointer, top first. Tapping the selected one again picks the one underneath.
  const under = [...new Set(document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest && el.closest('#btnLayer [data-btn]')).filter(Boolean).map((g) => g.dataset.btn))];
  layer.setPointerCapture(e.pointerId);
  if (under.length) {
    const again = under.includes(selBtn);
    const id = again ? selBtn : under[0];
    if (selBtn !== id) draft = { what: '', to: '' };
    selBtn = id;
    const b = current().buttons.find((x) => x.id === selBtn);
    bdrag = { pointer: e.pointerId, move: b, from: p, orig: structuredClone(b), moved: false, again, under };
    if (!again && under.length > 1) toast('Buttons overlap here. Tap again to pick the one underneath.');
    renderButtons(); renderBtnInfo();
    return;
  }
  selBtn = null;
  bdrag = { pointer: e.pointerId, start: p, points: [p] };
  renderBtnInfo();
});
layer.addEventListener('pointermove', (e) => {
  if (!bdrag || e.pointerId !== bdrag.pointer) return;
  const p = cardPt(layer, e);
  if (bdrag.move) {
    const dx = p[0] - bdrag.from[0], dy = p[1] - bdrag.from[1], b = bdrag.move, o = bdrag.orig;
    if (Math.hypot(dx, dy) > 2) bdrag.moved = true;
    if (b.kind === 'free') b.points = o.points.map(([x, y]) => [x + dx, y + dy]);
    else { b.x = o.x + dx; b.y = o.y + dy; }
    renderButtons();
    return;
  }
  const last = bdrag.points[bdrag.points.length - 1];
  if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 4) bdrag.points.push(p);
  bdrag.end = p;
  const d = draftButton();
  renderButtons();
  if (d) layer.insertAdjacentHTML('beforeend', `<g class="btn-shape drafting">${shapeSvg(d)}</g>`);
});
function endButtonDrag(e) {
  if (!bdrag || e.pointerId !== bdrag.pointer) return;
  const d = bdrag;
  bdrag = null;
  if (d.move) {
    if (d.moved) changed();
    else if (d.again && d.under.length > 1) {
      selBtn = d.under[(d.under.indexOf(selBtn) + 1) % d.under.length];
      draft = { what: '', to: '' };
      renderButtons(); renderBtnInfo();
    }
    return;
  }
  const b = e.type === 'pointerup' && draftButton(d);
  const box = b && bounds(b);
  if (!b || box.w < 12 || box.h < 12) { renderButtons(); return; } // too small: treat as a tap on empty space
  current().buttons.push(b);
  selBtn = b.id;
  draft = { what: '', to: '' };
  changed();
  renderButtons();
  renderBtnInfo();
}
layer.addEventListener('pointerup', endButtonDrag);
layer.addEventListener('pointercancel', endButtonDrag);

function draftButton(d = bdrag) {
  if (!d || !d.end) return null;
  if (btnShape === 'free') return d.points.length >= 3 ? newButton({ kind: 'free', points: d.points.map((p) => [...p]) }) : null;
  const [x1, y1] = d.start, [x2, y2] = d.end;
  return newButton({ kind: btnShape, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
}

// ---------- Make: placing items and props on a card ----------

const placedLayer = $('stickerLayer');
const placedList = (kind) => (kind === 'item' ? current().items : current().props);
function findPlaced(key) {
  if (!key || !current()) return null;
  const [kind, id] = key.split(':');
  const p = placedList(kind).find((x) => x.id === id);
  return p && { kind, p, thing: kind === 'item' ? itemById(adv, p.itemId) : propById(adv, p.propId) };
}

// Props first (they're scenery), then items on top, the same order as in Play.
function renderPlaced() {
  const c = current();
  if (!c || !onCard()) { placedLayer.innerHTML = ''; return; }
  const one = (kind, p, thing, image) => `<g class="placed${`${kind}:${p.id}` === selPlaced ? ' selected' : ''}${thing.startsHidden ? ' starts-hidden' : ''}" data-placed="${kind}:${p.id}">
      <title>${esc(thing.name)}${thing.startsHidden ? ' (hidden at the start)' : ''}</title>
      ${image ? `<image href="${image}" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}"/>` : `<text class="placed-name" x="${p.x + p.size / 2}" y="${p.y + p.size / 2}">${esc(thing.name)}</text>`}
      <rect class="placed-box" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}" rx="6"/></g>`;
  placedLayer.innerHTML = c.props.map((p) => { const t = propById(adv, p.propId); return t ? one('prop', p, t, t.looks[0].image) : ''; }).join('')
    + c.items.map((p) => { const t = itemById(adv, p.itemId); return t ? one('item', p, t, t.image) : ''; }).join('');
}

function renderPlaceTools() {
  if (mode !== 'place' || !onCard() || !adv) return;
  const pickList = (kind, list, image) => (list.length
    ? `<div class="place-grid">${list.map((t) => `<button class="place-pick" data-put="${kind}:${t.id}">${thumb(image(t), 'see-through')}<span>${esc(t.name)}</span></button>`).join('')}</div>`
    : `<p class="small muted">No ${kind}s yet. <button class="linkbtn" data-new="${kind}">Draw a new ${kind}</button></p>`);
  $('placePicker').innerHTML = `<h3 class="label">Put a prop on this card</h3>${pickList('prop', adv.props, (t) => t.looks[0].image)}
    <h3 class="label">Put an item on this card</h3>${pickList('item', adv.items, (t) => t.image)}`;
  const sel = findPlaced(selPlaced);
  $('placedInfo').innerHTML = sel
    ? `<div class="btn-info"><span class="label">${esc(sel.thing.name)} on this card</span>
        <label class="slider">Size <input id="placedSize" type="range" min="40" max="480" value="${sel.p.size}"></label>
        <button id="removePlaced" class="btn quiet danger-text">${withIcon('trash', 'Take it off this card')}</button>
        <p class="small muted">${sel.kind === 'item' ? 'Players click an item to pick it up. Once picked up, it disappears from every card it’s on.' : 'Players can’t click props. Buttons can make a prop appear, disappear or change its look.'}</p></div>`
    : `<p class="small muted">${current().items.length + current().props.length ? 'Tap something on the card to move, resize or remove it.' : 'Tap a prop or item above to put it on this card.'}</p>`;
  if (sel) {
    $('placedSize').oninput = (e) => {
      const s = +e.target.value, p = sel.p, cx = p.x + p.size / 2, cy = p.y + p.size / 2;
      Object.assign(p, { size: s, x: cx - s / 2, y: cy - s / 2 });
      renderPlaced();
      changed();
    };
    $('removePlaced').onclick = removeSelectedPlaced;
  }
}

$('placePicker').addEventListener('click', (e) => {
  const n = e.target.closest('[data-new]');
  if (n) { $(n.dataset.new === 'item' ? 'addItem' : 'addProp').click(); return; }
  const b = e.target.closest('[data-put]');
  if (!b) return;
  const [kind, id] = b.dataset.put.split(':'), s = PLACED_SIZE[kind];
  const p = { id: uid(), [kind === 'item' ? 'itemId' : 'propId']: id, x: CARD_W / 2 - s / 2, y: CARD_H / 2 - s / 2, size: s };
  placedList(kind).push(p);
  selPlaced = `${kind}:${p.id}`;
  changed();
  renderPlaced();
  renderPlaceTools();
});

function removeSelectedPlaced() {
  const sel = findPlaced(selPlaced);
  if (!sel) return;
  const list = placedList(sel.kind);
  list.splice(list.indexOf(sel.p), 1);
  selPlaced = null;
  changed();
  renderPlaced();
  renderPlaceTools();
}

let pdrag = null;
placedLayer.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || mode !== 'place' || pdrag) return;
  const hit = e.target.closest('[data-placed]');
  selPlaced = hit ? hit.dataset.placed : null;
  const sel = findPlaced(selPlaced);
  if (sel) {
    placedLayer.setPointerCapture(e.pointerId);
    pdrag = { pointer: e.pointerId, p: sel.p, from: cardPt(placedLayer, e), x: sel.p.x, y: sel.p.y, moved: false };
  }
  renderPlaced();
  renderPlaceTools();
});
placedLayer.addEventListener('pointermove', (e) => {
  if (!pdrag || e.pointerId !== pdrag.pointer) return;
  const [x, y] = cardPt(placedLayer, e), dx = x - pdrag.from[0], dy = y - pdrag.from[1];
  if (Math.hypot(dx, dy) > 2) pdrag.moved = true;
  pdrag.p.x = pdrag.x + dx;
  pdrag.p.y = pdrag.y + dy;
  renderPlaced();
});
function endPlacedDrag(e) { if (!pdrag || e.pointerId !== pdrag.pointer) return; if (pdrag.moved) changed(); pdrag = null; }
placedLayer.addEventListener('pointerup', endPlacedDrag);
placedLayer.addEventListener('pointercancel', endPlacedDrag);

// ---------- Keyboard shortcuts in Make ----------

document.addEventListener('keydown', (e) => {
  if (view !== 'make' || tour.active || e.target.closest('input, select, textarea') || $('dlg').open) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? painter.redo() : painter.undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); painter.redo(); }
  else if ((k === 'delete' || k === 'backspace') && mode === 'buttons' && selBtn) { e.preventDefault(); deleteSelectedButton(); }
  else if ((k === 'delete' || k === 'backspace') && mode === 'place' && selPlaced) { e.preventDefault(); removeSelectedPlaced(); }
});

// ---------- Map ----------

function renderMapView() {
  renderMap($('mapCanvas'), adv, (id) => go('make', adv.id, id));
  const problems = findProblems(adv), endings = adv.cards.filter((c) => c.ending).length;
  const count = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
  $('mapCount').textContent = [count(adv.cards.length, 'card'), count(endings, 'ending'), adv.items.length ? count(adv.items.length, 'item') : '', adv.props.length ? count(adv.props.length, 'prop') : ''].filter(Boolean).join(' · ');
  $('problems').innerHTML = problems.length
    ? problems.map((p) => `<li><button class="linkbtn" data-open="${p.kind || 'card'}:${p.id}">${esc(p.text)}</button></li>`).join('')
    : `<li class="all-good">Everything is connected. Nice work!</li>`;
  $('problems').onclick = (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const [kind, id] = b.dataset.open.split(':');
    if (kind === 'card') go('make', adv.id, id);
    else { pending = { kind, id }; go('make', adv.id); }
  };
  $('allowHints').checked = adv.allowHints !== false;
}
$('allowHints').onchange = (e) => { adv.allowHints = e.target.checked; changed(); };

// ---------- Play ----------

// The designer decides (on the Map) whether players may reveal the hidden buttons.
function setUpHints() {
  const allowed = adv.allowHints !== false;
  $('showBtnsLabel').hidden = !allowed;
  $('hintsOff').hidden = allowed;
  if (!allowed) $('showBtns').checked = false;
  player.showButtons($('showBtns').checked);
}
$('showBtns').onchange = (e) => player.showButtons(e.target.checked);
$('restart').innerHTML = withIcon('restart', 'Start over');
$('restart').onclick = () => player.start(adv);

// Sound on or off is remembered in this browser, as a convenience.
let soundOn = true;
try { soundOn = localStorage.getItem('cardyssey-sound') !== 'off'; } catch { /* storage blocked: default to on */ }
$('soundOn').checked = soundOn;
player.setSound(soundOn);
$('soundOn').onchange = (e) => {
  player.setSound(e.target.checked);
  try { localStorage.setItem('cardyssey-sound', e.target.checked ? 'on' : 'off'); } catch { /* fine */ }
};

// ---------- The guided tour ----------

const waitFor = async (test) => { for (let i = 0; i < 200 && !test(); i++) await new Promise((r) => setTimeout(r, 25)); };
const tour = createTour({
  painter, $,
  adv: () => adv,
  current,
  changed,
  flushImage,
  renderEditor,
  renderButtons,
  openCard, openItem, openProp, setMode, setTool, setColor, setSize, setStamp,
  addCard: (name, after) => addCard(name, after),
  place(kind, id, x, y, size) {
    const p = { id: uid(), [kind === 'item' ? 'itemId' : 'propId']: id, x, y, size };
    placedList(kind).push(p);
    selPlaced = `${kind}:${p.id}`;
    changed();
    renderPlaced();
    renderPlaceTools();
  },
  selectButton(id) { selBtn = id; draft = { what: '', to: '' }; renderButtons(); renderBtnInfo(); },
  async show(v) { go(v); await waitFor(() => view === v); await new Promise((r) => setTimeout(r, 150)); },
  // Start the tour's adventure over from a blank first card (used when going Back).
  async reset() {
    if (view !== 'make') { go('make'); await waitFor(() => view === 'make'); }
    const first = newCard('Start');
    Object.assign(adv, { title: 'My first adventure', startId: first.id, cards: [first], items: [], props: [] });
    $('advTitle').value = adv.title;
    imageDirty = false; paintedKey = null; selBtn = null; selPlaced = null;
    openCard(first.id);
    setMode('paint');
    changed();
    await painter.ready;
  },
  ended(how) {
    if (how === 'finished') toast(`“${adv.title}” is saved in your adventures. Change anything you like, or make your own!`);
    else toast('Tour closed. Your tour adventure is saved, and you can take the tour again any time.');
  },
});

async function startTour() {
  await flushSave();
  const a = newAdventure('My first adventure');
  await saveAdventure(a);
  location.hash = `#/make/${a.id}`;
  await waitFor(() => adv && adv.id === a.id && view === 'make');
  await painter.ready;
  setMode('paint');
  tour.start();
}
$('startTour').innerHTML = withIcon('play', 'Take the tour');
$('startTour').onclick = startTour;
$('tourBtn').innerHTML = withIcon('help', 'Tour');
$('tourBtn').onclick = async () => {
  if (await ask('Take the tour?', 'The tour starts a new practice adventure and builds it with you, step by step. This adventure stays saved just as it is.', 'Start the tour')) startTour();
};

// ---------- Dialogs, messages, feedback, privacy ----------

function ask(title, text, okLabel, danger) {
  const d = $('dlg');
  d.innerHTML = `<form method="dialog"><h2 class="heading-3">${esc(title)}</h2><p>${esc(text)}</p>
    <p class="dlg-actions"><button class="btn" value="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" value="yes">${esc(okLabel)}</button></p></form>`;
  d.showModal();
  return new Promise((resolve) => d.addEventListener('close', () => resolve(d.returnValue === 'yes'), { once: true }));
}

let toastTimer = 0;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const os = /CrOS/.test(ua) ? 'ChromeOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'browser';
  const touch = navigator.maxTouchPoints > 0 ? ' · touch screen' : '';
  return `${os} · ${browser} · window ${innerWidth}×${innerHeight}${touch}`;
}

// Feedback (the Octopus Heart protocol, see shared/feedback-service): a short form that sends straight
// to our inbox, plus our email address for people who'd rather write an email themselves. Either way
// the subject is "<App> feedback (v<version>): <Type>", so the daily support digest picks it up.
const KINDS = [['Bug', 'Something went wrong'], ['Idea', 'I have an idea'], ['Other', 'Something else']];

function feedbackBody(kind, message = '') {
  return [message, '', '---', 'Please keep the lines below; they help us fix problems.', `App: Cardyssey ${VERSION}`, `Type: ${kind}`, `Device: ${deviceInfo()}`].join('\n');
}
const mailtoLink = (kind, message) => `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Cardyssey feedback (v${VERSION}): ${kind}`)}&body=${encodeURIComponent(feedbackBody(kind, message))}`;

async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); } catch { toast("Couldn't copy. You can select the text and copy it yourself."); }
}

function showFeedback() {
  const d = $('dlg');
  d.innerHTML = `<form class="feedback" novalidate>
    <h2 class="heading-3">Send feedback</h2>
    <p>Thanks for trying Cardyssey! Tell us what happened or what you'd like, and we'll read every message.</p>
    <fieldset class="kinds"><legend class="label">What's it about?</legend>
      ${KINDS.map(([k, label], i) => `<label class="kind"><input type="radio" name="kind" value="${k}"${i === 0 ? ' checked' : ''}><span>${label}</span></label>`).join('')}</fieldset>
    <label class="label" for="fbMessage">Your message</label>
    <textarea id="fbMessage" class="text-field" rows="5" maxlength="3000" required placeholder="What happened, or what's your idea?"></textarea>
    <label class="label" for="fbEmail">Your email, if you'd like a reply <span class="muted">(optional)</span></label>
    <input id="fbEmail" class="text-field" type="email" maxlength="200" autocomplete="email" placeholder="you@example.com">
    <p class="small muted">Under 13? Ask a grown-up before adding an email. We only use it to answer this message, then delete it.</p>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p id="fbStatus" class="fb-status" role="status" hidden></p>
    <p class="dlg-actions"><button type="button" class="btn" data-close>Close</button><button type="submit" class="btn primary" id="fbSend">Send</button></p>
    <div class="or-email">
      <p class="small"><b>Rather use email?</b> Write to <b>${FEEDBACK_EMAIL}</b></p>
      <p class="small"><button type="button" class="linkbtn" data-copy-address>Copy the address</button> · <a id="fbMailto" href="${mailtoLink('Other', '')}">Open my email app</a></p>
    </div>
    <p class="small muted">Along with your message we send the app version and your type of device and browser, so we can find problems. Nothing else, and your adventures are never attached.</p>
  </form>`;
  const form = d.querySelector('form'), status = $('fbStatus'), send = $('fbSend');
  const kind = () => form.querySelector('[name="kind"]:checked').value;
  const say = (text, bad) => { status.hidden = false; status.textContent = text; status.classList.toggle('bad', !!bad); };
  // Keep the email link up to date, so it carries whatever has been typed.
  const syncMailto = () => { $('fbMailto').href = mailtoLink(kind(), $('fbMessage').value); };
  form.addEventListener('input', syncMailto);
  form.addEventListener('change', syncMailto);
  form.querySelector('[data-close]').onclick = () => d.close();
  form.querySelector('[data-copy-address]').onclick = () => copyText(FEEDBACK_EMAIL, 'Email address copied.');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const message = $('fbMessage').value.trim(), email = $('fbEmail').value.trim();
    if (!message) { say('Please write a message first.', true); $('fbMessage').focus(); return; }
    if (email && !$('fbEmail').checkValidity()) { say("That email address doesn't look quite right. Fix it, or leave it empty.", true); $('fbEmail').focus(); return; }
    send.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(FEEDBACK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: 'Cardyssey', version: VERSION, kind: kind(), message, replyTo: email, device: deviceInfo(), website: form.website.value }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.innerHTML = `<h2 class="heading-3">Thank you!</h2><p>Your message is on its way to us.${email ? " If you asked a question, we'll reply by email." : ''}</p>
        <p class="dlg-actions"><button type="button" class="btn primary" data-close>Done</button></p>`;
      form.querySelector('[data-close]').onclick = () => d.close();
    } catch {
      send.disabled = false;
      say("We couldn't send that just now (maybe you're offline). Your message is still here: try again, or copy it and email it to us instead.", true);
      if (!form.querySelector('[data-copy-message]')) status.insertAdjacentHTML('afterend', `<p class="small"><button type="button" class="linkbtn" data-copy-message>Copy my message</button></p>`);
      form.querySelector('[data-copy-message]').onclick = () => copyText(feedbackBody(kind(), message), 'Message copied. Paste it into an email to us.');
    }
  };
  d.showModal();
  $('fbMessage').focus();
}
function showPrivacy() {
  const d = $('dlg');
  d.innerHTML = `<form method="dialog"><h2 class="heading-3">Privacy</h2>
    <p><b>Cardyssey collects nothing about you.</b> There are no accounts, no ads, no tracking and no analytics.</p>
    <p>Your adventures are saved in this browser, on this device. They never leave it unless you choose Save to file, and then the file goes to your own downloads folder.</p>
    <p>If you send feedback with the form, your message (and your email, only if you add it) goes to our inbox through our feedback service, which keeps nothing. We use an email address only to reply, then delete it.</p>
    <p>Sharing adventures with a link will come later. When it does, this page will say exactly what is stored and for how long.</p>
    <p class="dlg-actions"><button class="btn primary" value="close">Got it</button></p></form>`;
  d.showModal();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a && a.dataset.act === 'feedback') showFeedback();
  if (a && a.dataset.act === 'privacy') showPrivacy();
});

// ---------- Start ----------

setColor('#000000');
setSize(12);
setStamp('tree');
setTool('brush');
$('opacitySlider').value = 100;
$('opacityOut').textContent = '0%';
setBtnShape('rect');
document.fonts.load('500 20px Lexend').catch(() => {});
route();
