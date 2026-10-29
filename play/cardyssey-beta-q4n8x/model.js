// What an adventure is made of, plus small helpers every screen shares.
//
// adventure = { id, title, startId, cards: [card], items: [item], props: [prop],
//               created, updated, backedUp, allowHints }
//             allowHints: whether players may switch on "Show where the buttons are" (missing = yes)
// card      = { id, name, image (PNG data URL or null), ending, back, buttons: [button],
//               items: [placed], props: [placed] }
// button    = { id, kind: 'rect' | 'oval' | 'free', x, y, w, h, points (free only),
//               target (card id or null), sound (sound id or null),
//               needs (item id or null), useUp (bool), lockedMsg and lockedSound (when the player lacks the item),
//               startsOff (bool: hidden until another button turns it on), changes: [change] }
// change    = { id, what: 'prop:<id>' | 'item:<id>' | 'button:<id>', to: 'show' | 'hide' | 'look:<look id>' }
//             "Also, after this is clicked…": changes happen once and stay, everywhere the thing appears.
// item      = { id, name, image (see-through PNG, ITEM_SIZE square), startsHidden }: drawn once, placed on cards,
//             picked up by players
// prop      = { id, name, looks: [{ id, name, image }], startsHidden }: drawn once, placed on cards, can change look
// placed    = { id, itemId | propId, x, y, size }: an item or prop sitting on a card
// Positions are in card pixels (CARD_W × CARD_H), whatever size the card is shown at.
import { soundName } from './sounds.js?v=mvu71pwg';

export const CARD_W = 960, CARD_H = 600;
export const ITEM_SIZE = 300;
export const MAX_CARDS = 150; // keeps adventures quick to open and, later, free to host
export const MAX_ITEMS = 40;
export const MAX_PROPS = 60;
export const MAX_LOOKS = 6;
export const DEFAULT_LOCKED_MSG = "It's locked.";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newCard(name) {
  return { id: uid(), name, image: null, ending: false, back: false, buttons: [], items: [], props: [] };
}
export const newItem = (name) => ({ id: uid(), name, image: null, startsHidden: false });
export const newLook = (name, image = null) => ({ id: uid(), name, image });
export const newProp = (name) => ({ id: uid(), name, looks: [newLook('Look 1')], startsHidden: false });
export const newButton = (props) => ({
  id: uid(), kind: 'rect', target: null, sound: null, needs: null, useUp: false, lockedMsg: DEFAULT_LOCKED_MSG, lockedSound: null,
  startsOff: false, changes: [], ...props,
});

export function newAdventure(title = 'My adventure') {
  const first = newCard('Start');
  return { id: uid(), title, startId: first.id, cards: [first], items: [], props: [], created: Date.now(), updated: Date.now(), backedUp: null, allowHints: true };
}

// Adventures saved by older test versions are missing newer fields; fill them in.
export function normalize(adv) {
  adv.items ||= [];
  adv.props ||= [];
  for (const it of adv.items) it.startsHidden ??= false;
  for (const c of adv.cards) {
    c.items ||= [];
    c.props ||= [];
    for (const b of c.buttons) {
      b.sound ??= null; b.needs ??= null; b.useUp ??= false; b.lockedMsg ??= DEFAULT_LOCKED_MSG; b.lockedSound ??= null;
      b.startsOff ??= false; b.changes ||= [];
    }
  }
  return adv;
}

export const cardById = (adv, id) => (id && adv.cards.find((c) => c.id === id)) || null;
export const itemById = (adv, id) => (id && adv.items.find((i) => i.id === id)) || null;
export const propById = (adv, id) => (id && adv.props.find((p) => p.id === id)) || null;
export const lookById = (prop, id) => (prop && id && prop.looks.find((l) => l.id === id)) || null;
export function buttonById(adv, id) {
  for (const card of adv.cards) { const b = card.buttons.find((x) => x.id === id); if (b) return { card, b }; }
  return null;
}

