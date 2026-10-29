// The guided tour. It spotlights one part of the screen at a time and, on every step, uses that
// part for real, so by the end the person has a tiny adventure ("The Lost Treasure") to play.
//
// Each step's run(fast) does its piece of the building. Going Back rebuilds the adventure from
// scratch, quickly, up to the step before, so every step always starts from the same place.
import { newItem, newProp, newLook, newButton, uid } from './model.js?v=mvu71pwg';
import { stampImage } from './stamps.js?v=mvu71pwg';

// The next screen refresh, or a short pause if refreshes have stopped (a hidden tab or window).
const frame = () => new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 50); });
const wait = (ms, fast) => (fast ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

// Back-and-forth strokes that cover a band of the picture, the way you'd color in with a big brush.
function zigzag(x0, x1, y0, y1, step) {
  const pts = [];
  let right = true;
  for (let y = y0; y <= y1; y += step) {
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([right ? x0 + (x1 - x0) * t : x1 - (x1 - x0) * t, y + Math.sin(t * Math.PI * 2) * 5]); }
    right = !right;
  }
  return pts;
}

export function createTour(api) {
  const { painter: p, $ } = api;
  const root = document.createElement('div');
  root.className = 'tour';
  root.hidden = true;
  root.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle"></div>';
  document.body.append(root);
  const spot = root.querySelector('.tour-spot'), card = root.querySelector('.tour-card');
  let at = 0, busy = false, T = {}, mover = 0;

  // ---------- Painting the way a person would ----------

  async function brush(pts, fast) {
    const w = p.wctx;
    w.clearRect(0, 0, p.W, p.H);
    p.wet.style.opacity = 1;
    w.strokeStyle = w.fillStyle = p.color; w.lineWidth = p.size; w.lineCap = w.lineJoin = 'round';
    let last = pts[0], mid0 = pts[0];
    w.beginPath(); w.arc(last[0], last[1], p.size / 2, 0, Math.PI * 2); w.fill();
    for (let i = 1; i < pts.length; i++) {
      const q = pts[i], mid = [(last[0] + q[0]) / 2, (last[1] + q[1]) / 2];
      w.beginPath(); w.moveTo(mid0[0], mid0[1]); w.quadraticCurveTo(last[0], last[1], mid[0], mid[1]); w.stroke();
      last = q; mid0 = mid;
      if (!fast && i % 3 === 0) await frame();
    }
    w.beginPath(); w.moveTo(mid0[0], mid0[1]); w.lineTo(last[0], last[1]); w.stroke();
    p.press(1);
  }
  async function stamp(id, x, y, fast) {
    api.setStamp(id);
    const img = stampImage(id);
    if (!img.complete) await img.decode();
    p.wctx.clearRect(0, 0, p.W, p.H);
    p.drawStamp({ x, y });
    p.press(1);
    await wait(250, fast);
  }
  async function words(text, x, y, fast) {
    const w = p.wctx, size = p.textSize();
    w.font = `500 ${size}px Lexend, "Segoe UI", sans-serif`; w.textBaseline = 'top'; w.fillStyle = p.color;
    p.wet.style.opacity = 1;
    for (let k = fast ? text.length : 1; k <= text.length; k++) {
      w.clearRect(0, 0, p.W, p.H); w.fillText(text.slice(0, k), x, y);
      if (!fast) await wait(45);
    }
    p.press(1);
  }
  async function typeInto(el, text, fast) {
    for (let k = fast ? text.length : 1; k <= text.length; k++) {
      el.value = text.slice(0, k);
      el.dispatchEvent(new Event('input'));
      if (!fast) await wait(55);
    }
  }
  async function open(kind, id, look) {
    if (kind === 'card') api.openCard(id);
    if (kind === 'item') api.openItem(id);
    if (kind === 'prop') api.openProp(id, look);
    await p.ready;
  }

  // ---------- The steps ----------

  const tools = (t) => `.tool[data-tool="${t}"]`;
  const STEPS = [
    {
      title: 'Welcome to Cardyssey!',
      text: "Let's build a tiny adventure together. On each step, watch what happens, then press Next. You can stop any time with Skip.",
      run: async () => {},
    },
    {
      el: ['#advTitle'], title: 'Name your adventure',
      text: 'Every adventure has a name. You can change it any time.',
      run: (fast) => typeInto($('advTitle'), 'The Lost Treasure', fast),
    },
    {
      el: ['#cardName', '#cardList'], title: 'Cards',
      text: 'Each picture in an adventure is a card. Name each one so it’s easy to find in the list.',
      run: async (fast) => { T.beach = api.adv().startId; await typeInto($('cardName'), 'Beach', fast); },
    },
    {
      el: [tools('fill'), '#palette'], title: 'Fill',
      text: 'Pick a color, then click with Fill to pour paint into a space. Here comes a blue sky.',
      run: async (fast) => { api.setMode('paint'); api.setTool('fill'); api.setColor('#7cc6f2'); await wait(500, fast); p.fill({ x: 480, y: 200 }); },
    },
    {
      el: [tools('brush'), '#sizes'], title: 'Brush',
      text: 'The Brush paints wherever you drag. Bigger sizes cover more. Now the sea, then the sand.',
      run: async (fast) => {
        api.setTool('brush'); api.setSize(30); api.setColor('#1f5fbf');
        await brush(zigzag(0, 960, 395, 445, 20), fast);
        api.setColor('#e8b48c');
        await brush(zigzag(0, 960, 465, 610, 22), fast);
      },
    },
    {
      el: ['.undo-row'], title: 'Undo',
      text: 'Oops, a scribble! Undo takes back the last thing you did, and Redo puts it back.',
      run: async (fast) => {
        if (fast) return; // nothing to keep from this step
        api.setSize(12); api.setColor('#c0392b');
        await brush([[300, 120], [380, 60], [420, 160], [500, 70], [560, 170], [640, 90]], false);
        await wait(700);
        p.undo();
      },
    },
    {
      el: [tools('stamp'), '#stampPicker'], title: 'Stamps',
      text: 'Stamps are ready-made pictures. Pick one, then click to stamp it. Size changes how big it is.',
      run: async (fast) => {
        api.setTool('stamp');
        api.setSize(12); await stamp('sun', 860, 100, fast);
        api.setSize(30); await stamp('tree', 150, 330, fast);
        api.setSize(4); await stamp('arrow', 880, 525, fast);
      },
    },
    {
      el: [tools('text')], title: 'Text',
      text: 'Click with Text to type words onto your card.',
      run: async (fast) => { api.setTool('text'); api.setColor('#1b2a6b'); api.setSize(18); await words('Find the treasure!', 40, 30, fast); },
    },
    {
      el: ['#addCard', '#cardList'], title: 'More cards',
      text: 'Each place in your story gets its own card. Here’s a second one: a dark cave.',
      run: async (fast) => {
        const c = api.addCard('Cave', T.beach);
        T.cave = c.id;
        c.back = true; // players can go back to the beach
        await open('card', c.id);
        api.setTool('fill'); api.setColor('#1b2a6b'); p.fill({ x: 480, y: 300 });
        api.setTool('brush'); api.setSize(30); api.setColor('#5a5a5a');
        await brush(zigzag(0, 960, 490, 610, 22), fast);
        api.setTool('stamp'); api.setSize(30);
        await stamp('rock', 110, 470, fast); await stamp('rock', 850, 480, fast);
        api.setTool('text'); api.setColor('#ffffff'); api.setSize(18); await words('A dark cave', 40, 30, fast);
        api.renderEditor();
      },
    },
    {
      el: ['#addItem', '#stage'], title: 'Items',
      text: 'Items are things players pick up and carry. You draw them on see-through paper. This one is a gold key.',
      run: async (fast) => {
        const it = newItem('Gold key');
        api.adv().items.push(it);
        T.key = it.id;
        api.changed();
        await open('item', it.id);
        api.setTool('stamp'); api.setSize(30); await stamp('key', 150, 150, fast);
      },
    },
    {
      el: ['#addProp', '#looksBar'], title: 'Props',
      text: 'Props sit on a card and can change during the story. This chest has two looks: shut, and open with treasure shining out.',
      run: async (fast) => {
        const pr = newProp('Chest');
        pr.looks[0].name = 'Shut';
        api.adv().props.push(pr);
        T.chest = pr.id;
        api.changed();
        await open('prop', pr.id);
        api.setTool('stamp'); api.setSize(30); await stamp('chest', 150, 165, fast);
        api.flushImage();
        const look = newLook('Open', pr.looks[0].image); // "Another look" starts as a copy
        pr.looks.push(look);
        T.open = look.id;
        api.changed();
        await open('prop', pr.id, look.id);
        await wait(300, fast);
        api.setTool('brush'); api.setSize(10); api.setColor('#f6d32d');
        await brush([[80, 98], [110, 88], [140, 96], [170, 86], [200, 95], [222, 90]], fast); // gold heaped in the open lid
        api.setTool('stamp'); api.setSize(1);
        await stamp('star', 70, 55, fast); await stamp('star', 232, 50, fast); await stamp('star', 150, 38, fast);
      },
    },
    {
      el: ['.mode-switch', '#stage'], title: 'Place', corner: 'top-right',
      text: 'Place puts items and props onto a card. The key goes on the beach, and the chest goes in the cave.',
      run: async (fast) => {
        await open('card', T.beach);
        api.setMode('place');
        api.place('item', T.key, 420, 480, 100);
        await wait(900, fast);
        await open('card', T.cave);
        api.setMode('place');
        api.place('prop', T.chest, 360, 230, 240);
      },
    },
    {
      el: ['.mode-switch', '#stage', '#btnInfo'], title: 'Buttons', corner: 'bottom-left',
      text: 'Buttons are invisible spots that players click. This one, on the arrow, takes players to the cave.',
      run: async (fast) => {
        await open('card', T.beach);
        api.setMode('buttons');
        const b = newButton({ x: 800, y: 470, w: 1, h: 1, target: T.cave, sound: 'footsteps' });
        api.current().buttons.push(b);
        for (let k = 1; k <= (fast ? 1 : 20); k++) { const t = fast ? 1 : k / 20; b.w = 150 * t; b.h = 125 * t; api.renderButtons(); if (!fast) await frame(); }
        api.selectButton(b.id);
        api.changed();
      },
    },
    {
      el: ['#stage', '#btnInfo'], title: 'Locks and changes', corner: 'bottom-left', show: '#btnInfo .fold[data-fold="changes"]',
      text: 'On the chest: a button that only works if you have the gold key. When it opens, the chest switches to its open look, and a new button appears that leads to the treasure.',
      run: async (fast) => {
        await open('card', T.cave);
        const end = api.addCard('Treasure!', T.cave);
        end.ending = true;
        await open('card', end.id);
        api.setTool('fill'); api.setColor('#f6d32d'); p.fill({ x: 480, y: 300 });
        api.setTool('stamp');
        api.setSize(30); await stamp('chest', 480, 330, fast);
        api.setSize(4);
        for (const [x, y] of [[300, 220], [660, 220], [380, 120], [580, 120], [480, 470]]) await stamp('star', x, y, fast);
        api.setTool('text'); api.setColor('#c0392b'); api.setSize(18); await words('You found the treasure!', 220, 30, fast);
        await open('card', T.cave);
        api.setMode('buttons');
        const take = newButton({ x: 410, y: 280, w: 140, h: 140, target: end.id, sound: 'fanfare', startsOff: true });
        const lock = newButton({
          x: 370, y: 240, w: 220, h: 220, needs: T.key, useUp: true, sound: 'unlock', lockedSound: 'locked',
          lockedMsg: "It's locked. Maybe the key is on the beach?",
          changes: [{ id: uid(), what: `prop:${T.chest}`, to: `look:${T.open}` }, { id: uid(), what: `button:${take.id}`, to: 'show' }],
        });
        api.current().buttons.push(lock, take);
        api.selectButton(lock.id);
        api.changed();
      },
    },
    {
      el: ['#mapCanvas'], title: 'The Map',
      text: 'The Map shows every card and how they connect. If something is missing, like a card nobody can reach, it tells you here.',
      run: () => api.show('map'),
    },
    {
      el: ['#player'], title: 'Now play it!', corner: 'top-right',
      text: 'Find the key on the beach, then open the chest in the cave. This adventure is yours now: change anything, or start your own. Have fun!',
      run: () => api.show('play'),
    },
  ];

  // ---------- The spotlight and the card ----------

  function place() {
    const step = STEPS[at];
    const els = (step.el || []).map((s) => document.querySelector(s)).filter((el) => el && el.offsetParent !== null);
    const vw = innerWidth, vh = innerHeight, cw = Math.min(380, vw - 32);
    card.style.width = `${cw}px`;
    const ch = card.offsetHeight;
    root.classList.toggle('no-spot', !els.length);
    if (!els.length) {
      spot.hidden = true;
      Object.assign(card.style, { left: `${(vw - cw) / 2}px`, top: `${Math.max(16, (vh - ch) / 2)}px` });
      return;
    }
    const rs = els.map((el) => el.getBoundingClientRect());
    const r = { left: Math.min(...rs.map((x) => x.left)) - 6, top: Math.min(...rs.map((x) => x.top)) - 6, right: Math.max(...rs.map((x) => x.right)) + 6, bottom: Math.max(...rs.map((x) => x.bottom)) + 6 };
    spot.hidden = false;
    Object.assign(spot.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
    const clampX = (x) => Math.max(16, Math.min(vw - cw - 16, x)), clampY = (y) => Math.max(16, Math.min(vh - ch - 16, y));
    let left, top;
    if (r.bottom + 14 + ch <= vh - 8) { left = clampX((r.left + r.right) / 2 - cw / 2); top = r.bottom + 14; }
    else if (r.top - 14 - ch >= 8) { left = clampX((r.left + r.right) / 2 - cw / 2); top = r.top - 14 - ch; }
    else if (r.left - 14 - cw >= 8) { left = r.left - 14 - cw; top = clampY(r.top); }
    else if (r.right + 14 + cw <= vw - 8) { left = r.right + 14; top = clampY(r.top); }
    else { left = vw - cw - 16; top = vh - ch - 16; } // the highlight fills the screen: tuck the card into a corner
    // Some steps say which corner, so the card never covers the thing being made.
    if (step.corner) { left = step.corner.includes('left') ? 16 : vw - cw - 16; top = step.corner.includes('top') ? 16 : vh - ch - 16; }
    Object.assign(card.style, { left: `${left}px`, top: `${top}px` });
  }

  function draw() {
    const step = STEPS[at], last = at === STEPS.length - 1;
    card.innerHTML = `<p class="tour-count small">Step ${at + 1} of ${STEPS.length}</p>
      <h2 id="tourTitle" class="heading-3">${step.title}</h2><p>${step.text}</p>
      <p class="tour-actions"><button class="btn quiet small-btn" data-tour="skip">${last ? 'Close' : 'Skip tour'}</button><span class="spacer"></span>
      ${at ? `<button class="btn small-btn" data-tour="back"${busy ? ' disabled' : ''}>Back</button>` : ''}
      <button class="btn primary" data-tour="next"${busy ? ' disabled' : ''}>${busy ? 'Watch…' : last ? 'Finish' : 'Next'}</button></p>`;
    place();
  }

  // Show step n: do its building (animated), with the spotlight following along.
  async function go(n, rebuild) {
    busy = true;
    at = n;
    if (rebuild) {
      draw();
      await api.reset();
      T = {};
      for (let k = 0; k < n; k++) await STEPS[k].run(true);
    }
    const job = STEPS[n].run(false);
    await frame();
    draw();
    for (const s of STEPS[n].el || []) document.querySelector(s)?.scrollIntoView({ block: 'nearest' });
    clearInterval(mover);
    mover = setInterval(place, 250); // things move while the step works; keep the spotlight on them
    try { await job; } finally {
      clearInterval(mover);
      busy = false;
      if (STEPS[n].show) document.querySelector(STEPS[n].show)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      draw();
      card.querySelector('[data-tour="next"]').focus();
    }
  }

  function end(message) {
    root.hidden = true;
    clearInterval(mover);
    api.ended(message);
  }

  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b || (busy && b.dataset.tour !== 'skip')) return;
    if (b.dataset.tour === 'skip') end(at === STEPS.length - 1 ? 'finished' : 'skipped');
    if (b.dataset.tour === 'back') go(at - 1, true);
    if (b.dataset.tour === 'next') { if (at === STEPS.length - 1) end('finished'); else go(at + 1); }
  });
  addEventListener('resize', () => { if (!root.hidden) place(); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') end('skipped'); });

  return {
    get active() { return !root.hidden; },
    start() { root.hidden = false; T = {}; go(0); },
  };
}
