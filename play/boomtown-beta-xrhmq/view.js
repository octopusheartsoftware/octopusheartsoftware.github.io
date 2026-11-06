// Boomtown screen: drawing your city, the panels, and dragging things toward players.
(function () {
  const BT = globalThis.BT;
  const C = BT.CONFIG;
  const RES = C.resources;
  const $ = (s) => document.querySelector(s);
  const TILT = 0.6;

  // The game world's own palette (menus use the brand kit).
  const PAL = {
    sea: '#1c2b22', grass: '#5f8f4a', grass2: '#6d9c55', road: '#55595c', roadLine: '#c9c3a5', plaza: '#a49d88',
    wall: '#d9cdb0', wallDark: '#b7a98a', roof: '#c4643f', glass: '#30485a', glassLit: '#ffd88a',
    skin: '#f1c9a0', rubble: '#7d7466', smoke: 'rgba(80,80,80,.55)', shadow: 'rgba(0,0,0,.25)',
  };
  const RCOL = { food: '#7cc24f', steel: '#9fb0c4', fuel: '#ef8f2f', chips: '#56c8e0' };
  BT.RCOL = RCOL;

  let g = null, brains = [], me = null;
  let speed = 1, paused = true, turnMode = false, viewAngle = 0, compass0 = null;
  let mode = null;       // { kind: 'place', item } | { kind: 'build', item } | { kind: 'send', item }
  let lastTime = 0, acc = 0, uiTimer = 0;
  const canvas = $('#map'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, view = { cx: 0, cy: 0, S: 2, rect: null };

  // ---------- setup ----------
  function seg(id, cb) {
    const el = $(id);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
    return (v) => el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === String(v)));
  }
  let players = 4;
  seg('#seg-players', (v) => (players = +v));
  const setTurn1 = seg('#seg-turn', (v) => setTurnMode(v === 'turn'));
  const setTurn2 = seg('#seg-turn2', (v) => setTurnMode(v === 'turn'));
  seg('#seg-speed', (v) => (speed = +v));
  const urlSpeed = +new URLSearchParams(location.search).get('speed'); if (urlSpeed) speed = urlSpeed;

  function setTurnMode(on) {
    turnMode = on; setTurn1(on ? 'turn' : 'still'); setTurn2(on ? 'turn' : 'still');
    document.body.classList.toggle('turning', on);
    if (!on) viewAngle = 0;
    if (on) startCompass();
  }

  function startCompass() {
    compass0 = null;
    const listen = () => {
      const h = (e) => {
        let heading = null;
        if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
        else if (e.absolute && typeof e.alpha === 'number') heading = 360 - e.alpha;
        if (heading == null || !turnMode) return;
        if (compass0 == null) compass0 = heading;
        viewAngle = ((heading - compass0) * Math.PI) / 180;
      };
      window.addEventListener('deviceorientationabsolute', h);
      window.addEventListener('deviceorientation', h);
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') listen(); else toast('No compass permission, so use the turn buttons instead.'); }).catch(() => {});
    } else listen();
  }

  $('#btn-start').onclick = () => newGame();
  $('#btn-again').onclick = () => { $('#end').hidden = true; $('#start').hidden = false; };
  $('#btn-options').onclick = () => { paused = true; $('#options').hidden = false; };
  $('#btn-resume').onclick = () => { $('#options').hidden = true; paused = false; };
  $('#btn-quit').onclick = () => { $('#options').hidden = true; $('#start').hidden = false; };
  const feedback = () => {
    const where = g && !g.over ? `${players} players, ${Math.floor(g.timeLeft / 60)}:${String(Math.floor(g.timeLeft % 60)).padStart(2, '0')} left, view ${turnMode ? 'turns' : 'still'}` : 'start screen';
    OHFeedback.open({ app: 'Boomtown', version: '0.1', where });
  };
  $('#btn-feedback').onclick = feedback;
  $('#btn-feedback2').onclick = feedback;
  $('#btn-turn-l').onclick = () => (viewAngle -= Math.PI / 12);
  $('#btn-turn-r').onclick = () => (viewAngle += Math.PI / 12);
  window.addEventListener('keydown', (e) => {
    if (!turnMode) return;
    if (e.key === 'q' || e.key === 'Q') viewAngle -= Math.PI / 12;
    if (e.key === 'e' || e.key === 'E') viewAngle += Math.PI / 12;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over && $('#start').hidden) { paused = true; $('#options').hidden = false; } });

  function newGame() {
    g = new BT.Game({ players, humanName: 'You' });
    me = g.players[0];
    brains = g.players.filter((p) => !p.isHuman).map((p) => new BT.Brain(g, p));
    g.decor = makeDecor(me);
    mode = null; setHint(null); closePopover();
    $('#start').hidden = true; $('#end').hidden = true;
    buildPanels(); buildBadges(); resize();
    paused = false; acc = 0;
    toast(`You're rich in ${C.resourceNames[me.rich[0]]} and ${C.resourceNames[me.rich[1]]}. Trade for the rest!`, 'good', 5);
  }

  // ---------- panels ----------
  const ICONS = {
    truck: '<svg viewBox="0 0 28 28"><rect x="2" y="9" width="14" height="10" rx="1" fill="#e0a83a"/><path d="M16 12h6l4 4v3H16z" fill="#2f7fd8"/><circle cx="7" cy="21" r="3" fill="#222"/><circle cx="21" cy="21" r="3" fill="#222"/></svg>',
    ag: '<svg viewBox="0 0 28 28"><path d="M5 22l3-8h12l3 8z" fill="#8a949c"/><rect x="9" y="9" width="10" height="7" rx="2" fill="#5d666e"/><rect x="17" y="10.5" width="9" height="3" fill="#3a4148"/></svg>',
    aa: '<svg viewBox="0 0 28 28"><path d="M5 23l3-7h12l3 7z" fill="#8a949c"/><rect x="10" y="12" width="8" height="5" rx="2" fill="#5d666e"/><path d="M12 13l5-10M15 13l5-10" stroke="#3a4148" stroke-width="2.5"/></svg>',
    inf: '<svg viewBox="0 0 28 28"><circle cx="14" cy="6" r="3.5" fill="#f1c9a0"/><path d="M10 4a4 3 0 0 1 8 0z" fill="#3d5a2a"/><rect x="10" y="10" width="8" height="9" rx="2" fill="#2f7fd8"/><path d="M11 19l-1 6M17 19l1 6" stroke="#333" stroke-width="2.5"/><path d="M18 12l6-2" stroke="#333" stroke-width="2"/></svg>',
    tank: '<svg viewBox="0 0 28 28"><rect x="3" y="14" width="22" height="8" rx="4" fill="#3a4148"/><rect x="5" y="10" width="18" height="7" rx="2" fill="#2f7fd8"/><circle cx="14" cy="11" r="4" fill="#25609f"/><rect x="14" y="9.5" width="12" height="3" fill="#3a4148"/></svg>',
    bomb: '<svg viewBox="0 0 28 28"><path d="M14 3c1.5 0 2 2 2 4v5l9 4v3l-9-2v5l3 2v2l-5-1-5 1v-2l3-2v-5l-9 2v-3l9-4V7c0-2 .5-4 2-4z" fill="#2f7fd8"/></svg>',
    housing: '<svg viewBox="0 0 28 28"><rect x="6" y="6" width="16" height="19" fill="#d9cdb0"/><rect x="6" y="4" width="16" height="3" fill="#c4643f"/><g fill="#30485a"><rect x="9" y="9" width="3" height="3"/><rect x="16" y="9" width="3" height="3"/><rect x="9" y="15" width="3" height="3"/><rect x="16" y="15" width="3" height="3"/></g><rect x="12" y="20" width="4" height="5" fill="#6b4a2a"/></svg>',
    workshop: '<svg viewBox="0 0 28 28"><path d="M3 24V12l6 4v-4l6 4v-4l6 4V6h4v18z" fill="#b08d57"/><circle cx="12" cy="20" r="3" fill="none" stroke="#5d4a2a" stroke-width="2"/></svg>',
    depot: '<svg viewBox="0 0 28 28"><path d="M3 24V11l11-6 11 6v13z" fill="#7d8f9e"/><rect x="7" y="14" width="14" height="10" fill="#4a5864"/><path d="M7 17h14M7 20h14" stroke="#7d8f9e"/></svg>',
    barracks: '<svg viewBox="0 0 28 28"><rect x="3" y="12" width="22" height="12" fill="#6e7a4c"/><rect x="3" y="10" width="22" height="3" fill="#525c38"/><path d="M14 10V2" stroke="#333" stroke-width="1.5"/><path d="M14 2h8l-2 2.5 2 2.5h-8z" fill="#2f7fd8"/></svg>',
    up: '<svg viewBox="0 0 28 28"><path d="M14 3l9 10h-5v11h-8V13H5z" fill="#ffd34d"/></svg>',
  };
  const LEFT = [
    { key: 'truck', name: 'Trucks', send: 'truck', buy: 'truck' },
    { key: 'ag', name: 'Ground turret', buy: 'ag', place: true },
    { key: 'aa', name: 'Air turret', buy: 'aa', place: true },
    { key: 'inf', name: 'Infantry', send: 'inf', buy: 'inf' },
    { key: 'tank', name: 'Tanks', send: 'tank', buy: 'tank' },
    { key: 'bomb', name: 'Bombers', send: 'bomb', buy: 'bomb' },
  ];
  const BUILD = [
    { key: 'housing', name: 'Housing', tip: '+60 people. Tap one later to build it taller.' },
    { key: 'workshop', name: 'Workshop', tip: 'Workers gather 25% faster' },
    { key: 'depot', name: 'Depot', tip: 'Faster trucks, +2 truck spaces' },
    { key: 'barracks', name: 'Barracks', tip: '+2 defenders, they recover faster' },
  ];

  function costHTML(cost, p) {
    if (!cost) return '';
    return RES.filter((r) => cost[r]).map((r) => `<span class="${p && p.stock[r] < cost[r] ? 'short' : ''}"><i style="background:${RCOL[r]}"></i>${cost[r]}</span>`).join('');
  }

  function buildPanels() {
    const L = $('#left');
    L.innerHTML = '<div class="title">Send &amp; defend</div>' + LEFT.map((it) => `
      <div class="row" data-key="${it.key}" ${it.send ? `data-send="${it.send}"` : ''}>
        <div class="ico">${ICONS[it.key]}</div>
        <div><div class="count" data-count>0</div><div class="name">${it.name}</div></div>
        <button class="plus" data-buy="${it.buy}" aria-label="Buy ${it.name}">+</button>
        <div class="cost" data-cost></div>
      </div>`).join('');
    const R = $('#right');
    R.innerHTML = '<div class="title">Build</div>' + BUILD.map((it) => `
      <div class="row build" data-build="${it.key}" title="${it.tip}">
        <div class="ico">${ICONS[it.key]}</div>
        <div><div class="name" style="font-weight:600;opacity:1">${it.name} <small data-n></small></div><div class="cost" data-cost></div></div>
      </div>`).join('') + `
      <div class="row build" data-upgrades>
        <div class="ico">${ICONS.up}</div>
        <div><div class="name" style="font-weight:600;opacity:1">Upgrades</div><div class="cost" data-cost style="opacity:.7">Health, damage</div></div>
      </div>`;
    const B = $('#bottom');
    B.innerHTML = RES.map((r) => `<div class="res ${me.rich.includes(r) ? 'rich' : ''}" data-res="${r}"><div class="dot" style="background:${RCOL[r]}"></div><div><div class="v">0</div><div class="r">${C.resourceNames[r]}</div></div></div>`).join('');

    // buying
    L.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = b.dataset.buy;
      if (item === 'ag' || item === 'aa') {
        if (!g.canAfford(me, g.costOf(me, item))) return toast('Not enough ' + g.missing(me, g.costOf(me, item)).map((r) => C.resourceNames[r]).join(' and '), 'bad');
        return setMode({ kind: 'place', item });
      }
      const r = g.buy(me, item); if (!r.ok) toast(r.msg, 'bad');
    }));
    L.querySelectorAll('[data-send]').forEach((row) => row.addEventListener('pointerdown', (e) => { if (!e.target.closest('.plus')) startDrag(e, row.dataset.send); }));
    R.querySelectorAll('[data-build]').forEach((row) => row.addEventListener('click', () => {
      const item = row.dataset.build;
      if (mode && mode.kind === 'build' && mode.item === item) return setMode(null);
      if (!me.buildings.includes(null)) return toast('No empty lots left. Tap a Housing block to build it taller.', 'bad');
      if (!g.canAfford(me, g.costOf(me, item))) return toast('Not enough ' + g.missing(me, g.costOf(me, item)).map((r) => C.resourceNames[r]).join(' and '), 'bad');
      setMode({ kind: 'build', item });
    }));
    R.querySelector('[data-upgrades]').addEventListener('click', (e) => openUpgrades(e));
  }

  function updatePanels() {
    for (const it of LEFT) {
      const row = document.querySelector(`#left [data-key="${it.key}"]`);
      let c;
      if (it.key === 'truck') { const busy = me.trucks.length - g.idleTrucks(me).length; c = `${g.idleTrucks(me).length}<small> + ${busy} out</small>`; }
      else if (it.place) c = me.turrets.filter((t) => t.type === it.key).length;
      else c = me.army[it.key];
      row.querySelector('[data-count]').innerHTML = c;
      const cost = g.costOf(me, it.buy);
      row.querySelector('[data-cost]').innerHTML = costHTML(cost, me) + (it.key === 'inf' ? '<span style="opacity:.7">for 5</span>' : '');
      row.querySelector('.plus').classList.toggle('no', !g.canAfford(me, cost));
      row.classList.toggle('selected', !!(mode && ((mode.kind === 'send' && mode.item === it.send) || (mode.kind === 'place' && mode.item === it.key))));
    }
    for (const it of BUILD) {
      const row = document.querySelector(`#right [data-build="${it.key}"]`);
      const cost = g.costOf(me, it.key);
      row.querySelector('[data-cost]').innerHTML = costHTML(cost, me);
      const n = g.count(me, it.key);
      row.querySelector('[data-n]').textContent = n ? `(${n})` : '';
      row.classList.toggle('no', !g.canAfford(me, cost));
      row.classList.toggle('armed', !!(mode && mode.kind === 'build' && mode.item === it.key));
    }
    const boost = (1 + C.workshopBoost * g.count(me, 'workshop')) * (g.finalPush ? C.finalIncomeBoost : 1);
    for (const r of RES) {
      const el = document.querySelector(`[data-res="${r}"]`);
      el.querySelector('.v').textContent = Math.floor(me.stock[r]);
      el.querySelector('.r').textContent = C.resourceNames[r] + (me.rich.includes(r) ? ` +${(C.richRate * boost).toFixed(1)}/s` : ' (trade)');
    }
    // top bar
    const tl = g.timeLeft, m = Math.floor(tl / 60), s = Math.floor(tl % 60);
    $('#clock').textContent = `${m}:${String(s).padStart(2, '0')}`;
    $('#clock').classList.toggle('final', g.finalPush);
    const ph = $('#phase');
    if (g.peace) { ph.className = 'chip peace'; ph.textContent = `Peace ${Math.ceil(C.peaceSeconds - g.t)}s`; }
    else if (g.finalPush) { ph.className = 'chip final'; ph.textContent = 'Final push!'; }
    else { ph.className = 'chip'; ph.textContent = 'Open war'; }
    const rk = g.rankOf(me);
    $('#me').innerHTML = `<b>${ordinal(rk)}</b> &middot; ${Math.floor(me.pop)} people <span style="opacity:.6">/ room for ${g.popCap(me)}</span>`;
    updateBadges();
  }
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');

  // ---------- badges (other players round the edge, in their real direction) ----------
  function buildBadges() {
    const wrap = $('#badges');
    wrap.innerHTML = '';
    for (const q of g.players) {
      if (q === me) continue;
      const el = document.createElement('div');
      el.className = 'badge'; el.dataset.pid = q.id;
      el.innerHTML = `<svg class="ring" viewBox="0 0 66 66"><circle cx="33" cy="33" r="30" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="5"/><circle class="cd" cx="33" cy="33" r="30" fill="none" stroke="#ff7a6a" stroke-width="5" stroke-dasharray="188.5" stroke-dashoffset="188.5"/></svg>
        <div class="disc" style="background:${q.color}"><span class="rk">1</span><sup class="sx">st</sup></div>
        <div class="lbl"><b>${q.name}</b><br><span class="tr"></span></div>`;
      el.querySelector('.disc').addEventListener('click', (e) => onBadgeTap(e, q));
      wrap.appendChild(el);
    }
    const home = document.createElement('div');
    home.className = 'badge home'; home.dataset.pid = 'home';
    home.innerHTML = `<div class="disc" title="Countryside">&#x2691;</div><div class="lbl"><b>Countryside</b><br><span class="tr"></span></div>`;
    home.querySelector('.disc').addEventListener('click', (e) => onBadgeTap(e, 'home'));
    wrap.appendChild(home);
  }

  function badgePos(ang) {
    const a = ang - viewAngle;
    const dx = Math.sin(a), dy = -Math.cos(a) * TILT;
    const r = view.rect, inset = 40;
    const hx = (r.w / 2 - inset), hy = (r.h / 2 - inset - 10);
    const t = Math.min(Math.abs(dx) > 1e-6 ? hx / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? hy / Math.abs(dy) : 1e9);
    return { x: view.cx + dx * t, y: view.cy + dy * t };
  }

  function updateBadges() {
    for (const el of document.querySelectorAll('.badge')) {
      const pid = el.dataset.pid;
      if (pid === 'home') {
        const pos = badgePos(me.homeDir);
        el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
        const n = g.trucksTo(me, 'home');
        el.querySelector('.tr').textContent = n ? `${n} truck${n > 1 ? 's' : ''} out` : 'slow trucks';
        el.classList.toggle('target', !!(mode && mode.kind === 'send' && mode.item === 'truck') || dragOver === 'home');
        continue;
      }
      const q = g.players[+pid];
      const pos = badgePos(me.dir[q.id]);
      el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
      const rk = g.rankOf(q);
      el.querySelector('.rk').textContent = rk; el.querySelector('.sx').textContent = ordinal(rk).slice(String(rk).length);
      const cd = g.cooldownLeft(me, q);
      el.querySelector('.cd').setAttribute('stroke-dashoffset', String(188.5 * (1 - cd / C.convoy.cooldown)));
      const mine = g.trucksTo(me, q.id), theirs = g.trucksTo(q, me.id);
      const route = mine > 0 && theirs > 0;
      el.classList.toggle('route', route);
      let txt = cd > 0 ? `trade cut ${Math.ceil(cd)}s` : route ? `trade route ${mine}&#x21C4;${theirs}` : (mine || theirs) ? `trucks: you ${mine}, them ${theirs}` : '';
      el.querySelector('.tr').innerHTML = txt;
      el.classList.toggle('target', !!(mode && mode.kind === 'send') || dragOver === q.id);
    }
  }

  function onBadgeTap(e, q) {
    e.stopPropagation();
    if (mode && mode.kind === 'send') { const it = mode.item; setMode(null); return sendTo(it, q); }
    if (q === 'home') {
      return openPopover(e, `<h3>Countryside</h3><p>Trucks sent here bring back what you lack, but slowly. Another player is faster, and a trade route (trucks both ways) is fastest.</p>`,
        [['Send a truck', () => sendTo('truck', 'home'), !g.idleTrucks(me).length], ['Bring a truck home', () => res(g.recallTruck(me, 'home')), !g.trucksTo(me, 'home')]]);
    }
    const mine = g.trucksTo(me, q.id), theirs = g.trucksTo(q, me.id), cd = g.cooldownLeft(me, q);
    const brain = brains.find((b) => b.p === q);
    openPopover(e, `<h3>${q.name} &middot; ${ordinal(g.rankOf(q))}</h3>
      <p>Rich in ${q.rich.map((r) => `<b style="color:${RCOL[r]}">${C.resourceNames[r]}</b>`).join(' and ')}.</p>
      <p>Your trucks to them: ${mine}. Theirs to you: ${theirs}.${mine && theirs ? ' <b>Trade route:</b> trucks run fast both ways.' : ''}</p>
      ${cd > 0 ? `<p style="color:#ff9d8f">Trade is cut for ${Math.ceil(cd)} more seconds.</p>` : ''}
      <p style="opacity:.65">In the real game you'd just ask ${q.name} out loud.</p>`,
      [['Send a truck', () => sendTo('truck', q), !g.idleTrucks(me).length || cd > 0],
       [`Ask ${q.name} for a truck`, () => { const r = brain.askedForTruck(me); toast(r.say, r.yes ? 'good' : ''); }, false],
       ['Bring a truck home', () => res(g.recallTruck(me, q.id)), !mine]]);
  }
  const res = (r) => { if (!r.ok) toast(r.msg, 'bad'); };

  function sendTo(item, q) {
    if (item === 'truck') {
      const r = g.sendTruck(me, q === 'home' ? 'home' : q.id);
      if (!r.ok) return toast(r.msg, 'bad');
      if (q !== 'home') toast(g.trucksTo(q, me.id) > 0 ? `Trade route with ${q.name}! Trucks run fast both ways.` : `Truck on its way to ${q.name}. Ask them to send one back for a trade route.`, g.trucksTo(q, me.id) > 0 ? 'good' : '');
      return;
    }
    if (q === 'home') return toast('Soldiers can only be sent to players.', 'bad');
    const had = g.trucksTo(me, q.id) + g.trucksTo(q, me.id);
    const r = g.sendArmy(me, item, q.id);
    if (!r.ok) return toast(r.msg, 'bad');
    const nm = { inf: 'infantry', tank: r.n > 1 ? 'tanks' : 'tank', bomb: r.n > 1 ? 'bombers' : 'bomber' }[item];
    toast(`${r.n} ${nm} on their way to ${q.name}.${had ? ' Trade with them is cut.' : ''}`);
  }

  // ---------- drag to send ----------
  let drag = null, dragOver = null;
  function startDrag(e, item) {
    e.preventDefault();
    drag = { item, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
    const label = { truck: 'Truck', inf: 'Infantry', tank: 'Tanks', bomb: 'Bombers' }[item];
    const gh = $('#ghost'); gh.textContent = label; gh.hidden = true;
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) { drag.moved = true; $('#ghost').hidden = false; }
    if (!drag.moved) return;
    const gh = $('#ghost'); gh.style.left = e.clientX + 'px'; gh.style.top = e.clientY + 'px';
    dragOver = dropTarget(e.clientX, e.clientY, drag.item);
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null; $('#ghost').hidden = true;
    const target = d.moved ? dropTarget(e.clientX, e.clientY, d.item) : null; dragOver = null;
    if (!d.moved) { // a tap: pick it, then tap a player
      if (mode && mode.kind === 'send' && mode.item === d.item) return setMode(null);
      return setMode({ kind: 'send', item: d.item });
    }
    if (target == null) return toast(d.item === 'truck' ? 'Drop it on a player, or on the Countryside sign.' : 'Drop them on a player.', '');
    sendTo(d.item, target === 'home' ? 'home' : g.players[target]);
  });
  // nearest badge to the finger, or the countryside if it's out toward an empty edge
  function dropTarget(x, y, item) {
    let best = null, bd = 80;
    for (const el of document.querySelectorAll('.badge')) {
      const bx = parseFloat(el.style.left), by = parseFloat(el.style.top);
      const d = Math.hypot(bx - x, by - y);
      if (d < bd) { bd = d; best = el.dataset.pid === 'home' ? 'home' : +el.dataset.pid; }
    }
    if (best == null && item === 'truck') {
      const r = view.rect;
      const nx = (x - view.cx) / (r.w / 2), ny = (y - view.cy) / (r.h / 2);
      if (Math.hypot(nx, ny) > 0.85 || x < r.x || x > r.x + r.w) {
        // toward a player? then not home
        const a = Math.atan2(x - view.cx, -(y - view.cy) / TILT) + viewAngle;
        const near = g.players.some((q) => q !== me && Math.abs(angDiff(me.dir[q.id], a)) < 0.45);
        if (!near) best = 'home';
      }
    }
    return best;
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // ---------- modes and tapping the city ----------
  function setMode(m) {
    mode = m; closePopover();
    if (!m) return setHint(null);
    if (m.kind === 'place') setHint(`Tap the ring around your city to place the ${m.item === 'ag' ? 'ground' : 'air'} turret. Face it toward your enemies.`);
    if (m.kind === 'build') setHint(`Tap an empty lot to build ${m.item === 'housing' ? 'Housing' : 'a ' + m.item[0].toUpperCase() + m.item.slice(1)}.`);
    if (m.kind === 'send') setHint(m.item === 'truck' ? 'Now tap a player, or the Countryside sign.' : 'Now tap the player to send them to.');
  }
  function setHint(text) {
    const h = $('#hint');
    document.body.classList.toggle('hinting', !!text);
    if (!text) { h.hidden = true; return; }
    h.hidden = false; h.innerHTML = `<span>${text}</span><button>Cancel</button>`;
    h.querySelector('button').onclick = () => setMode(null);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!g || paused) return;
    closePopover();
    const w = unproject(e.clientX, e.clientY);
    if (mode && mode.kind === 'place') {
      const r = g.placeTurret(me, mode.item, w.x, w.y);
      if (!r.ok) return toast(r.msg, 'bad');
      setMode(null); return;
    }
    if (mode && mode.kind === 'build') {
      const lot = nearestLot(w, (b) => b === null);
      if (lot < 0) return toast('Tap one of the empty lots (dashed squares).', 'bad');
      const r = g.build(me, mode.item, lot); if (!r.ok) toast(r.msg, 'bad');
      setMode(null); return;
    }
    if (mode) { setMode(null); return; }
    // tap a building
    const lot = nearestLot(w, (b) => b !== null);
    if (lot >= 0) return buildingPopover(e, lot);
  });
  function nearestLot(w, ok) {
    let best = -1, bd = 9;
    me.buildings.forEach((b, i) => { if (!ok(b)) return; const d = Math.hypot(BT.LOTS[i].x - w.x, BT.LOTS[i].y - (w.y - 3)); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function buildingPopover(e, lot) {
    const b = me.buildings[lot];
    const names = { housing: 'Housing', workshop: 'Workshop', depot: 'Depot', barracks: 'Barracks' };
    if (b.rubble) {
      const cost = g.rebuildCost(me, lot);
      return openPopover(e, `<h3>Rubble</h3><p>This ${names[b.type]} was wrecked. Rebuild it for half price.</p>`, [[`Rebuild &nbsp;${costHTML(cost, me)}`, () => res(g.rebuild(me, lot)), !g.canAfford(me, cost)]]);
    }
    if (b.type === 'housing') {
      const cost = g.costOf(me, 'housing');
      const top = b.level >= C.housingMaxLevel;
      return openPopover(e, `<h3>Housing, level ${b.level}</h3><p>Room for ${C.housingCap * b.level} people.${top ? ' As tall as it gets.' : ' Each level adds room for 60 more.'}</p>`,
        top ? [] : [[`Build taller &nbsp;${costHTML(cost, me)}`, () => res(g.raise(me, lot)), !g.canAfford(me, cost)]]);
    }
    openPopover(e, `<h3>${names[b.type]}</h3><p>${BUILD.find((x) => x.key === b.type).tip}.</p>`, []);
  }

  function openUpgrades(e) {
    const rows = Object.entries(C.upgrades).map(([path, u]) => {
      const cost = g.upgradeCost(me, path);
      const pips = [0, 1, 2].map((i) => `<i class="${i < me.up[path] ? 'on' : ''}"></i>`).join('');
      return [`${u.name}<span class="tiers">${pips}</span><br><span class="cost">${cost ? costHTML(cost, me) : 'All done'}</span>`, () => { res(g.upgrade(me, path)); openUpgrades(e); }, !cost || !g.canAfford(me, cost)];
    });
    openPopover(e, `<h3>Upgrades</h3><p>Each tier adds 25%. Unit upgrades help your defenders too.</p>`, rows, true);
  }

  function openPopover(e, html, actions, keep) {
    const p = $('#popover');
    p.innerHTML = html + `<div class="acts">${actions.map((a, i) => `<button data-i="${i}" ${a[2] ? 'disabled' : ''}>${a[0]}</button>`).join('')}<button class="quiet" data-close>Close</button></div>`;
    p.hidden = false;
    const x = Math.min(window.innerWidth - 240, Math.max(10, e.clientX - 115));
    const y = Math.min(window.innerHeight - p.offsetHeight - 10, Math.max(46, e.clientY - 40));
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.querySelectorAll('[data-i]').forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); if (!keep) closePopover(); actions[+b.dataset.i][1](); });
    p.querySelector('[data-close]').onclick = closePopover;
  }
  function closePopover() { $('#popover').hidden = true; }

  // ---------- toasts and events ----------
  function toast(text, kind = '', secs = 3.2) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.innerHTML = text;
    const box = $('#toasts'); box.prepend(t);
    while (box.children.length > 2) box.lastChild.remove();
    setTimeout(() => t.remove(), secs * 1000);
  }
  function handle(evs) {
    for (const e of evs) {
      const from = e.from != null && typeof e.from === 'number' ? g.players[e.from] : null;
      if (e.type === 'attack' && e.to === me.id) {
        const nm = { inf: 'infantry', tank: 'tanks', bomb: 'bombers' }[e.kind];
        toast(`${from.name} sent ${e.count} ${nm} your way!`, 'bad');
        const el = document.querySelector(`.badge[data-pid="${from.id}"]`); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
      }
      if (e.type === 'routeBroken' && (e.a === me.id || e.b === me.id)) {
        const q = g.players[e.a === me.id ? e.b : e.a];
        if (e.a !== me.id) toast(`Trade with ${q.name} is cut for ${C.convoy.cooldown} seconds.`, 'bad');
      }
      if (e.type === 'truck' && e.to === me.id) toast(g.trucksTo(me, from.id) > 0 ? `${from.name} sent a truck back. Trade route! Trucks run fast both ways.` : `${from.name} sent a truck your way. Send one back for a trade route.`, 'good');
      if (e.type === 'delivery' && e.to === me.id) for (const r in e.load) flashRes(r);
      if (e.type === 'wrecked' && e.p === me.id) toast(`Your ${e.building} was wrecked. Tap the rubble to rebuild.`, 'bad');
      if (e.type === 'peaceOver') toast('Peace is over. Attacks can be sent now.', 'bad', 4);
      if (e.type === 'final') toast('Final push! Resources come faster and units are cheaper.', 'bad', 5);
      if (e.type === 'over') showEnd();
    }
  }
  function flashRes(r) { const el = document.querySelector(`[data-res="${r}"]`); if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 350); }

  function showEnd() {
    paused = true;
    const rank = g.ranking();
    $('#end-title').textContent = rank[0] === me ? 'You win!' : `Time's up! You came ${ordinal(rank.indexOf(me) + 1)}.`;
    $('#end-list').innerHTML = rank.map((p) => `<li class="${p === me ? 'you' : ''}">${p.name}: ${Math.floor(p.pop)} people</li>`).join('');
    $('#end-note').textContent = `You sent ${me.stats.sent} units and lost ${Math.round(me.stats.lost)} people to attacks.`;
    $('#end').hidden = false;
  }

  // ---------- drawing ----------
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    const lw = $('#left').offsetWidth, rw = $('#right').offsetWidth, th = 40, bh = 52;
    view.rect = { x: lw, y: th, w: W - lw - rw, h: H - th - bh };
    view.cx = view.rect.x + view.rect.w / 2; view.cy = view.rect.y + view.rect.h / 2 + 6;
    view.S = Math.min(view.rect.w / (2 * 82), view.rect.h / (2 * 82 * TILT));
  }
  window.addEventListener('resize', resize);

  function proj(x, y, h = 0) {
    const c = Math.cos(viewAngle), s = Math.sin(viewAngle);
    const rx = x * c + y * s, ry = y * c - x * s;
    return { x: view.cx + rx * view.S, y: view.cy + ry * view.S * TILT - h * view.S * 0.75 };
  }
  function unproject(sx, sy) {
    const rx = (sx - view.cx) / view.S, ry = (sy - view.cy) / (view.S * TILT);
    const c = Math.cos(viewAngle), s = Math.sin(viewAngle);
    return { x: rx * c - ry * s, y: rx * s + ry * c };
  }
  function screenAngle(worldAng) { const a = worldAng - viewAngle; return Math.atan2(-Math.cos(a) * TILT, Math.sin(a)); }

  // fields and workers (decoration)
  function makeDecor(p) {
    const fields = p.rich.map((r, i) => ({ r, ang: p.homeDir + (i ? -0.75 : 0.75), dist: 60 }));
    const workers = [];
    fields.forEach((f, i) => { for (let k = 0; k < 3; k++) workers.push({ f: i, ph: Math.random(), sp: 0.04 + Math.random() * 0.02 }); });
    return { fields, workers };
  }

  function ellipseRing(r, style, width, dash) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const q = proj(Math.sin(a) * r, -Math.cos(a) * r); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  }
  function roadTo(ang, from, to) {
    const d = BT.dirVec(ang); const a = proj(d.x * from, d.y * from), b = proj(d.x * to, d.y * to);
    ctx.lineCap = 'round';
    ctx.strokeStyle = PAL.road; ctx.lineWidth = 6 * view.S * 0.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = PAL.roadLine; ctx.lineWidth = 1; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
  }

  function draw(now) {
    const S = view.S;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = PAL.sea; ctx.fillRect(0, 0, W, H);
    if (!g) return;
    // ground
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const q = proj(Math.sin(a) * 135, -Math.cos(a) * 135); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.fillStyle = PAL.grass; ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const q = proj(Math.sin(a) * 37, -Math.cos(a) * 37); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.fillStyle = PAL.plaza; ctx.fill();
    // roads toward each player and the countryside
    for (const q of g.players) if (q !== me) roadTo(me.dir[q.id], 38, 140);
    roadTo(me.homeDir, 38, 140);
    ellipseRing(38, PAL.road, 5 * S * 0.6);
    // fields
    for (const f of g.decor.fields) drawField(f, now);
    if (mode && mode.kind === 'place') { ellipseRing(C.turretZone[0], 'rgba(255,211,77,.9)', 2, [6, 5]); ellipseRing(C.turretZone[1], 'rgba(255,211,77,.9)', 2, [6, 5]); }

    // things standing on the ground, back to front
    const items = [];
    me.buildings.forEach((b, i) => items.push({ y: BT.LOTS[i].y, x: BT.LOTS[i].x, f: () => drawBuilding(b, i, now) }));
    items.push({ x: 0, y: 0, f: () => drawHall(now) });
    for (const t of me.turrets) items.push({ x: t.x, y: t.y, f: () => drawTurret(t) });
    for (const d of me.defenders) items.push({ x: d.x, y: d.y, f: () => drawSoldier(d, me.color, true, now) });
    for (const v of me.invaders) if (v.kind !== 'bomb') items.push({ x: v.x, y: v.y, f: () => v.kind === 'inf' ? drawSoldier(v, g.players[v.from].color, false, now) : drawTank(v, g.players[v.from].color) });
    for (const t of me.trucks) if (t.dest !== null) { const pos = truckPos(t); if (pos) items.push({ x: pos.x, y: pos.y, f: () => drawTruck(pos, t) }); }
    for (const w of g.decor.workers) { const pos = workerPos(w, now); items.push({ x: pos.x, y: pos.y, f: () => drawWorker(pos, now) }); }
    const c = Math.cos(viewAngle), s = Math.sin(viewAngle);
    items.sort((a, b) => (a.y * c - a.x * s) - (b.y * c - b.x * s));
    for (const it of items) it.f();
    // bombers in the air
    for (const v of me.invaders) if (v.kind === 'bomb') drawBomber(v, g.players[v.from].color);
    // effects
    for (const f of me.fx) drawFx(f);
  }

  function drawField(f, now) {
    const d = BT.dirVec(f.ang); const cx = d.x * f.dist, cy = d.y * f.dist;
    const S = view.S;
    const p = proj(cx, cy);
    ctx.save(); ctx.translate(p.x, p.y);
    if (f.r === 'food') {
      ctx.fillStyle = '#8a7a3c'; ctx.fillRect(-14 * S, -7 * S, 28 * S, 14 * S);
      ctx.strokeStyle = '#9bd35c'; ctx.lineWidth = Math.max(1, S * 1.2);
      for (let i = -12; i <= 12; i += 4) { ctx.beginPath(); ctx.moveTo(i * S, -6 * S); ctx.lineTo(i * S, 6 * S); ctx.stroke(); }
    } else if (f.r === 'steel') {
      ctx.fillStyle = '#6e6a63'; ctx.beginPath(); ctx.ellipse(0, 0, 13 * S, 7 * S, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4e4b46'; ctx.beginPath(); ctx.ellipse(0, 1 * S, 8 * S, 4 * S, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9fb0c4'; for (const [a, b] of [[-9, -2], [7, -3], [3, 4]]) ctx.fillRect(a * S, b * S, 3 * S, 2 * S);
    } else if (f.r === 'fuel') {
      ctx.fillStyle = '#4a4636'; ctx.fillRect(-12 * S, -6 * S, 24 * S, 12 * S);
      for (const ox of [-6, 6]) {
        const bob = Math.sin(now / 400 + ox) * 2 * S;
        ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1.5, S); ctx.beginPath(); ctx.moveTo(ox * S - 3 * S, 2 * S); ctx.lineTo(ox * S, -9 * S); ctx.lineTo(ox * S + 3 * S, 2 * S); ctx.stroke();
        ctx.fillStyle = '#ef8f2f'; ctx.fillRect(ox * S - 5 * S, -10 * S + bob, 10 * S, 2.2 * S);
      }
    } else if (f.r === 'chips') {
      ctx.fillStyle = '#3d4a52'; ctx.fillRect(-13 * S, -6 * S, 26 * S, 12 * S);
      for (let i = -11; i <= 7; i += 6) for (let j = -4; j <= 1; j += 5) { ctx.fillStyle = '#56c8e0'; ctx.fillRect(i * S, j * S, 4.5 * S, 3.5 * S); }
      if (Math.floor(now / 500) % 2) { ctx.fillStyle = '#d6ffff'; ctx.fillRect(-11 * S, -4 * S, 1.5 * S, 1.5 * S); }
    }
    ctx.restore();
  }

  function box(p, w, h, front, top, outline) {
    const S = view.S, d = w * 0.55;
    const x = p.x - (w * S) / 2, y = p.y - h * S * 0.75;
    ctx.fillStyle = top; ctx.fillRect(x, y - d * S * TILT, w * S, d * S * TILT);
    ctx.fillStyle = front; ctx.fillRect(x, y, w * S, h * S * 0.75);
    if (outline) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x, y - d * S * TILT, w * S, h * S * 0.75 + d * S * TILT); }
    return { x, y, w: w * S, h: h * S * 0.75, topH: d * S * TILT };
  }
  function shadow(p, rx, ry) { ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, 7); ctx.fill(); }
  function hpBar(p, frac, w) {
    if (frac >= 0.999) return;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - w / 2, p.y, w, 3);
    ctx.fillStyle = frac > 0.5 ? '#6fcf86' : frac > 0.25 ? '#ffd34d' : '#ff6a5a'; ctx.fillRect(p.x - w / 2, p.y, w * Math.max(0, frac), 3);
  }

  function drawHall(now) {
    const S = view.S, p = proj(0, 0);
    shadow({ x: p.x + 2, y: p.y + 2 }, 9 * S, 5 * S);
    const b = box(p, 13, 9, '#cfc3a6', '#e8dfc8', true);
    ctx.fillStyle = '#7aa7c7'; ctx.beginPath(); ctx.ellipse(p.x, b.y - b.topH / 2, 4 * S, 4 * S, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = PAL.glass; for (let i = -1; i <= 1; i++) ctx.fillRect(p.x + i * 3.6 * S - S, b.y + 2 * S, 2 * S, 3 * S);
    // flag in your color
    const fx = p.x + 4 * S, fy = b.y - b.topH - 2 * S;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 8 * S); ctx.stroke();
    const wv = Math.sin(now / 250) * S;
    ctx.fillStyle = me.color; ctx.beginPath(); ctx.moveTo(fx, fy - 8 * S); ctx.lineTo(fx + 5 * S, fy - 7 * S + wv); ctx.lineTo(fx, fy - 5 * S); ctx.fill();
  }

  function drawBuilding(b, i, now) {
    const S = view.S, L = BT.LOTS[i], p = proj(L.x, L.y);
    if (!b) {
      if (mode && mode.kind === 'build') {
        ctx.strokeStyle = 'rgba(255,211,77,.95)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.strokeRect(p.x - 5 * S, p.y - 3 * S, 10 * S, 6 * S); ctx.setLineDash([]);
      } else { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 4.5 * S, p.y - 2.7 * S, 9 * S, 5.4 * S); }
      return;
    }
    if (b.rubble) {
      ctx.fillStyle = PAL.rubble;
      for (const [a, c, r] of [[-3, 0, 3], [2, 1, 3.5], [0, -2, 2.6], [4, -1, 2]]) { ctx.beginPath(); ctx.ellipse(p.x + a * S, p.y + c * S * 0.6, r * S, r * S * 0.6, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = PAL.smoke; const t = (now / 1500 + i) % 1;
      ctx.beginPath(); ctx.arc(p.x, p.y - 4 * S - t * 10 * S, (1.5 + t * 3) * S, 0, 7); ctx.fill();
      return;
    }
    const rise = b.rising != null ? Math.min(1, b.rising) : 1;
    shadow({ x: p.x + 2, y: p.y + 1 }, 6 * S, 3.5 * S);
    let bx;
    if (b.type === 'housing') {
      const grow = b.grow != null ? b.grow : 1;
      const h = (6 + (b.level - 1 + grow) * 5) * rise;
      const walls = ['#d9cdb0', '#cdbfa0', '#e3d6b8', '#d2c3a2'][i % 4];
      bx = box(p, 8.5, h, walls, i % 2 ? '#c4643f' : '#8fb6c9', true);
      // windows, a few lit
      const rows = Math.max(1, Math.floor(h / 2.5)), cols = 3;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = ((i * 7 + r * 3 + c) % 5) === 0;
        ctx.fillStyle = lit ? PAL.glassLit : PAL.glass;
        ctx.fillRect(bx.x + (1.3 + c * 2.4) * S, bx.y + (0.8 + r * 2.5 * 0.75) * S, 1.3 * S, 1.1 * S);
      }
    } else if (b.type === 'workshop') {
      bx = box(p, 10, 5 * rise, '#b08d57', '#9a7a48', true);
      ctx.fillStyle = '#7d6440'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx.x + k * 3.3 * S, bx.y - bx.topH * 0.2); ctx.lineTo(bx.x + (k + 1) * 3.3 * S, bx.y - bx.topH); ctx.lineTo(bx.x + (k + 1) * 3.3 * S, bx.y - bx.topH * 0.2); ctx.fill(); }
      ctx.fillStyle = '#555'; ctx.fillRect(bx.x + bx.w - 2 * S, bx.y - bx.topH - 4 * S, 1.6 * S, 4 * S);
      const t = (now / 1200 + i * 0.3) % 1; ctx.fillStyle = 'rgba(220,220,220,.5)'; ctx.beginPath(); ctx.arc(bx.x + bx.w - 1.2 * S, bx.y - bx.topH - 5 * S - t * 6 * S, (1 + t * 2) * S, 0, 7); ctx.fill();
    } else if (b.type === 'depot') {
      bx = box(p, 10, 4.5 * rise, '#7d8f9e', '#94a6b4', true);
      ctx.fillStyle = '#4a5864'; ctx.fillRect(bx.x + 1.5 * S, bx.y + 0.8 * S, 7 * S, bx.h - 0.8 * S);
      ctx.strokeStyle = '#7d8f9e'; ctx.lineWidth = 1; for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx.x + 1.5 * S, bx.y + 0.8 * S + k * 1 * S); ctx.lineTo(bx.x + 8.5 * S, bx.y + 0.8 * S + k * 1 * S); ctx.stroke(); }
    } else if (b.type === 'barracks') {
      bx = box(p, 10, 4.5 * rise, '#6e7a4c', '#59633c', true);
      const fx = bx.x + bx.w - 1.5 * S, fy = bx.y - bx.topH;
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 7 * S); ctx.stroke();
      ctx.fillStyle = me.color; ctx.fillRect(fx, fy - 7 * S, 4 * S, 2.5 * S);
    }
    if (rise < 1) { // scaffolding
      ctx.strokeStyle = '#d9a21b'; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx.x - S + k * bx.w / 2, p.y); ctx.lineTo(bx.x - S + k * bx.w / 2, bx.y - bx.topH - 2 * S); ctx.stroke(); }
    }
    hpBar({ x: p.x, y: p.y + 2 * S }, b.hp / b.maxHp, 9 * S);
  }

  function drawTurret(t) {
    const S = view.S, p = proj(t.x, t.y);
    shadow(p, 3.5 * S, 2 * S);
    ctx.fillStyle = '#8a949c'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 0.5 * S, 3.4 * S, 2.1 * S, 0, 0, 7); ctx.fill();
    ctx.fillStyle = me.color; ctx.fillRect(p.x - 3 * S, p.y - 1.4 * S, 6 * S, 0.9 * S);
    const top = { x: p.x, y: p.y - 3 * S };
    ctx.fillStyle = '#5d666e'; ctx.beginPath(); ctx.ellipse(top.x, top.y, 2.3 * S, 1.6 * S, 0, 0, 7); ctx.fill();
    const a = screenAngle(t.aim);
    ctx.strokeStyle = '#2d3338'; ctx.lineCap = 'round';
    if (t.type === 'ag') {
      ctx.lineWidth = 1.3 * S; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + Math.cos(a) * 4.5 * S, top.y + Math.sin(a) * 4.5 * S); ctx.stroke();
    } else {
      ctx.lineWidth = 0.9 * S;
      for (const o of [-0.8, 0.8]) { ctx.beginPath(); ctx.moveTo(top.x + o * S, top.y); ctx.lineTo(top.x + o * S + Math.cos(a) * 2 * S, top.y - 4.5 * S); ctx.stroke(); }
    }
    hpBar({ x: p.x, y: p.y + 2 * S }, t.hp / t.maxHp, 6 * S);
  }

  function drawSoldier(u, color, friendly, now) {
    const S = Math.max(1.4, view.S * 0.9), p = proj(u.x, u.y);
    shadow(p, 1.6 * S, 0.8 * S);
    const step = u.moving > 0 || u.life != null ? Math.sin(now / 90 + u.x) : 0;
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(1, 0.7 * S);
    ctx.beginPath(); ctx.moveTo(p.x - 0.5 * S, p.y - 1.8 * S); ctx.lineTo(p.x - 0.6 * S - step * 0.5 * S, p.y); ctx.moveTo(p.x + 0.5 * S, p.y - 1.8 * S); ctx.lineTo(p.x + 0.6 * S + step * 0.5 * S, p.y); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(p.x - 1 * S, p.y - 4 * S, 2 * S, 2.4 * S);
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.arc(p.x, p.y - 4.8 * S, 0.9 * S, 0, 7); ctx.fill();
    ctx.fillStyle = friendly ? '#3d5a2a' : '#2a2a2a'; ctx.beginPath(); ctx.arc(p.x, p.y - 5.1 * S, 1 * S, Math.PI, 0); ctx.fill();
    if (u.aim) { const a = proj(u.aim.x, u.aim.y); const ang = Math.atan2(a.y - p.y, a.x - p.x); ctx.beginPath(); ctx.moveTo(p.x, p.y - 3.2 * S); ctx.lineTo(p.x + Math.cos(ang) * 2.2 * S, p.y - 3.2 * S + Math.sin(ang) * 2.2 * S); ctx.stroke(); }
  }

  function drawTank(v, color) {
    const S = view.S, p = proj(v.x, v.y);
    shadow(p, 4 * S, 2.3 * S);
    const a = screenAngle(v.heading || 0);
    ctx.save(); ctx.translate(p.x, p.y - 1.5 * S); ctx.scale(1, 1); ctx.rotate(a);
    ctx.fillStyle = '#33393e'; ctx.fillRect(-3.6 * S, -2.4 * S, 7.2 * S, 4.8 * S);
    ctx.fillStyle = color; ctx.fillRect(-3 * S, -1.8 * S, 6 * S, 3.6 * S);
    ctx.restore();
    const aim = v.aim ? Math.atan2(proj(v.aim.x, v.aim.y).y - p.y, proj(v.aim.x, v.aim.y).x - p.x) : a;
    ctx.fillStyle = shade(color); ctx.beginPath(); ctx.arc(p.x, p.y - 2.5 * S, 1.8 * S, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.9 * S; ctx.beginPath(); ctx.moveTo(p.x, p.y - 2.5 * S); ctx.lineTo(p.x + Math.cos(aim) * 4.5 * S, p.y - 2.5 * S + Math.sin(aim) * 4.5 * S); ctx.stroke();
    hpBar({ x: p.x, y: p.y + 2.5 * S }, v.hp / v.maxHp, 7 * S);
  }

  function drawBomber(v, color) {
    const S = view.S, g0 = proj(v.x, v.y), p = proj(v.x, v.y, 26);
    shadow(g0, 3 * S, 1.5 * S);
    const a = screenAngle(v.heading || 0);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 4.5 * S, 1.1 * S, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1 * S, 0); ctx.lineTo(-1 * S, -5 * S); ctx.lineTo(-2.4 * S, -5 * S); ctx.lineTo(-1.2 * S, 0); ctx.lineTo(-2.4 * S, 5 * S); ctx.lineTo(-1 * S, 5 * S); ctx.fill();
    ctx.fillStyle = shade(color); ctx.fillRect(-4.6 * S, -2 * S, 1.3 * S, 4 * S);
    ctx.restore();
    hpBar({ x: p.x, y: p.y + 4 * S }, v.hp / v.maxHp, 7 * S);
  }

  function truckPos(t) {
    // out along the road for the first half of the trip, back for the second; hidden while far away
    const ang = t.dest === 'home' ? me.homeDir : me.dir[t.dest];
    const f = t.p < 0.5 ? t.p * 2 : (1 - t.p) * 2; // 0 at home, 1 at the far end
    const r = 40 + f * 260;
    if (r > 128) return null;
    const d = BT.dirVec(ang), side = t.p < 0.5 ? 2 : -2; // drive on the right
    return { x: d.x * r - d.y * side, y: d.y * r + d.x * side, ang: t.p < 0.5 ? ang : ang + Math.PI, loaded: t.p >= 0.5 };
  }
  function drawTruck(pos, t) {
    const S = view.S, p = proj(pos.x, pos.y);
    const a = screenAngle(pos.ang);
    ctx.save(); ctx.translate(p.x, p.y - 1.2 * S); ctx.rotate(a);
    ctx.fillStyle = pos.loaded ? '#e0a83a' : '#c9c3b2'; ctx.fillRect(-3.4 * S, -1.4 * S, 4.6 * S, 2.8 * S);
    ctx.fillStyle = me.color; ctx.fillRect(1.4 * S, -1.3 * S, 2 * S, 2.6 * S);
    ctx.restore();
  }

  function workerPos(w, now) {
    const f = g.decor.fields[w.f]; const d = BT.dirVec(f.ang);
    const ph = (w.ph + (now / 1000) * w.sp) % 1; const k = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    const r = 10 + k * (f.dist - 14);
    return { x: d.x * r + Math.sin(w.ph * 40) * 3, y: d.y * r + Math.cos(w.ph * 40) * 3, carrying: ph >= 0.5, r: f.r };
  }
  function drawWorker(pos, now) {
    const S = Math.max(1.2, view.S * 0.7), p = proj(pos.x, pos.y);
    ctx.fillStyle = '#e6a33a'; ctx.fillRect(p.x - 0.8 * S, p.y - 3.4 * S, 1.6 * S, 2.2 * S);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(p.x, p.y - 4 * S, 0.9 * S, Math.PI, 0); ctx.fill();
    if (pos.carrying) { ctx.fillStyle = RCOL[pos.r]; ctx.fillRect(p.x + 0.6 * S, p.y - 3.4 * S, 1.6 * S, 1.6 * S); }
  }

  function drawFx(f) {
    const S = view.S, k = f.t / 0.6;
    if (f.k === 'shot' || f.k === 'flak') {
      if (f.t > 0.12) return;
      const a = proj(f.x1, f.y1, f.k === 'flak' ? 2 : 2), b = proj(f.x2, f.y2, f.k === 'flak' ? 26 : 2);
      ctx.strokeStyle = f.c === 'mine' ? 'rgba(255,240,150,.95)' : 'rgba(255,170,120,.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (f.k === 'flak') { ctx.fillStyle = 'rgba(90,90,90,.7)'; ctx.beginPath(); ctx.arc(b.x + 3, b.y - 2, 2.2 * S * 0.6, 0, 7); ctx.fill(); }
    } else if (f.k === 'shell') {
      const a = proj(f.x1, f.y1, 2.5), b = proj(f.x2, f.y2, 1);
      const m = Math.min(1, f.t / 0.25);
      if (m < 1) { ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * m, a.y + (b.y - a.y) * m - Math.sin(m * Math.PI) * 6, 1.2, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = `rgba(255,170,60,${1 - k})`; ctx.beginPath(); ctx.arc(b.x, b.y, 3 * S * k + 2, 0, 7); ctx.fill(); }
    } else if (f.k === 'boom') {
      const p = proj(f.x, f.y);
      ctx.fillStyle = `rgba(255,160,50,${0.9 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y - 2 * S, (2 + k * 7) * S, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(90,90,90,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x + 2 * S, p.y - (4 + k * 6) * S, (2 + k * 5) * S, 0, 7); ctx.fill();
    } else if (f.k === 'puff') {
      const p = proj(f.x, f.y);
      ctx.fillStyle = `rgba(200,200,200,${0.7 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y - 2 * S - k * 3 * S, (1 + k * 2.5) * S, 0, 7); ctx.fill();
    }
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16); const f = 0.72;
    return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`;
  }

  // ---------- main loop ----------
  function frame(now) {
    const dt = Math.min(0.25, (now - (lastTime || now)) / 1000); lastTime = now;
    if (g && !paused && !g.over) {
      acc += dt * speed;
      let evs = [];
      while (acc >= 0.1) { acc -= 0.1; evs = evs.concat(BT.advance(g, brains, 0.1)); if (g.over) break; }
      for (const d of me.defenders) if (d.moving > 0) d.moving -= dt;
      handle(evs);
    }
    if (g) {
      uiTimer -= dt;
      if (uiTimer <= 0) { uiTimer = 0.2; updatePanels(); } else updateBadges();
    }
    draw(now);
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);

  // for testing from the browser console
  BT.debug = () => ({ g, me, brains });
})();