function nextName(list, word) {
  let n = list.length + 1;
  while (list.some((x) => x.name === `${word} ${n}`)) n++;
  return `${word} ${n}`;
}
export const nextCardName = (adv) => nextName(adv.cards, 'Card');
export const nextItemName = (adv) => nextName(adv.items, 'Item');
export const nextPropName = (adv) => nextName(adv.props, 'Prop');
export const nextLookName = (prop) => nextName(prop.looks, 'Look');

export function copyCard(card) {
  const copy = structuredClone(card);
  copy.id = uid();
  copy.name = `${card.name} (copy)`.slice(0, 60);
  for (const b of copy.buttons) b.id = uid();
  for (const p of [...copy.items, ...copy.props]) p.id = uid();
  return copy;
}

// A button that does something when clicked.
export const buttonDoesSomething = (adv, b) => !!(cardById(adv, b.target) || b.sound || b.changes.length);

// A short name for a button, used in the editor and when other buttons refer to it.
export function buttonName(adv, b) {
  const target = cardById(adv, b.target);
  if (target) return `→ ${target.name}`;
  if (b.sound) return `♪ ${soundName(b.sound)}`;
  return b.changes.length ? 'changes things' : 'goes nowhere yet';
}

// What a change refers to, or null if that thing has been deleted.
export function changeThing(adv, ch) {
  const [kind, id] = ch.what.split(':');
  if (kind === 'prop') return propById(adv, id) && { kind, thing: propById(adv, id) };
  if (kind === 'item') return itemById(adv, id) && { kind, thing: itemById(adv, id) };
  if (kind === 'button') { const f = buttonById(adv, id); return f && { kind, thing: f.b, card: f.card }; }
  return null;
}

// A change as a plain sentence: "“Car” switches to “Smashed”".
export function changeText(adv, ch) {
  const t = changeThing(adv, ch);
  if (!t) return null;
  if (t.kind === 'button') return `The button “${buttonName(adv, t.thing)}” on “${t.card.name}” turns ${ch.to === 'show' ? 'on' : 'off'}`;
  const name = `“${t.thing.name}”`;
  if (ch.to === 'show') return `${name} appears`;
  if (ch.to === 'hide') return `${name} disappears`;
  const look = lookById(t.thing, ch.to.slice(5));
  return look ? `${name} switches to “${look.name}”` : null;
}

// A card as it looks at the start of play (its picture plus visible props and items), for thumbnails.
export function cardPreview(adv, card) {
  const image = (src, p) => (src ? `<image href="${src}" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}"/>` : '');
  const props = card.props.map((p) => { const t = propById(adv, p.propId); return t && !t.startsHidden ? image(t.looks[0].image, p) : ''; }).join('');
  const items = card.items.map((p) => { const t = itemById(adv, p.itemId); return t && !t.startsHidden ? image(t.image, p) : ''; }).join('');
  return `<svg viewBox="0 0 ${CARD_W} ${CARD_H}" preserveAspectRatio="none" aria-hidden="true">${card.image ? `<image href="${card.image}" width="${CARD_W}" height="${CARD_H}"/>` : ''}${props}${items}</svg>`;
}

