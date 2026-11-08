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
  // Little pictures for the four resources: same colors, very simple shapes so they read when tiny (#157).
  const RSHAPE = {
    food: '<path d="M8 5.2C5 3.4 2 5 2 9c0 3.6 2.6 6 4 6 .9 0 1.2-.5 2-.5s1.1.5 2 .5c1.4 0 4-2.4 4-6 0-4-3-5.6-6-3.8z"/><path d="M8.2 5c.1-2 1.3-3.4 3.6-3.6-.1 2.1-1.4 3.4-3.6 3.6z"/>',
    steel: '<path d="M2 2h12v3.2H10v5.6h4V14H2v-3.2h4V5.2H2z"/>',
    fuel: '<path d="M8 1.2S3 7 3 10.2a5 5 0 0 0 10 0C13 7 8 1.2 8 1.2z"/>',
    chips: '<rect x="4" y="4" width="8" height="8" rx="1.2"/><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6h2.5M1.5 10h2.5M12 6h2.5M12 10h2.5" fill="none" stroke="' + '#COL#' + '" stroke-width="1.7" stroke-linecap="round"/>',
  };
  const ricon = (r, size = 14) => `<svg class="ricon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" fill="${RCOL[r]}" stroke="rgba(10,25,45,.55)" stroke-width=".7" stroke-linejoin="round">${RSHAPE[r].replace('#COL#', RCOL[r])}</svg>`;
  BT.ricon = ricon;
  const iconImgs = {};
  const iconImg = (r) => iconImgs[r] || (iconImgs[r] = Object.assign(new Image(), { src: 'data:image/svg+xml,' + encodeURIComponent(ricon(r, 32).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) }));

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
  // The city view stays still (Michael, Nov 7, 2026, #127). Turning with the phone is kept in the code
  // for a later try: add ?turn to the address.
  const setTurn1 = () => {}, setTurn2 = () => {};
  if (new URLSearchParams(location.search).has('turn')) setTimeout(() => setTurnMode(true), 0);
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

  // Full screen hides the browser's address bar (Android; iPhones don't allow it for web pages).
  const canFull = !!(document.documentElement.requestFullscreen);
  document.querySelectorAll('.btn-full').forEach((b) => {
    b.hidden = !canFull;
    b.onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); try { await screen.orientation.lock('landscape'); } catch (e) {} }
      } catch (e) { toast("This browser can't go full screen."); }
    };
  });
  document.addEventListener('fullscreenchange', () => { document.querySelectorAll('.btn-full').forEach((b) => (b.textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen')); setTimeout(resize, 200); });
  $('#btn-start').onclick = () => newGame();
  $('#btn-again').onclick = () => { $('#end').hidden = true; $('#start').hidden = false; };
  $('#btn-options').onclick = () => { paused = true; $('#options').hidden = false; };
  $('#btn-resume').onclick = () => { $('#options').hidden = true; paused = false; };
  $('#btn-quit').onclick = () => { $('#options').hidden = true; $('#start').hidden = false; };
  const feedback = () => {
    const where = g && !g.over ? `${players} players, ${Math.floor(g.timeLeft / 60)}:${String(Math.floor(g.timeLeft % 60)).padStart(2, '0')} left, view ${turnMode ? 'turns' : 'still'}, screen ${innerWidth}x${innerHeight}` : 'start screen';
    OHFeedback.open({ app: 'Boomtown', version: '0.4.2', where });
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
  };
  // Left: trucks and defenses. Right: the army. (Michael's layout, Nov 7, 2026.)
  const LEFT = [
    { key: 'truck', name: 'Trucks', send: 'truck', buy: 'truck' },
    { key: 'ag', name: 'Ground turret', buy: 'ag', place: true },
    { key: 'aa', name: 'Air turret', buy: 'aa', place: true },
  ];
  const RIGHT = [
    { key: 'inf', name: 'Infantry', send: 'inf', buy: 'inf' },
    { key: 'tank', name: 'Tanks', send: 'tank', buy: 'tank' },
    { key: 'bomb', name: 'Bombers', send: 'bomb', buy: 'bomb' },
  ];
  const UNITS = LEFT.concat(RIGHT);
  const BUILD = [
    { key: 'housing', name: 'Housing', tip: '+60 population' },
    { key: 'workshop', name: 'Workshop', tip: '+25% worker speed' },
    { key: 'depot', name: 'Depot', tip: '+2 trucks, +15% speed' },
    { key: 'barracks', name: 'Barracks', tip: '+2 defenders, +20% respawn speed' },
  ];
  const UNIT_WORDS = { truck: ['truck', 'trucks'], inf: ['infantry', 'infantry'], tank: ['tank', 'tanks'], bomb: ['bomber', 'bombers'] };

  function costHTML(cost, p) {
    if (!cost) return '';
    return RES.filter((r) => cost[r]).map((r) => `<span class="${p && p.stock[r] < cost[r] ? 'short' : ''}">${ricon(r, 12)}${cost[r]}</span>`).join('');
  }

  function rowHTML(it) {
    return `<div class="row" data-key="${it.key}" ${it.send ? `data-send="${it.send}"` : ''}>
        <div class="ico">${ICONS[it.key]}</div>
        <div class="count" data-count>0</div>
        <button class="plus" data-buy="${it.buy}" aria-label="Buy ${it.name}">+</button>
        <div class="name">${it.name}</div>
        <div class="cost" data-cost></div>
      </div>`;
  }

  function buildPanels() {
    $('#left').innerHTML = LEFT.map(rowHTML).join('');
    $('#right').innerHTML = RIGHT.map(rowHTML).join('');
    $('#bottom').innerHTML = RES.map((r) => `<div class="res ${me.rich.includes(r) ? 'rich' : ''}" data-res="${r}">${ricon(r, 20)}<div><div class="v">0</div><div class="r">${C.resourceNames[r]}</div></div></div>`).join('');

    document.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = b.dataset.buy;
      if (item === 'ag' || item === 'aa') {
        if (!g.canAfford(me, g.costOf(me, item))) return toast('Not enough ' + g.missing(me, g.costOf(me, item)).map((r) => C.resourceNames[r]).join(' and '), 'bad');
        return setMode(mode && mode.item === item ? null : { kind: 'place', item });
      }
      const r = g.buy(me, item); if (!r.ok) toast(r.msg, 'bad');
    }));
    document.querySelectorAll('[data-send]').forEach((row) => row.addEventListener('pointerdown', (e) => { if (!e.target.closest('.plus')) startDrag(e, row.dataset.send); }));
  }

  function updatePanels() {
    refreshPopover();
    for (const it of UNITS) {
      const row = document.querySelector(`[data-key="${it.key}"]`);
      let c;
      if (it.key === 'truck') { const busy = me.trucks.length - g.idleTrucks(me).length; c = `${g.idleTrucks(me).length}${busy ? `<small> +${busy} out</small>` : ''}`; }
      else if (it.place) c = me.turrets.filter((t) => t.type === it.key).length;
      else c = me.army[it.key];
      row.querySelector('[data-count]').innerHTML = c;
      const cost = g.costOf(me, it.buy);
      row.querySelector('[data-cost]').innerHTML = costHTML(cost, me) + (it.key === 'inf' ? '<span style="opacity:.7">x5</span>' : '');
      row.querySelector('.plus').classList.toggle('no', !g.canAfford(me, cost));
      row.classList.toggle('selected', !!(mode && mode.kind === 'place' && mode.item === it.key));
      row.classList.toggle('dragging', !!(drag && drag.moved && drag.item === it.send));
    }
    const boost = (1 + C.workshopBoost * g.count(me, 'workshop')) * (g.finalPush ? C.finalIncomeBoost : 1);
    for (const r of RES) {
      const el = document.querySelector(`[data-res="${r}"]`);
      el.querySelector('.v').textContent = Math.floor(me.stock[r]);
      el.querySelector('.r').textContent = C.resourceNames[r] + (me.rich.includes(r) ? ` +${(C.richRate * boost).toFixed(1)}/s` : ' (trade)');
    }
    const tl = g.timeLeft, m = Math.floor(tl / 60), s = Math.floor(tl % 60);
    $('#clock').textContent = `${m}:${String(s).padStart(2, '0')}`;
    $('#clock').classList.toggle('final', g.finalPush);
    const ph = $('#phase');
    if (g.peace) { ph.className = 'chip peace'; ph.textContent = `Peace ${Math.ceil(C.peaceSeconds - g.t)}s`; }
    else if (g.finalPush) { ph.className = 'chip final'; ph.textContent = 'Final push!'; }
    else { ph.className = 'chip'; ph.textContent = 'Open war'; }
    const rk = g.rankOf(me);
    $('#me').innerHTML = `<b>${ordinal(rk)}</b> &middot; ${Math.floor(me.pop)} people <span class="cap">/ room for ${g.popCap(me)}</span>`;
    updateBadges();
  }
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');

  // ---------- player circles: small at the edge, growing when you drag something onto them ----------
  function buildBadges() {
    const wrap = $('#badges');
    wrap.innerHTML = '';
    const make = (pid, color, label, inner) => {
      const el = document.createElement('div');
      el.className = 'badge' + (pid === 'home' ? ' home' : ''); el.dataset.pid = pid;
      el.innerHTML = `<div class="disc" style="background:${color}">
          <svg class="ring" viewBox="0 0 40 40"><circle class="cd" cx="20" cy="20" r="18" fill="none" stroke="#ff7a6a" stroke-width="4" stroke-dasharray="113.1" stroke-dashoffset="113.1"/></svg>
          <span class="rk">${inner}</span>
          <div class="drop"><b>${label}</b><span class="what"></span><span class="info"></span></div>
        </div><div class="lbl">${label}</div>`;
      el.querySelector('.disc').addEventListener('click', (e) => onBadgeTap(e, pid === 'home' ? 'home' : g.players[pid]));
      wrap.appendChild(el);
    };
    for (const q of g.players) if (q !== me) make(q.id, q.color, q.name, '1');
    make('home', '#6b5a3a', 'Countryside', '&#x2691;');
  }

  function badgePos(ang) {
    const a = ang - viewAngle;
    const dx = Math.sin(a), dy = -Math.cos(a) * TILT;
    const r = view.badgeRect, inset = 22;
    const hx = r.w / 2 - inset, hy = r.h / 2 - inset;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const t = Math.min(Math.abs(dx) > 1e-6 ? hx / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? hy / Math.abs(dy) : 1e9);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  function updateBadges() {
    const dragging = drag && drag.moved;
    for (const el of document.querySelectorAll('.badge')) {
      const pid = el.dataset.pid, home = pid === 'home';
      const q = home ? null : g.players[+pid];
      const pos = badgePos(home ? me.homeDir : me.dir[q.id]);
      el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
      const over = dragging && dragOver === (home ? 'home' : q.id);
      // the countryside circle only matters while you're dragging a truck
      el.classList.toggle('hidden', home && !(dragging && drag.item === 'truck') && g.trucksTo(me, 'home') === 0);
      el.classList.toggle('dim', !!(dragging && home && drag.item !== 'truck'));
      el.classList.toggle('big', !!over);
      // a grown circle stays fully on screen: it opens toward the middle
      const disc = el.querySelector('.disc');
      if (over) {
        const R = 48, br = view.badgeRect;
        const cx = Math.min(br.x + br.w - R - 4, Math.max(br.x + R + 4, pos.x)), cy = Math.min(br.y + br.h - R - 4, Math.max(br.y + R + 4, pos.y));
        disc.style.left = (cx - pos.x - R) + 'px'; disc.style.top = (cy - pos.y - R) + 'px';
      } else { disc.style.left = ''; disc.style.top = ''; }
      el.classList.toggle('flip', pos.y > view.badgeRect.y + view.badgeRect.h / 2);
      if (over) {
        const n = drag.item === 'truck' ? 1 : me.army[drag.item];
        const w = UNIT_WORDS[drag.item][n === 1 ? 0 : 1];
        el.querySelector('.what').textContent = `Drop ${n} ${w}`;
        let info = '';
        if (!home) {
          const cd = g.cooldownLeft(me, q);
          if (drag.item === 'truck') info = cd > 0 ? `Trade cut ${Math.ceil(cd)}s` : g.trucksTo(q, me.id) > 0 ? 'Makes a trade route!' : `${q.rich.map((r) => C.resourceNames[r]).join(' + ')}`;
          else info = g.peace ? 'Peace time' : (g.trucksTo(me, q.id) || g.trucksTo(q, me.id)) ? 'Cuts your trade' : `${ordinal(g.rankOf(q))} place`;
        } else info = 'Slow, what you lack';
        el.querySelector('.info').textContent = info;
      }
      if (home) continue;
      const rk = g.rankOf(q);
      el.querySelector('.rk').textContent = rk;
      const cd = g.cooldownLeft(me, q);
      el.querySelector('.cd').setAttribute('stroke-dashoffset', String(113.1 * (1 - cd / C.convoy.cooldown)));
      el.classList.toggle('route', g.tradeRoute(me, q));
    }
  }

  function onBadgeTap(e, q) {
    e.stopPropagation();
    if (q === 'home') {
      return openPopover(e, `<h3>Countryside</h3><p>Trucks dragged here bring back what you lack, but slowly. Another player is faster, and a trade route (trucks both ways) is fastest.</p>`,
        [['Bring a truck home', () => res(g.recallTruck(me, 'home')), !g.trucksTo(me, 'home')]]);
    }
    const mine = g.trucksTo(me, q.id), theirs = g.trucksTo(q, me.id), cd = g.cooldownLeft(me, q);
    const brain = brains.find((b) => b.p === q);
    openPopover(e, `<h3>${q.name} &middot; ${ordinal(g.rankOf(q))}</h3>
      <p>Rich in ${q.rich.map((r) => `<b style="color:${RCOL[r]}">${ricon(r, 13)} ${C.resourceNames[r]}</b>`).join(' and ')}.</p>
      <p>Your trucks to them: ${mine}. Theirs to you: ${theirs}.${mine && theirs ? ' <b>Trade route:</b> trucks run fast both ways.' : ''}</p>
      ${cd > 0 ? `<p style="color:#ff9d8f">Trade is cut for ${Math.ceil(cd)} more seconds.</p>` : ''}
      <p style="opacity:.65">To send something, drag it from the side onto this circle. In the real game you'd ask ${q.name} out loud for a truck.</p>`,
      [[`Ask ${q.name} for a truck`, () => { const r = brain.askedForTruck(me); toast(r.say, r.yes ? 'good' : ''); }, false],
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
    if (q === 'home') return;
    const had = g.trucksTo(me, q.id) + g.trucksTo(q, me.id);
    const r = g.sendArmy(me, item, q.id);
    if (!r.ok) return toast(r.msg, 'bad');
    toast(`${r.n} ${UNIT_WORDS[item][r.n === 1 ? 0 : 1]} on their way to ${q.name}.${had ? ' Trade with them is cut.' : ''}`);
  }

  // ---------- drag to send (the only way to send; let go anywhere else to cancel) ----------
  let drag = null, dragOver = null;
  function startDrag(e, item) {
    e.preventDefault();
    drag = { item, x0: e.clientX, y0: e.clientY, moved: false };
    const n = item === 'truck' ? g.idleTrucks(me).length : me.army[item];
    const gh = $('#ghost');
    gh.innerHTML = `<span class="gi">${ICONS[item]}</span>${item === 'truck' ? '1 truck' : `${n} ${UNIT_WORDS[item][n === 1 ? 0 : 1]}`}`;
    gh.hidden = true;
    drag.empty = n === 0;
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
      drag.moved = true; closePopover();
      if (drag.empty) { toast(drag.item === 'truck' ? 'No free trucks. Buy one with +, or bring one home.' : 'None to send yet. Buy some with +.', 'bad'); drag = null; return; }
      $('#ghost').hidden = false; document.body.classList.add('dragging');
    }
    if (!drag.moved) return;
    const gh = $('#ghost'); gh.style.left = e.clientX + 'px'; gh.style.top = e.clientY + 'px';
    dragOver = dropTarget(e.clientX, e.clientY);
    gh.style.visibility = dragOver != null ? 'hidden' : 'visible'; // the open circle shows it instead
    updateBadges();
  });
  const endDrag = (e, cancel) => {
    if (!drag) return;
    const target = !cancel && drag.moved ? dropTarget(e.clientX, e.clientY) : null;
    const d = drag; drag = null; dragOver = null; $('#ghost').hidden = true; $('#ghost').style.visibility = ''; document.body.classList.remove('dragging');
    if (!d.moved) { toast(d.item === 'truck' ? 'Drag a truck onto a player, or onto the Countryside.' : 'Drag them onto a player to send them.'); return; }
    if (target == null) { updateBadges(); return; } // let go on no player: cancelled
    sendTo(d.item, target === 'home' ? 'home' : g.players[target]);
    updateBadges();
  };
  window.addEventListener('pointerup', (e) => endDrag(e, false));
  window.addEventListener('pointercancel', (e) => endDrag(e, true));

  // the circle under the finger (generous, so it's easy to hit)
  function dropTarget(x, y) {
    let best = null, bd = 56;
    for (const el of document.querySelectorAll('.badge')) {
      if (el.classList.contains('hidden') && !(drag && drag.item === 'truck')) continue;
      if (el.dataset.pid === 'home' && !(drag && drag.item === 'truck')) continue;
      const bx = parseFloat(el.style.left), by = parseFloat(el.style.top);
      const d = Math.hypot(bx - x, by - y);
      if (d < bd) { bd = d; best = el.dataset.pid === 'home' ? 'home' : +el.dataset.pid; }
    }
    return best;
  }

  // ---------- modes and tapping the city ----------
  function setMode(m) {
    mode = m; closePopover();
    if (!m) return setHint(null);
    if (m.kind === 'place') setHint(`Tap in the yellow ring, on your enemies' side.`);
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
    // Press on the city: the block under your finger lights up and follows it; let go to open its menu (#158).
    pick = { lot: nearestLot(w), id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!g) return;
    const lot = nearestLot(unproject(e.clientX, e.clientY));
    if (pick && pick.id === e.pointerId) pick.lot = lot;
    else if (e.pointerType === 'mouse' && !e.buttons) hoverLot = lot; // a mouse shows the block before you click
  });
  canvas.addEventListener('pointerleave', () => { hoverLot = -1; });
  const endPick = (e, cancel) => {
    if (!pick || pick.id !== e.pointerId) return;
    const lot = pick.lot; pick = null;
    if (cancel || lot < 0 || !g || paused) return;
    me.buildings[lot] ? buildingPopover(lot) : buildPopover(lot);
  };
  canvas.addEventListener('pointerup', (e) => endPick(e, false));
  canvas.addEventListener('pointercancel', (e) => endPick(e, true));
  let pick = null, hoverLot = -1, selLot = -1;
  const litLot = () => (pick ? pick.lot : selLot >= 0 ? selLot : hoverLot);
  function lotAnchor(lot) { const L = BT.LOTS[lot], q = proj(L.x, L.y); return { clientX: q.x, clientY: q.y, lot }; }
  function nearestLot(w) {
    let best = -1, bd = 6.5;
    BT.LOTS.forEach((L, i) => { const d = Math.max(Math.abs(L.x - w.x), Math.abs(L.y - (w.y - 2))); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function buildPopover(lot) {
    const e = lotAnchor(lot);
    openPopover(e, `<h3>Build here</h3>`, BUILD.map((b) => {
      const cost = () => g.costOf(me, b.key);
      return [() => `<span class="bi">${ICONS[b.key]}</span><span><b>${b.name}</b> ${costHTML(cost(), me)}<br><small>${b.tip}</small></span>`, () => res(g.build(me, b.key, lot)), () => !g.canAfford(me, cost())];
    }));
  }
  function buildingPopover(lot) {
    const e = lotAnchor(lot), b = me.buildings[lot];
    const names = { housing: 'Housing', workshop: 'Workshop', depot: 'Depot', barracks: 'Barracks' };
    if (b.rubble) {
      const cost = () => g.rebuildCost(me, lot);
      return openPopover(e, `<h3>Rubble</h3><p>This ${names[b.type]} was wrecked. Rebuild it for half price.</p>`, [[() => `Rebuild &nbsp;${costHTML(cost(), me)}`, () => res(g.rebuild(me, lot)), () => !g.canAfford(me, cost())]]);
    }
    if (b.type === 'housing') {
      const cost = () => g.costOf(me, 'housing');
      const top = b.level >= C.housingMaxLevel;
      return openPopover(e, `<h3>Housing, level ${b.level}</h3><p>Room for ${C.housingCap * b.level} people.${top ? ' As tall as it gets.' : ' Each level adds room for 60 more.'}</p>`,
        top ? [] : [[() => `Build taller &nbsp;${costHTML(cost(), me)}`, () => res(g.raise(me, lot)), () => !g.canAfford(me, cost())]]);
    }
    openPopover(e, `<h3>${names[b.type]}</h3><p>${BUILD.find((x) => x.key === b.type).tip}</p>`, []);
  }

  function openUpgrades(e) {
    const rows = Object.entries(C.upgrades).map(([path, u]) => {
      const cost = () => g.upgradeCost(me, path);
      const pips = [0, 1, 2].map((i) => `<i class="${i < me.up[path] ? 'on' : ''}"></i>`).join('');
      return [() => `${u.name}<span class="tiers">${pips}</span><br><span class="cost">${cost() ? costHTML(cost(), me) : 'All done'}</span>`, () => { res(g.upgrade(me, path)); openUpgrades(e); }, () => !cost() || !g.canAfford(me, cost())];
    });
    openPopover(e, `<h3>Upgrades</h3><p>Each tier adds 25%. Unit upgrades help your defenders too.</p>`, rows, true);
  }
  $('#btn-up').onclick = (e) => { if (g) openUpgrades(e); };

  function openPopover(e, html, actions, keep) {
    const p = $('#popover');
    p.classList.toggle('grid', actions.length >= 3);
    p.innerHTML = `<button class="x" data-close aria-label="Close">&times;</button>` + html + (actions.length ? `<div class="acts">${actions.map((a, i) => `<button data-i="${i}">${val(a[0])}</button>`).join('')}</div>` : '');
    popActions = actions; refreshPopover();
    p.hidden = false;
    selLot = e.lot != null ? e.lot : -1;
    const W2 = window.innerWidth, top = $('#top').offsetHeight + 4, bottom = window.innerHeight - $('#bottom').offsetHeight - 4;
    const pw = p.offsetWidth, ph = p.offsetHeight;
    // beside the block you picked (on the side with more room), so it stays in view where possible
    let x = e.lot != null ? (e.clientX < W2 / 2 ? e.clientX + 40 : e.clientX - 40 - pw) : e.clientX - pw / 2;
    x = Math.min(W2 - pw - 6, Math.max(6, x));
    let y = Math.min(bottom - ph, Math.max(top, e.lot != null ? e.clientY - ph / 2 : e.clientY + 16));
    if (y < 4) y = 4;
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.querySelectorAll('[data-i]').forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); if (!keep) closePopover(); actions[+b.dataset.i][1](); });
    p.querySelector('[data-close]').onclick = closePopover;
  }
  function closePopover() { $('#popover').hidden = true; selLot = -1; popActions = null; }
  // Menu buttons follow your resources while the menu is open: one greys out or lights up the moment you can or can't afford it.
  let popActions = null;
  const val = (v) => (typeof v === 'function' ? v() : v);
  function refreshPopover() {
    if (!popActions || $('#popover').hidden) return;
    $('#popover').querySelectorAll('[data-i]').forEach((btn) => {
      const a = popActions[+btn.dataset.i], off = !!val(a[2]), html = val(a[0]);
      if (btn.disabled !== off) btn.disabled = off;
      if (btn.dataset.h !== html) { btn.dataset.h = html; btn.innerHTML = html; }
    });
  }

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
    const lw = $('#left').offsetWidth, rw = $('#right').offsetWidth, th = $('#top').offsetHeight, bh = $('#bottom').offsetHeight;
    // the map fills the whole screen; the side panels float over it
    view.badgeRect = { x: lw, y: th, w: W - lw - rw, h: H - th - bh };
    view.rect = view.badgeRect;
    view.cx = W / 2; view.cy = th + (H - th - bh) / 2 + 4;
    // sized so the city fills the space; the turret ring's outer edge may tuck under the bars
    view.S = Math.min((W - lw - rw) / (2 * 56), (H - th - bh) / (2 * 50 * TILT));
  }
  window.addEventListener('resize', () => { resize(); if (g) updateBadges(); });

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

  // Decoration: fields, workers, trees, cars and people on the pavements (none of it changes the rules).
  const STREETS = [-32.5, -19.5, -6.5, 6.5, 19.5, 32.5];
  const CITY_H = 34.5, CITY_CORNER = 9; // half the width of the square city (#159), and how round its corners are
  const PARKS = [[-26, -26], [26, -26], [-26, 26], [26, 26]]; // the corner blocks are little parks, not lots
  function seeded(seed) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  function streetSpan(v) { return CITY_H - 1.7; }
  function makeDecor(p) {
    const rnd = seeded(12345 + Math.floor(Math.random() * 1000));
    const fields = p.rich.map((r, i) => ({ r, ang: p.homeDir + (i ? -0.9 : 0.9), dist: 55 })); // close enough to always be on screen
    const workers = [];
    fields.forEach((f, i) => { for (let k = 0; k < 3; k++) workers.push({ f: i, ph: rnd(), sp: 0.035 + rnd() * 0.02 }); });
    const trees = [];
    for (let k = 0; k < 140; k++) {
      const a = rnd() * Math.PI * 2, r = 46 + rnd() * 90;
      const x = Math.sin(a) * r, y = -Math.cos(a) * r;
      if (Math.abs(x - 6.5) < 6 || Math.abs(y - 6.5) < 6) continue; // keep the highways clear
      if (Math.max(Math.abs(x), Math.abs(y)) < CITY_H + 4) continue; // and the city
      if (fields.some((f) => { const d = BT.dirVec(f.ang); return Math.hypot(x - d.x * f.dist, y - d.y * f.dist) < 16; })) continue;
      trees.push({ x, y, s: 0.8 + rnd() * 0.6, tone: rnd() });
    }
    const cars = [];
    for (let k = 0; k < 7; k++) cars.push({ axis: rnd() < 0.5 ? 'x' : 'y', line: STREETS[(rnd() * STREETS.length) | 0], t: rnd(), sp: (0.04 + rnd() * 0.03) * (rnd() < 0.5 ? 1 : -1), col: ['#c0392b', '#e8e2d0', '#2c3e50', '#d4a017', '#5d8aa8', '#7a7a7a', '#3b7a57'][k] });
    const walkers = [];
    for (let k = 0; k < 40; k++) walkers.push({ axis: rnd() < 0.5 ? 'x' : 'y', line: STREETS[(rnd() * STREETS.length) | 0] + (rnd() < 0.5 ? -2.6 : 2.6), t: rnd(), sp: (0.008 + rnd() * 0.008) * (rnd() < 0.5 ? 1 : -1), col: ['#c0392b', '#2f7fd8', '#e0a83a', '#6c3483', '#2fa65a', '#e8e2d0', '#555'][k % 7] });
    return { fields, workers, trees, cars, walkers };
  }
  function onStreet(o, now, speed) {
    const span = streetSpan(o.line);
    const t = ((o.t + (now / 1000) * o.sp * speed) % 1 + 1) % 1;
    const along = -span + t * 2 * span;
    return o.axis === 'x' ? { x: o.line, y: along, dir: o.sp > 0 ? Math.PI : 0 } : { x: along, y: o.line, dir: o.sp > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  function ellipseRing(r, style, width, dash) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const q = proj(Math.sin(a) * r, -Math.cos(a) * r); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  }
  function fillSquare(h, rc, style, ox = 0, oy = 0) {
    // a rounded square on the ground, drawn through the tilted view
    ctx.beginPath(); let first = true;
    for (const [cx, cy, a0] of [[h - rc, -h + rc, -Math.PI / 2], [h - rc, h - rc, 0], [-h + rc, h - rc, Math.PI / 2], [-h + rc, -h + rc, Math.PI]]) {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i / 6) * (Math.PI / 2);
        const q = proj(ox + cx + Math.cos(a) * rc, oy + cy + Math.sin(a) * rc);
        first ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y); first = false;
      }
    }
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
  }
  function lotOutline(lot, k, style, width, fill) {
    const L = BT.LOTS[lot], h = 5.2 * k;
    ctx.beginPath();
    [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([dx, dy], i) => { const q = proj(L.x + dx, L.y + dy); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function fillRing(r, style) {
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; const q = proj(Math.sin(a) * r, -Math.cos(a) * r); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.fillStyle = style; ctx.fill();
  }
  function line(x1, y1, x2, y2, style, width, dash) {
    const a = proj(x1, y1), b = proj(x2, y2);
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }

  function draw(now) {
    const S = view.S;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = PAL.grass; ctx.fillRect(0, 0, W, H);
    if (!g) return;
    // soft patches in the grass
    fillRing(140, PAL.grass2); fillRing(110, PAL.grass);
    // highways out of town
    ctx.lineCap = 'butt';
    for (const [x1, y1, x2, y2] of [[6.5, -160, 6.5, 160], [-160, 6.5, 160, 6.5]]) {
      line(x1, y1, x2, y2, PAL.road, 5 * S); line(x1, y1, x2, y2, PAL.roadLine, Math.max(1, S * 0.3), [S * 2, S * 2]);
    }
    for (const f of g.decor.fields) drawField(f, now);
    // the city: pavement, then streets on the grid
    fillSquare(CITY_H + 1.5, CITY_CORNER + 1.5, '#8f8a7c'); fillSquare(CITY_H, CITY_CORNER, PAL.plaza);
    for (const [px, py] of PARKS) fillSquare(4.8, 1.5, '#6fae4f', px, py);
    for (const v of STREETS) {
      const sp = streetSpan(v);
      line(v, -sp, v, sp, PAL.road, 3.4 * S); line(-sp, v, sp, v, PAL.road, 3.4 * S);
    }
    for (const v of STREETS) {
      const sp = streetSpan(v);
      line(v, -sp, v, sp, 'rgba(230,220,170,.55)', Math.max(1, S * 0.18), [S * 1.5, S * 1.5]);
      line(-sp, v, sp, v, 'rgba(230,220,170,.55)', Math.max(1, S * 0.18), [S * 1.5, S * 1.5]);
    }
    if (mode && mode.kind === 'place') { ellipseRing(C.turretZone[0], 'rgba(255,211,77,.95)', 2, [6, 5]); ellipseRing(C.turretZone[1], 'rgba(255,211,77,.95)', 2, [6, 5]); }

    // everything standing up, back to front
    const items = [];
    me.buildings.forEach((b, i) => items.push({ y: BT.LOTS[i].y, x: BT.LOTS[i].x, f: () => drawBuilding(b, i, now) }));
    items.push({ x: 0, y: 0, f: () => drawHall(now) });
    for (const [px, py] of PARKS) for (const [dx, dy, sc] of [[-2, -1.5, 0.8], [2, 1.5, 0.95]]) items.push({ x: px + dx, y: py + dy, f: () => drawTree({ x: px + dx, y: py + dy, s: sc, tone: 0.4 }) });
    const lit = litLot();
    if (lit >= 0) {
      // the picked block: a yellow outline that grows a little and pulses, drawn under and again over the building
      const k = 1.12 + Math.sin(now / 160) * 0.05;
      lotOutline(lit, k, 'rgba(255,211,77,.95)', Math.max(2, view.S * 0.45), 'rgba(255,211,77,.28)');
      const L = BT.LOTS[lit];
      items.push({ x: L.x, y: L.y + 0.01, f: () => lotOutline(lit, k, 'rgba(255,211,77,.95)', Math.max(2, view.S * 0.45)) });
    }
    for (const f of g.decor.fields) { const d = BT.dirVec(f.ang); items.push({ x: d.x * f.dist, y: d.y * f.dist, f: () => drawFieldSign(f) }); }
    for (const t of g.decor.trees) items.push({ x: t.x, y: t.y, f: () => drawTree(t) });
    for (const t of me.turrets) items.push({ x: t.x, y: t.y, f: () => drawTurret(t) });
    for (const d of me.defenders) items.push({ x: d.x, y: d.y, f: () => drawSoldier(d, me.color, true, now) });
    for (const v of me.invaders) if (v.kind !== 'bomb') items.push({ x: v.x, y: v.y, f: () => v.kind === 'inf' ? drawSoldier(v, g.players[v.from].color, false, now) : drawTank(v, g.players[v.from].color) });
    for (const t of me.trucks) if (t.dest !== null) { const pos = truckPos(t); if (pos) items.push({ x: pos.x, y: pos.y, f: () => drawTruck(pos, t) }); }
    for (const w of g.decor.workers) { const pos = workerPos(w, now); items.push({ x: pos.x, y: pos.y, f: () => drawWorker(pos, now) }); }
    const calm = me.invaders.length === 0;
    for (const c of g.decor.cars) { const pos = onStreet(c, now, calm ? 1 : 0.2); pos.x += c.axis === 'x' ? (c.sp > 0 ? 0.9 : -0.9) : 0; pos.y += c.axis === 'y' ? (c.sp > 0 ? -0.9 : 0.9) : 0; items.push({ x: pos.x, y: pos.y, f: () => drawCar(pos, c.col) }); }
    const people = Math.min(g.decor.walkers.length, Math.round(me.pop / 22));
    for (let k = 0; k < people; k++) { const w = g.decor.walkers[k]; const pos = onStreet(w, now, calm ? 1 : 3); items.push({ x: pos.x, y: pos.y, f: () => drawWalker(pos, w, now) }); }
    const c = Math.cos(viewAngle), s = Math.sin(viewAngle);
    items.sort((a, b) => (a.y * c - a.x * s) - (b.y * c - b.x * s));
    for (const it of items) it.f();
    for (const v of me.invaders) if (v.kind === 'bomb') drawBomber(v, g.players[v.from].color);
    for (const f of me.fx) drawFx(f);
  }

  function drawTree(t) {
    const S = view.S * t.s, p = proj(t.x, t.y);
    shadow({ x: p.x + 2 * S, y: p.y + 0.5 * S }, 2.6 * S, 1.2 * S);
    ctx.fillStyle = '#5b4a33'; ctx.fillRect(p.x - 0.35 * S, p.y - 2.2 * S, 0.7 * S, 2.2 * S);
    const g1 = t.tone < 0.5 ? '#3f6e35' : '#4c7d3a', g2 = t.tone < 0.5 ? '#558a43' : '#62994a';
    ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(p.x, p.y - 3.4 * S, 2.2 * S, 0, 7); ctx.fill();
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x - 0.6 * S, p.y - 4.1 * S, 1.4 * S, 0, 7); ctx.fill();
  }
  function drawCar(pos, col) {
    const S = view.S, p = proj(pos.x, pos.y);
    const a = screenAngle(pos.dir);
    ctx.save(); ctx.translate(p.x, p.y - 0.6 * S); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-1.5 * S, -0.6 * S, 3.2 * S, 1.5 * S);
    ctx.fillStyle = col; ctx.fillRect(-1.6 * S, -0.75 * S, 3.2 * S, 1.5 * S);
    ctx.fillStyle = 'rgba(40,60,80,.85)'; ctx.fillRect(0.2 * S, -0.6 * S, 0.9 * S, 1.2 * S);
    ctx.restore();
  }
  function drawWalker(pos, w, now) {
    const S = view.S * 0.55, p = proj(pos.x, pos.y);
    const step = Math.sin(now / 160 + w.t * 50) * 0.4 * S;
    ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, 0.45 * S);
    ctx.beginPath(); ctx.moveTo(p.x - 0.3 * S, p.y - 1.4 * S); ctx.lineTo(p.x - 0.3 * S - step, p.y); ctx.moveTo(p.x + 0.3 * S, p.y - 1.4 * S); ctx.lineTo(p.x + 0.3 * S + step, p.y); ctx.stroke();
    ctx.fillStyle = w.col; ctx.fillRect(p.x - 0.7 * S, p.y - 3.2 * S, 1.4 * S, 1.9 * S);
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.arc(p.x, p.y - 3.8 * S, 0.65 * S, 0, 7); ctx.fill();
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
  function drawFieldSign(f) {
    // a little sign on a post with the resource's picture, so it's clear what this field gathers
    const d = BT.dirVec(f.ang), S = view.S, p = proj(d.x * f.dist, d.y * f.dist);
    const img = iconImg(f.r), r = Math.min(12, Math.max(8, 3.2 * S)), sy = p.y - 8 * S - r;
    ctx.strokeStyle = '#5a4630'; ctx.lineWidth = Math.max(1.5, S * 0.5);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, sy); ctx.stroke();
    ctx.fillStyle = 'rgba(12,28,48,.82)'; ctx.beginPath(); ctx.arc(p.x, sy, r, 0, 7); ctx.fill();
    if (img.complete) ctx.drawImage(img, p.x - r * 0.72, sy - r * 0.72, r * 1.44, r * 1.44);
  }

  function box(p, w, h, front, top, outline) {
    // a block seen from slightly above and to the left: front, a sloped roof and a shaded right side
    const S = view.S, d = w * 0.55, k = w * 0.28 * S;
    const x = p.x - (w * S) / 2, y = p.y - h * S * 0.75, fw = w * S, fh = h * S * 0.75, th = d * S * TILT;
    ctx.fillStyle = shadeCol(front, 0.72);
    ctx.beginPath(); ctx.moveTo(x + fw, y); ctx.lineTo(x + fw + k, y - th); ctx.lineTo(x + fw + k, y + fh - th); ctx.lineTo(x + fw, y + fh); ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + fw, y); ctx.lineTo(x + fw + k, y - th); ctx.lineTo(x + k, y - th); ctx.fill();
    ctx.fillStyle = front; ctx.fillRect(x, y, fw, fh);
    if (outline) { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, fw, fh); }
    return { x, y, w: fw, h: fh, topH: th, k };
  }
  function shadeCol(hex, f) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`;
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
    // trucks leave town along the highway that points most nearly their way, then drive out of sight
    const ang = t.dest === 'home' ? me.homeDir : me.dir[t.dest];
    const ax = [[0, -1], [1, 0], [0, 1], [-1, 0]][Math.round(((ang % (2 * Math.PI)) + 2 * Math.PI) / (Math.PI / 2)) % 4];
    const f = t.p < 0.5 ? t.p * 2 : (1 - t.p) * 2;
    const r = 8 + f * 360;
    if (r > 150) return null;
    const lane = t.p < 0.5 ? 1.1 : -1.1;
    const x = ax[0] ? ax[0] * r : 6.5 + lane * (ax[1] > 0 ? -1 : 1);
    const y = ax[1] ? ax[1] * r : 6.5 + lane * (ax[0] > 0 ? 1 : -1);
    const out = Math.atan2(ax[0], -ax[1]);
    return { x, y, ang: t.p < 0.5 ? out : out + Math.PI, loaded: t.p >= 0.5 };
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
