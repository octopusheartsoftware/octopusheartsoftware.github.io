// Play mode: shows one card at a time. Invisible buttons take you to other cards, play sounds,
// and can change things; items can be picked up and open locked buttons.
//
// What the game remembers while you play:
// - your items, and which items you've ever picked up (a picked-up item vanishes from every card)
// - which locked buttons you've opened (they stay open, even if the item was used up)
// - changes buttons have made: things shown or hidden, and which look each prop has
import { CARD_W, CARD_H, cardById, itemById, propById, lookById, shapeSvg, esc } from './model.js?v=mvu71pwg';
import { playSound } from './sounds.js?v=mvu71pwg';
import { icon } from './icons.js?v=mvu71pwg';

const HISTORY_LIMIT = 300;
const calm = matchMedia('(prefers-reduced-motion: reduce)');

let blank = null;
function blankCard() {
  if (!blank) {
    const c = document.createElement('canvas');
    c.width = CARD_W; c.height = CARD_H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CARD_W, CARD_H);
    blank = c.toDataURL();
  }
  return blank;
}

export function createPlayer(root) {
  root.innerHTML = `
    <div class="play-card">
      <img class="play-img" alt="">
      <svg class="play-btns" viewBox="0 0 ${CARD_W} ${CARD_H}"></svg>
      <div class="play-toast" role="status" hidden></div>
    </div>
    <div class="play-under">
      <button class="btn play-back" hidden>${icon('back')}Back</button>
      <div class="inventory" hidden><span class="label">Your items</span><ul class="inv-list"></ul></div>
      <div class="the-end" hidden><span class="the-end-word">The End</span><button class="btn primary play-again">${icon('restart')}Play again</button></div>
    </div>`;
  const img = root.querySelector('.play-img'), svg = root.querySelector('.play-btns');
  const back = root.querySelector('.play-back'), end = root.querySelector('.the-end'), toast = root.querySelector('.play-toast');
  const inv = root.querySelector('.inventory'), invList = root.querySelector('.inv-list');
  let adv = null, cur = null, history = [], toastTimer = 0, sound = true;
  let carrying = [], gotten = new Set(), unlocked = new Set(), shown = new Map(), looks = new Map();

  // Is this prop, item or button showing right now? ('prop:<id>', 'item:<id>', 'button:<id>')
  function visible(key, startsVisible) { return shown.has(key) ? shown.get(key) : startsVisible; }
  const propLook = (prop) => lookById(prop, looks.get(prop.id)) || prop.looks[0];

  function show(id, fade = true) {
    const card = cardById(adv, id);
    if (!card) return;
    cur = id;
    img.src = card.image || blankCard();
    img.alt = card.name;
    // Props are scenery, under the buttons. Items sit on top, so a key lying in a doorway can still be picked up.
    const props = card.props.map((p) => {
      const prop = propById(adv, p.propId);
      if (!prop || !visible(`prop:${prop.id}`, !prop.startsHidden)) return '';
      const look = propLook(prop);
      return look.image ? `<image class="prop" href="${look.image}" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}"/>` : '';
    }).join('');
    const buttons = card.buttons.map((b, i) => (visible(`button:${b.id}`, !b.startsOff) ? `<g class="hit" data-i="${i}">${shapeSvg(b)}</g>` : '')).join('');
    const items = card.items.map((p) => {
      const it = itemById(adv, p.itemId);
      if (!it || gotten.has(it.id) || !visible(`item:${it.id}`, !it.startsHidden)) return '';
      return `<g class="pickup" data-item="${it.id}"><title>${esc(it.name)}</title><image href="${it.image || ''}" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}"/><rect class="pickup-hint" x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}" rx="8"/></g>`;
    }).join('');
    svg.innerHTML = props + buttons + items;
    back.hidden = !(card.back && history.length);
    end.hidden = !card.ending;
    toast.hidden = true;
    renderInventory();
    if (fade && !calm.matches) img.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }

  function renderInventory() {
    inv.hidden = !adv.items.length;
    invList.innerHTML = carrying.length
      ? carrying.map((id) => { const it = itemById(adv, id); return it ? `<li title="${esc(it.name)}"><span class="inv-thumb">${it.image ? `<img src="${it.image}" alt="">` : ''}</span><span>${esc(it.name)}</span></li>` : ''; }).join('')
      : '<li class="muted small">Nothing yet</li>';
  }

  function say(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  const sfx = (id) => { if (sound && id) playSound(id); };

  function applyChanges(b) {
    for (const ch of b.changes) {
      if (ch.to.startsWith('look:')) looks.set(ch.what.slice(5), ch.to.slice(5));
      else shown.set(ch.what, ch.to === 'show');
    }
  }

  svg.addEventListener('click', (e) => {
    const pick = e.target.closest('.pickup');
    if (pick) {
      const it = itemById(adv, pick.dataset.item);
      gotten.add(it.id);
      carrying.push(it.id);
      sfx('chime');
      show(cur, false);
      say(`You picked up: ${it.name}`);
      return;
    }
    const g = e.target.closest('.hit');
    if (!g) return;
    const b = cardById(adv, cur).buttons[+g.dataset.i];
    if (b.needs && itemById(adv, b.needs) && !unlocked.has(b.id)) {
      if (!carrying.includes(b.needs)) {
        sfx(b.lockedSound);
        if (b.lockedMsg && b.lockedMsg.trim()) say(b.lockedMsg);
        return;
      }
      unlocked.add(b.id);
      if (b.useUp) carrying = carrying.filter((x) => x !== b.needs);
    }
    sfx(b.sound);
    applyChanges(b);
    if (!cardById(adv, b.target)) {
      show(cur, false); // something on this card may have changed
      if (!b.sound && !b.changes.length) say("This button doesn't go anywhere yet.");
      return;
    }
    history.push(cur);
    if (history.length > HISTORY_LIMIT) history.shift();
    show(b.target);
  });
  back.addEventListener('click', () => { if (history.length) show(history.pop()); });
  root.querySelector('.play-again').addEventListener('click', () => player.start(adv));

  const player = {
    start(a, fromId) {
      adv = a;
      history = [];
      carrying = []; gotten = new Set(); unlocked = new Set(); shown = new Map(); looks = new Map();
      show(cardById(adv, fromId) ? fromId : adv.startId);
    },
    showButtons(on) { root.classList.toggle('reveal', on); },
    setSound(on) { sound = on; },
  };
  return player;
}