// The box around a button, for labels and for moving it.
export function bounds(b) {
  if (b.kind !== 'free') return { x: b.x, y: b.y, w: b.w, h: b.h };
  const xs = b.points.map((p) => p[0]), ys = b.points.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// A button as an SVG shape, shared by the editor and by play mode.
export function shapeSvg(b) {
  const r = (n) => Math.round(n * 10) / 10;
  if (b.kind === 'oval') return `<ellipse cx="${r(b.x + b.w / 2)}" cy="${r(b.y + b.h / 2)}" rx="${r(b.w / 2)}" ry="${r(b.h / 2)}"/>`;
  if (b.kind === 'free') return `<polygon points="${b.points.map((p) => `${r(p[0])},${r(p[1])}`).join(' ')}"/>`;
  return `<rect x="${r(b.x)}" y="${r(b.y)}" width="${r(b.w)}" height="${r(b.h)}" rx="6"/>`;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// A file someone opens could hold anything, so rebuild it from only the parts we expect.
export function cleanAdventure(data) {
  const a = data && data.adventure;
  if (!data || data.app !== 'cardyssey' || !a || !Array.isArray(a.cards) || !a.cards.length) throw new Error('not-cardyssey');
  const num = (n) => (Number.isFinite(n) ? Math.max(-CARD_W, Math.min(CARD_W * 2, n)) : 0);
  const id = (s) => (typeof s === 'string' && s ? s.slice(0, 40) : uid());
  const png = (s) => (typeof s === 'string' && s.startsWith('data:image/png;base64,') ? s : null);
  const sound = (s) => (typeof s === 'string' && /^[a-z]{1,20}$/.test(s) ? s : null);
  const list = (x, max) => (Array.isArray(x) ? x : []).slice(0, max).filter((v) => v && typeof v === 'object');

  const items = list(a.items, MAX_ITEMS).map((i) => ({ id: id(i.id), name: String(i.name || 'Untitled item').slice(0, 40), image: png(i.image), startsHidden: !!i.startsHidden }));
  const props = list(a.props, MAX_PROPS).map((p) => {
    const looks = list(p.looks, MAX_LOOKS).map((l) => ({ id: id(l.id), name: String(l.name || 'Look').slice(0, 30), image: png(l.image) }));
    return { id: id(p.id), name: String(p.name || 'Untitled prop').slice(0, 40), looks: looks.length ? looks : [newLook('Look 1')], startsHidden: !!p.startsHidden };
  });
  const itemIds = new Set(items.map((i) => i.id)), propIds = new Set(props.map((p) => p.id));
  const placed = (key, ids) => (p) => (ids.has(p[key]) ? { id: uid(), [key]: p[key], x: num(p.x), y: num(p.y), size: Math.max(20, Math.min(600, num(p.size) || 120)) } : null);
  const cleanButton = (b) => {
    if (!['rect', 'oval', 'free'].includes(b.kind)) return null;
    const out = newButton({
      id: id(b.id), kind: b.kind, x: num(b.x), y: num(b.y), w: num(b.w), h: num(b.h),
      target: typeof b.target === 'string' ? b.target : null,
      sound: sound(b.sound), lockedSound: sound(b.lockedSound),
      needs: itemIds.has(b.needs) ? b.needs : null,
      useUp: !!b.useUp,
      lockedMsg: typeof b.lockedMsg === 'string' ? b.lockedMsg.slice(0, 120) : DEFAULT_LOCKED_MSG,
      startsOff: !!b.startsOff,
      changes: list(b.changes, 30).map((ch) => ({ id: uid(), what: String(ch.what || '').slice(0, 60), to: String(ch.to || '').slice(0, 60) })),
    });
    if (b.kind === 'free') {
      if (!Array.isArray(b.points) || b.points.length < 3) return null;
      out.points = b.points.slice(0, 2000).map((p) => [num(p && p[0]), num(p && p[1])]);
    }
    return out;
  };
  const cards = list(a.cards, MAX_CARDS).map((c) => ({
    id: id(c.id),
    name: String(c.name || 'Untitled card').slice(0, 60),
    image: png(c.image),
    ending: !!c.ending,
    back: !!c.back,
    buttons: list(c.buttons, 100).map(cleanButton).filter(Boolean),
    items: list(c.items, 50).map(placed('itemId', itemIds)).filter(Boolean),
    props: list(c.props, 50).map(placed('propId', propIds)).filter(Boolean),
  }));
  const ids = new Set(cards.map((c) => c.id));
  const adv = {
    id: uid(),
    title: String(a.title || 'My adventure').slice(0, 80),
    startId: ids.has(a.startId) ? a.startId : cards[0].id,
    cards, items, props,
    created: Date.now(),
    updated: Date.now(),
    backedUp: null,
    allowHints: a.allowHints !== false,
  };
  // Drop links and changes that point at things that aren't in the file.
  for (const c of cards) {
    for (const b of c.buttons) {
      if (!ids.has(b.target)) b.target = null;
      b.changes = b.changes.filter((ch) => /^(show|hide|look:.+)$/.test(ch.to) && changeText(adv, ch));
    }
  }
  return adv;
}
