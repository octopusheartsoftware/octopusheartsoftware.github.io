// The map: every card as a thumbnail, laid out in columns by how many clicks it is from the
// start card, with arrows for each button. Also finds things worth checking (lost cards,
// buttons that go nowhere, dead ends).
import { cardById, itemById, buttonDoesSomething, cardPreview, esc } from './model.js?v=mvwumd51';
import { icon } from './icons.js?v=mvwumd51';

const COL_W = 250, ROW_H = 170, NODE_W = 176, THUMB_H = 110, PAD = 32;

// How many clicks each card is from the start. Cards missing from the result can't be reached.
export function reach(adv) {
  const depth = new Map([[adv.startId, 0]]);
  const queue = [adv.startId];
  while (queue.length) {
    const id = queue.shift(), card = cardById(adv, id);
    for (const b of card ? card.buttons : []) {
      if (cardById(adv, b.target) && !depth.has(b.target)) { depth.set(b.target, depth.get(id) + 1); queue.push(b.target); }
    }
  }
  return depth;
}

export function findProblems(adv) {
  const depth = reach(adv), out = [];
  const placed = new Set(adv.cards.flatMap((c) => [...c.items.map((p) => `item:${p.itemId}`), ...c.props.map((p) => `prop:${p.propId}`)]));
  const turnedOn = new Set(adv.cards.flatMap((c) => c.buttons.flatMap((b) => b.changes.filter((ch) => ch.to === 'show').map((ch) => ch.what))));
  const things = [...adv.items.map((t) => ['item', t]), ...adv.props.map((t) => ['prop', t])];
  for (const [kind, t] of things) {
    const key = `${kind}:${t.id}`;
    if (!placed.has(key)) out.push({ kind, id: t.id, text: `The ${kind} “${t.name}” isn't on any card yet${kind === 'item' ? ", so players can't find it" : ''}.` });
    else if (t.startsHidden && !turnedOn.has(key)) out.push({ kind, id: t.id, text: `“${t.name}” is hidden at the start, and no button makes it appear.` });
  }
  for (const c of adv.cards) {
    const name = `“${c.name}”`;
    const linked = c.buttons.filter((b) => cardById(adv, b.target)).length;
    const loose = c.buttons.filter((b) => !buttonDoesSomething(adv, b)).length;
    for (const b of c.buttons) {
      const it = itemById(adv, b.needs);
      if (it && !placed.has(`item:${it.id}`)) out.push({ id: c.id, text: `${name} has a button that needs “${it.name}”, but that item isn't on any card.` });
      if (b.startsOff && !turnedOn.has(`button:${b.id}`)) out.push({ id: c.id, text: `${name} has a button that's off at the start, and no button turns it on.` });
    }
    if (!depth.has(c.id)) out.push({ id: c.id, text: `Players can't reach ${name} yet. No path of buttons from the start card leads there.` });
    if (loose) out.push({ id: c.id, text: `${name} has ${loose === 1 ? 'a button' : `${loose} buttons`} that ${loose === 1 ? "doesn't" : "don't"} go anywhere yet.` });
    if (!linked && !c.back && !c.ending) out.push({ id: c.id, text: `${name} is a dead end. Add a button or a Back button, or mark it as an ending.` });
  }
  return out;
}

export function renderMap(el, adv, onOpen) {
  const depth = reach(adv);
  const cols = [];
  for (const c of adv.cards) {
    const col = depth.has(c.id) ? depth.get(c.id) : -1;
    (cols[col] ||= []).push(c);
  }
  // Cards nobody can reach yet go in a column of their own at the end.
  const lost = cols[-1] || [];
  const placed = cols.filter(Boolean);
  if (lost.length) placed.push(lost);
  const pos = new Map();
  placed.forEach((list, ci) => list.forEach((c, ri) => pos.set(c.id, { x: PAD + ci * COL_W, y: PAD + 28 + ri * ROW_H })));
  const width = PAD * 2 + placed.length * COL_W, height = PAD * 2 + 28 + Math.max(...placed.map((l) => l.length)) * ROW_H;

  let arrows = '';
  for (const c of adv.cards) {
    const a = pos.get(c.id);
    for (const t of new Set(c.buttons.map((b) => b.target))) {
      const b = pos.get(t);
      if (!b || t === c.id) continue;
      if (b.x > a.x) {
        const x1 = a.x + NODE_W, y1 = a.y + THUMB_H / 2, x2 = b.x - 6, y2 = b.y + THUMB_H / 2;
        arrows += `<path d="M${x1} ${y1} C${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}"/>`;
      } else {
        // Going back to an earlier card: loop underneath so the arrow doesn't cross the thumbnails.
        const x1 = a.x + NODE_W / 2 + 12, y1 = a.y + THUMB_H + 30, x2 = b.x + NODE_W / 2 - 12, y2 = b.y + THUMB_H + 36;
        arrows += `<path class="loop" d="M${x1} ${y1} C${x1} ${y1 + 40}, ${x2} ${y2 + 40}, ${x2} ${y2}"/>`;
      }
    }
  }

  const headings = placed.map((list, ci) => {
    const label = list === lost ? "Can't reach yet" : ci === 0 ? 'Start' : `${ci} ${ci === 1 ? 'click' : 'clicks'} in`;
    return `<div class="map-col-label label${list === lost ? ' lost' : ''}" style="left:${PAD + ci * COL_W}px;top:${PAD - 4}px">${label}</div>`;
  }).join('');

  const nodes = adv.cards.map((c) => {
    const p = pos.get(c.id);
    const tags = [c.id === adv.startId ? `<span class="tag start">${icon('star')}Start</span>` : '', c.ending ? `<span class="tag end">${icon('flag')}Ending</span>` : '', c.back ? `<span class="tag">${icon('back')}Back</span>` : '',
      c.items.length ? `<span class="tag">${icon('key')}${c.items.length === 1 ? '1 item' : `${c.items.length} items`}</span>` : '',
      c.props.length ? `<span class="tag">${icon('prop')}${c.props.length === 1 ? '1 prop' : `${c.props.length} props`}</span>` : '',
      c.buttons.some((b) => b.changes.length) ? `<span class="tag">${icon('change')}Changes</span>` : '',
      c.buttons.some((b) => itemById(adv, b.needs)) ? `<span class="tag">${icon('lock')}Locked</span>` : ''].join('');
    return `<button class="map-node" data-card="${c.id}" style="left:${p.x}px;top:${p.y}px;width:${NODE_W}px">
      <span class="thumb">${cardPreview(adv, c)}</span>
      <span class="map-name">${esc(c.name)}</span><span class="tags">${tags}</span></button>`;
  }).join('');

  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.innerHTML = `<svg class="map-arrows" width="${width}" height="${height}" aria-hidden="true">
      <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z"/></marker></defs>
      ${arrows}</svg>${headings}${nodes}`;
  el.onclick = (e) => { const n = e.target.closest('[data-card]'); if (n) onOpen(n.dataset.card); };
}
