// Boomtown rules. No drawing code here: this runs the same for you and the computer cities.
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  const C = BT.CONFIG;
  const RES = C.resources;

  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Building lots: city blocks on a street grid round the town hall, nearest first.
  const LOTS = [];
  for (let gx = -2; gx <= 2; gx++) for (let gy = -2; gy <= 2; gy++) {
    const x = gx * 13, y = gy * 13;
    if ((gx || gy) && Math.hypot(x, y) <= 34) LOTS.push({ x, y });
  }
  LOTS.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  BT.LOTS = LOTS;
  BT.HALL = { x: 0, y: 0 };

  const NAMES = ['Sam', 'Priya', 'Jo', 'Mateo', 'Kenji', 'Ada', 'Ruth', 'Omar'];
  const COLORS = ['#2f7fd8', '#e0533d', '#2fa65a', '#d9a21b', '#8d5bd6', '#1fb5c9'];
  const PAIRS = [['food', 'steel'], ['fuel', 'chips'], ['food', 'fuel'], ['steel', 'chips'], ['food', 'chips'], ['steel', 'fuel']];

  // Direction from a to b in the room: 0 = straight ahead (north), clockwise, in radians.
  function bearing(a, b) { return Math.atan2(b.x - a.x, -(b.y - a.y)); }
  BT.dirVec = (ang) => ({ x: Math.sin(ang), y: -Math.cos(ang) });

  class Game {
    constructor(opts = {}) {
      const n = Math.max(3, Math.min(6, opts.players || 4));
      this.t = 0;
      this.over = false;
      this.transit = [];   // attacks on their way
      this.events = [];    // messages for the screen
      this.players = [];
      const names = shuffle(NAMES.slice());
      // Rich pairs, dealt so nobody starts with a better hand:
      // 3 players share one resource and each has one only they are rich in;
      // 4 and 6 players come in matching couples that cover all four; 5 is two couples plus one.
      let pairs;
      if (n === 3) { const r = shuffle(RES.slice()); pairs = [[r[0], r[1]], [r[0], r[2]], [r[0], r[3]]]; }
      else {
        const couples = shuffle([[PAIRS[0], PAIRS[1]], [PAIRS[2], PAIRS[3]], [PAIRS[4], PAIRS[5]]]);
        pairs = couples.slice(0, Math.floor(n / 2)).flat();
        if (n === 5) pairs.push(PAIRS.filter((x) => !pairs.includes(x))[(Math.random() * 2) | 0]);
      }
      const order = shuffle(pairs.slice(0, n));
      // Seats round the room: you at the bottom, the others spread round with a little wobble.
      for (let i = 0; i < n; i++) {
        const seat = Math.PI + (i * 2 * Math.PI) / n + (i === 0 ? 0 : rand(-0.2, 0.2));
        const p = this.makePlayer(i, i === 0 ? (opts.humanName || 'You') : names[i], COLORS[i], i === 0, order[i]);
        p.room = { x: Math.sin(seat), y: -Math.cos(seat) };
        this.players.push(p);
      }
      for (const p of this.players) {
        p.dir = {};
        for (const q of this.players) if (q !== p) p.dir[q.id] = bearing(p.room, q.room);
        p.homeDir = this.emptiestDirection(p);
      }
    }

    makePlayer(id, name, color, isHuman, rich) {
      const stock = {}; for (const r of RES) stock[r] = C.start.stock;
      const p = {
        id, name, color, isHuman, rich: rich.slice(), stock,
        pop: C.start.pop, buildings: LOTS.map(() => null),
        turrets: [], army: { inf: 0, tank: 0, bomb: 0 },
        trucks: [], up: { uHp: 0, uDmg: 0, bHp: 0, tDmg: 0 },
        defenders: [], defenderTimer: 0, invaders: [], cooldown: {}, fx: [],
        stats: { sent: 0, lost: 0 },
      };
      for (let i = 0; i < C.start.trucks; i++) p.trucks.push({ dest: null, p: 0 });
      for (let i = 0; i < C.start.housing; i++) p.buildings[i] = this.newBuilding(p, 'housing');
      for (let i = 0; i < C.defenders.base; i++) p.defenders.push(this.newDefender(p));
      return p;
    }

    // The way out of town with no player in it, for countryside convoys.
    emptiestDirection(p) {
      const angs = Object.values(p.dir).map((a) => (a + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
      let best = 0, bestGap = -1;
      for (let i = 0; i < angs.length; i++) {
        const a = angs[i], b = i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI;
        if (b - a > bestGap) { bestGap = b - a; best = (a + b) / 2; }
      }
      return best;
    }

    newBuilding(p, type) { const hp = C.buildingHp * this.mult(p.up.bHp); return { type, hp, maxHp: hp, rubble: false, level: 1 }; }
    newDefender(p) {
      const hp = C.defenders.hp * this.mult(p.up.uHp);
      return { x: rand(-6, 6), y: rand(-6, 6), hp, maxHp: hp, home: { x: rand(-8, 8), y: rand(-8, 8) }, fxCool: 0 };
    }
    mult(level) { return 1 + C.upgradeStep * level; }

    // ---- Phases and ranks ----
    get peace() { return this.t < C.peaceSeconds; }
    get finalPush() { return this.t >= C.gameSeconds - C.finalSeconds; }
    get timeLeft() { return Math.max(0, C.gameSeconds - this.t); }
    ranking() { return this.players.slice().sort((a, b) => b.pop - a.pop); }
    rankOf(p) { return this.ranking().indexOf(p) + 1; }

    // ---- Costs ----
    count(p, type) { return p.buildings.filter((b) => b && b.type === type).length; }
    housingLevels(p) { return p.buildings.reduce((a, b) => a + (b && b.type === 'housing' ? b.level : 0), 0); }
    costOf(p, item) {
      const base = C.costs[item]; const out = {};
      let m = 1;
      if (C.discounted.includes(item) && this.finalPush) m = C.finalCostDiscount;
      if (['workshop', 'depot', 'barracks'].includes(item)) m = 1 + C.buildingCostRise * this.count(p, item);
      if (item === 'housing') m = 1 + C.buildingCostRise * this.housingLevels(p);
      for (const r in base) out[r] = Math.round(base[r] * m);
      return out;
    }
    upgradeCost(p, path) {
      const lvl = p.up[path]; if (lvl >= 3) return null;
      const c = C.upgradeCosts[lvl]; const out = {};
      for (const k in c) { const r = k === 'other' ? C.upgrades[path].other : k; out[r] = (out[r] || 0) + c[k]; }
      return out;
    }
    canAfford(p, cost) { return cost && RES.every((r) => (p.stock[r] || 0) >= (cost[r] || 0)); }
    pay(p, cost) { for (const r in cost) p.stock[r] -= cost[r]; }
    missing(p, cost) { return RES.filter((r) => (p.stock[r] || 0) < (cost[r] || 0)); }

    // ---- Things players do. Each returns { ok, msg }. ----
    truckLimit(p) { return C.truckLimit + C.truckLimitPerDepot * this.count(p, 'depot'); }
    buy(p, item) {
      if (item === 'truck' && p.trucks.length >= this.truckLimit(p)) return { ok: false, msg: 'Truck yard is full. A Depot makes room for 2 more.' };
      const cost = this.costOf(p, item);
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r) => C.resourceNames[r]).join(' and ') };
      this.pay(p, cost);
      if (item === 'inf') p.army.inf += C.infSquad;
      else if (item === 'tank' || item === 'bomb') p.army[item] += 1;
      else if (item === 'truck') p.trucks.push({ dest: null, p: 0 });
      return { ok: true };
    }

    build(p, type, lot) {
      if (lot == null) lot = p.buildings.findIndex((b) => b === null);
      if (lot < 0 || p.buildings[lot]) return { ok: false, msg: 'No room left to build' };
      const cost = this.costOf(p, type);
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r) => C.resourceNames[r]).join(' and ') };
      this.pay(p, cost);
      p.buildings[lot] = this.newBuilding(p, type);
      p.buildings[lot].hp = 1; p.buildings[lot].rising = 0; // goes up over a few seconds
      return { ok: true };
    }

    // Build a Housing block one level taller.
    raise(p, lot) {
      const b = p.buildings[lot];
      if (!b || b.type !== 'housing' || b.rubble) return { ok: false, msg: 'Only standing housing can be built taller' };
      if (b.level >= C.housingMaxLevel) return { ok: false, msg: 'That block is as tall as it gets' };
      const cost = this.costOf(p, 'housing');
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r) => C.resourceNames[r]).join(' and ') };
      this.pay(p, cost);
      b.level++; b.grow = 0;
      return { ok: true };
    }

    rebuildCost(p, lot) {
      const b = p.buildings[lot]; if (!b || !b.rubble) return null;
      const base = C.costs[b.type]; const out = {};
      for (const r in base) out[r] = Math.round(base[r] * C.rebuildShare * (b.level || 1));
      return out;
    }
    rebuild(p, lot) {
      const cost = this.rebuildCost(p, lot); if (!cost) return { ok: false, msg: 'Nothing to rebuild' };
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r) => C.resourceNames[r]).join(' and ') };
      this.pay(p, cost);
      const b = p.buildings[lot]; b.rubble = false; b.hp = 1; b.rising = 0; b.maxHp = C.buildingHp * this.mult(p.up.bHp);
      return { ok: true };
    }

    placeTurret(p, type, x, y) {
      const r = Math.hypot(x, y);
      if (r < C.turretZone[0] || r > C.turretZone[1]) return { ok: false, msg: 'Turrets go on the ring around your city' };
      if (p.turrets.some((t) => Math.hypot(t.x - x, t.y - y) < 9)) return { ok: false, msg: 'Too close to another turret' };
      const cost = this.costOf(p, type);
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r2) => C.resourceNames[r2]).join(' and ') };
      this.pay(p, cost);
      const hp = C.turrets[type].hp * this.mult(p.up.bHp);
      p.turrets.push({ type, x, y, hp, maxHp: hp, aim: Math.atan2(x, -y), fxCool: 0 });
      return { ok: true };
    }

    upgrade(p, path) {
      const cost = this.upgradeCost(p, path);
      if (!cost) return { ok: false, msg: 'Already at the top tier' };
      if (!this.canAfford(p, cost)) return { ok: false, msg: 'Not enough ' + this.missing(p, cost).map((r) => C.resourceNames[r]).join(' and ') };
      this.pay(p, cost);
      p.up[path]++;
      if (path === 'bHp') { // stronger walls straight away
        const f = this.mult(p.up.bHp) / this.mult(p.up.bHp - 1);
        for (const b of p.buildings) if (b) { b.maxHp *= f; b.hp *= f; }
        for (const t of p.turrets) { t.maxHp *= f; t.hp *= f; }
      }
      if (path === 'uHp') for (const d of p.defenders) { d.maxHp *= 1.2; d.hp *= 1.2; }
      return { ok: true };
    }

    // Trucks
    trucksTo(p, dest) { return p.trucks.filter((t) => t.dest === dest).length; }
    idleTrucks(p) { return p.trucks.filter((t) => t.dest === null); }
    tradeRoute(p, q) { return this.trucksTo(p, q.id) > 0 && this.trucksTo(q, p.id) > 0; }
    cooldownLeft(p, q) { return Math.max(0, (p.cooldown[q.id] || 0) - this.t); }

    sendTruck(p, dest) {
      const idle = this.idleTrucks(p)[0];
      if (!idle) return { ok: false, msg: 'No free trucks. Build one, or bring one home.' };
      if (dest !== 'home') {
        const q = this.players[dest];
        const cd = this.cooldownLeft(p, q);
        if (cd > 0) return { ok: false, msg: `Trade with ${q.name} is cut for ${Math.ceil(cd)} more seconds` };
        this.events.push({ type: 'truck', from: p.id, to: q.id });
      }
      idle.dest = dest; idle.p = 0;
      return { ok: true };
    }

    recallTruck(p, dest) {
      const list = p.trucks.filter((t) => t.dest === dest);
      if (!list.length) return { ok: false, msg: 'No trucks on that road' };
      // the one closest to home comes back
      list.sort((a, b) => Math.abs(0.5 - b.p) - Math.abs(0.5 - a.p));
      list[0].dest = null; list[0].p = 0;
      return { ok: true };
    }

    tripTime(p, dest) {
      let base;
      if (dest === 'home') base = C.convoy.homeTrip;
      else base = this.trucksTo(this.players[dest], p.id) > 0 ? C.convoy.routeTrip : C.convoy.playerTrip;
      return base * Math.max(C.convoy.minTripShare, 1 - C.convoy.depotBoost * this.count(p, 'depot'));
    }

    truckLoad(p, dest) {
      const out = {};
      if (dest === 'home') {
        const lack = RES.filter((r) => !p.rich.includes(r));
        for (const r of lack) out[r] = C.convoy.homeLoad / lack.length;
        return out;
      }
      const q = this.players[dest];
      const lacked = q.rich.filter((r) => !p.rich.includes(r));
      if (lacked.length === 1) { out[lacked[0]] = C.convoy.load * 2 / 3; const other = q.rich.find((r) => r !== lacked[0]); out[other] = C.convoy.load / 3; }
      else for (const r of q.rich) out[r] = C.convoy.load / 2;
      return out;
    }

    sendArmy(p, kind, toId) {
      const q = this.players[toId];
      if (this.peace) return { ok: false, msg: `Peace time: attacks can be sent in ${Math.ceil(C.peaceSeconds - this.t)} seconds` };
      const n = p.army[kind];
      if (!n) return { ok: false, msg: 'None ready to send' };
      p.army[kind] = 0;
      this.transit.push({ from: p.id, to: q.id, kind, count: n, arrive: this.t + C.travel[kind], hpM: this.mult(p.up.uHp), dmgM: this.mult(p.up.uDmg), sentAt: this.t });
      p.stats.sent += n;
      this.breakRoute(p, q);
      this.events.push({ type: 'attack', from: p.id, to: q.id, kind, count: n });
      return { ok: true, n };
    }

    breakRoute(p, q) {
      let broke = false;
      for (const t of p.trucks) if (t.dest === q.id) { t.dest = null; t.p = 0; broke = true; }
      for (const t of q.trucks) if (t.dest === p.id) { t.dest = null; t.p = 0; broke = true; }
      const until = this.t + C.convoy.cooldown;
      p.cooldown[q.id] = until; q.cooldown[p.id] = until;
      if (broke) this.events.push({ type: 'routeBroken', a: p.id, b: q.id });
    }

    // ---- The clock ----
    step(dt) {
      if (this.over) return;
      this.t += dt;
      if (this.t >= C.gameSeconds) { this.t = C.gameSeconds; this.over = true; this.events.push({ type: 'over' }); return; }
      if (!this.announcedPeace && !this.peace) { this.announcedPeace = true; this.events.push({ type: 'peaceOver' }); }
      if (!this.announcedFinal && this.finalPush) { this.announcedFinal = true; this.events.push({ type: 'final' }); }

      // attacks arriving
      for (let i = this.transit.length - 1; i >= 0; i--) {
        const a = this.transit[i];
        if (this.t >= a.arrive) { this.transit.splice(i, 1); this.arrive(a); }
      }
      for (const p of this.players) this.economy(p, dt);
      for (const p of this.players) this.city(p, dt);
    }

    arrive(a) {
      const q = this.players[a.to];
      const from = this.players[a.from];
      const ang = q.dir[from.id];
      const u = C.units[a.kind];
      for (let i = 0; i < a.count; i++) {
        const an = ang + rand(-0.22, 0.22), r = C.edgeRadius + rand(0, 14);
        const hp = u.hp * a.hpM;
        const inv = { kind: a.kind, from: from.id, x: Math.sin(an) * r, y: -Math.cos(an) * r, hp, maxHp: hp, dmgM: a.dmgM, life: 0, fxCool: rand(0, 0.4), heading: ang + Math.PI };
        const lot = this.randomTargetLot(q);
        inv.goal = lot != null ? { x: LOTS[lot].x + rand(-4, 4), y: LOTS[lot].y + rand(-4, 4) } : { x: rand(-8, 8), y: rand(-8, 8) };
        if (a.kind === 'bomb') inv.goalLot = lot;
        q.invaders.push(inv);
      }
      this.events.push({ type: 'arrived', to: q.id, from: from.id, kind: a.kind, count: a.count });
    }

    randomTargetLot(p) {
      const lots = p.buildings.map((b, i) => (b && !b.rubble ? i : -1)).filter((i) => i >= 0);
      return lots.length ? lots[(Math.random() * lots.length) | 0] : null;
    }

    economy(p, dt) {
      const boost = (1 + C.workshopBoost * this.count(p, 'workshop')) * (this.finalPush ? C.finalIncomeBoost : 1);
      for (const r of p.rich) p.stock[r] += C.richRate * boost * dt;
      // trucks
      for (const t of p.trucks) {
        if (t.dest === null) continue;
        if (t.dest !== 'home' && this.cooldownLeft(p, this.players[t.dest]) > 0) { t.dest = null; t.p = 0; continue; }
        t.p += dt / this.tripTime(p, t.dest);
        if (t.p >= 1) {
          t.p -= 1;
          const load = this.truckLoad(p, t.dest);
          for (const r in load) p.stock[r] += load[r];
          if (p.isHuman) this.events.push({ type: 'delivery', to: p.id, from: t.dest, load });
        }
      }
      // population
      const cap = this.popCap(p);
      if (p.pop < cap) p.pop = Math.min(cap, p.pop + Math.max(C.popGrowthMin, (cap - p.pop) * C.popGrowth) * dt);
      else p.pop = Math.max(cap, p.pop - (p.pop - cap) * C.popShrink * dt);
      // buildings going up and mending
      const calm = p.invaders.length === 0;
      for (const b of p.buildings) {
        if (!b || b.rubble) continue;
        if (b.grow != null) { b.grow += dt / 2; if (b.grow >= 1) delete b.grow; }
        if (b.rising != null) { b.rising += dt / 3; b.hp = b.maxHp * Math.min(1, b.rising); if (b.rising >= 1) delete b.rising; }
        else if (calm && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + C.repairRate * dt);
      }
      if (calm) for (const tu of p.turrets) tu.hp = Math.min(tu.maxHp, tu.hp + C.repairRate * 0.5 * dt);
    }

    popCap(p) {
      return C.baseCap + C.housingCap * p.buildings.reduce((a, b) => a + (b && b.type === 'housing' && !b.rubble && b.rising == null ? b.level : 0), 0);
    }
    maxDefenders(p) { return C.defenders.base + C.defenders.perBarracks * this.count(p, 'barracks'); }

    // ---- Fighting inside one city ----
    city(p, dt) {
      const U = C.units;
      const fx = (o) => { if (p.isHuman && p.fx.length < 200) p.fx.push(Object.assign({ t: 0 }, o)); };
      const ground = p.invaders.filter((v) => v.kind !== 'bomb' && v.hp > 0);
      const R = C.cityRadius;

      for (const v of p.invaders) {
        if (v.hp <= 0) continue;
        v.life += dt; v.fxCool -= dt;
        const r = Math.hypot(v.x, v.y);
        if (v.life > C.leaveAfter && !v.leaving) v.leaving = true;
        if (v.leaving) {
          const d = BT.dirVec(p.dir[v.from]); const sp = U[v.kind].speed * 1.3;
          v.x += d.x * sp * dt; v.y += d.y * sp * dt; v.heading = p.dir[v.from];
          if (Math.hypot(v.x, v.y) > C.edgeRadius + 20) v.gone = true;
          continue;
        }
        if (v.kind === 'inf') {
          const def = nearest(p.defenders, v, U.inf.range);
          if (def) {
            def.hp -= U.inf.vsDefender * v.dmgM * dt; v.aim = def;
            if (v.fxCool <= 0) { fx({ k: 'shot', x1: v.x, y1: v.y, x2: def.x, y2: def.y, c: 'enemy' }); v.fxCool = 0.5; }
            continue;
          }
          v.aim = null;
          if (moveTo(v, v.goal, U.inf.speed, dt)) {
            // inside the city: people get hurt
            const kill = U.inf.popKill * v.dmgM * dt;
            const before = p.pop; p.pop = Math.max(Math.min(before, C.popFloor), p.pop - kill); p.stats.lost += before - p.pop;
            if (Math.random() < dt * 0.5) v.goal = { x: rand(-R + 6, R - 6) * 0.8, y: rand(-R + 6, R - 6) * 0.8 };
            if (v.fxCool <= 0) { fx({ k: 'puff', x: v.x + rand(-4, 4), y: v.y + rand(-4, 4), c: 'small' }); v.fxCool = 0.9; }
          }
        } else if (v.kind === 'tank') {
          const tu = nearest(p.turrets, v, U.tank.range);
          if (tu) {
            tu.hp -= U.tank.vsTurret * v.dmgM * dt; v.aim = tu;
            if (v.fxCool <= 0) { fx({ k: 'shell', x1: v.x, y1: v.y, x2: tu.x, y2: tu.y }); v.fxCool = 0.9; }
            continue;
          }
          const def = nearest(p.defenders, v, 8);
          if (def) { def.hp -= U.tank.vsDefender * v.dmgM * dt; v.aim = def; if (v.fxCool <= 0) { fx({ k: 'shell', x1: v.x, y1: v.y, x2: def.x, y2: def.y }); v.fxCool = 0.9; } continue; }
          // find a building
          let target = null, best = 1e9;
          p.buildings.forEach((b, i) => { if (b && !b.rubble) { const d = dist(v, LOTS[i]); if (d < best) { best = d; target = i; } } });
          if (target == null) { v.leaving = r > R ? v.leaving : true; continue; }
          const L = LOTS[target];
          if (best > 9) { moveTo(v, L, U.tank.speed, dt); v.aim = null; }
          else {
            const b = p.buildings[target]; v.aim = L;
            b.hp -= U.tank.vsBuilding * v.dmgM * dt;
            if (v.fxCool <= 0) { fx({ k: 'shell', x1: v.x, y1: v.y, x2: L.x, y2: L.y }); v.fxCool = 1.1; }
            if (b.hp <= 0) this.wreck(p, target);
          }
        } else if (v.kind === 'bomb') {
          if (!v.dropped && moveTo(v, v.goal, U.bomb.speed, dt, 3)) {
            v.dropped = true;
            const before = p.pop; p.pop = Math.max(Math.min(before, C.popFloor), p.pop - U.bomb.popKill * v.dmgM); p.stats.lost += before - p.pop;
            p.buildings.forEach((b, i) => {
              if (!b || b.rubble) return;
              const d = dist(v, LOTS[i]);
              if (d < U.bomb.splash) { b.hp -= U.bomb.vsBuilding * v.dmgM * (d < 5 ? 1 : 0.5); if (b.hp <= 0) this.wreck(p, i); }
            });
            fx({ k: 'boom', x: v.x, y: v.y });
            v.leaving = true;
          }
        }
      }

      // turrets
      for (const tu of p.turrets) {
        const T = C.turrets[tu.type];
        tu.fxCool -= dt;
        const targets = p.invaders.filter((v) => v.hp > 0 && (tu.type === 'aa' ? v.kind === 'bomb' : v.kind !== 'bomb'));
        const v = nearest(targets, tu, T.range);
        if (!v) continue;
        tu.aim = Math.atan2(v.x - tu.x, -(v.y - tu.y)); tu.firing = 0.2;
        v.hp -= T.dps * this.mult(p.up.tDmg) * dt;
        if (tu.fxCool <= 0) { fx({ k: tu.type === 'aa' ? 'flak' : 'shot', x1: tu.x, y1: tu.y, x2: v.x, y2: v.y, c: 'mine' }); tu.fxCool = tu.type === 'aa' ? 0.35 : 0.5; }
      }

      // defenders take to the streets
      const D = C.defenders;
      const threats = ground.filter((v) => Math.hypot(v.x, v.y) < D.alertRadius && !v.leaving);
      for (const d of p.defenders) {
        if (d.hp <= 0) continue;
        d.fxCool -= dt;
        const v = nearest(threats, d, 1e9);
        if (v) {
          const dd = dist(d, v);
          if (dd > D.range * 0.8) { moveTo(d, v, D.speed, dt); d.aim = null; }
          if (dd <= D.range) {
            v.hp -= (v.kind === 'tank' ? D.vsTank : D.vsInf) * this.mult(p.up.uDmg) * dt; d.aim = v;
            if (d.fxCool <= 0) { fx({ k: 'shot', x1: d.x, y1: d.y, x2: v.x, y2: v.y, c: 'mine' }); d.fxCool = 0.5; }
          }
        } else { d.aim = null; moveTo(d, d.home, D.speed * 0.6, dt); }
      }

      // clean up and recover
      for (const v of p.invaders) if (v.hp <= 0 && !v.dead) { v.dead = true; fx({ k: v.kind === 'bomb' ? 'boom' : 'puff', x: v.x, y: v.y, c: v.kind }); }
      p.invaders = p.invaders.filter((v) => !v.dead && !v.gone);
      for (const d of p.defenders) if (d.hp <= 0 && !d.dead) { d.dead = true; fx({ k: 'puff', x: d.x, y: d.y, c: 'small' }); }
      p.defenders = p.defenders.filter((d) => !d.dead);
      for (const tu of p.turrets) if (tu.hp <= 0 && !tu.dead) { tu.dead = true; fx({ k: 'boom', x: tu.x, y: tu.y }); }
      p.turrets = p.turrets.filter((t) => !t.dead);
      if (p.defenders.length < this.maxDefenders(p)) {
        p.defenderTimer += dt;
        const every = D.respawn * Math.max(0.35, 1 - D.barracksBoost * this.count(p, 'barracks'));
        if (p.defenderTimer >= every) { p.defenderTimer = 0; p.defenders.push(this.newDefender(p)); }
      } else p.defenderTimer = 0;
      for (const f of p.fx) f.t += dt;
      p.fx = p.fx.filter((f) => f.t < 0.6);
    }

    wreck(p, lot) {
      const b = p.buildings[lot];
      if (!b || b.rubble) return;
      b.rubble = true; b.hp = 0; delete b.rising;
      this.events.push({ type: 'wrecked', p: p.id, lot, building: b.type });
    }
  }

  function nearest(list, from, maxD) {
    let best = null, bd = maxD;
    for (const o of list) { if (o.hp <= 0) continue; const d = dist(o, from); if (d <= bd) { bd = d; best = o; } }
    return best;
  }
  // moves o toward goal; returns true once there
  function moveTo(o, goal, speed, dt, near = 2) {
    const dx = goal.x - o.x, dy = goal.y - o.y, d = Math.hypot(dx, dy);
    if (d <= near) return true;
    const s = Math.min(d, speed * dt);
    o.x += (dx / d) * s; o.y += (dy / d) * s;
    o.heading = Math.atan2(dx, -dy);
    o.moving = 0.15;
    return false;
  }

  BT.Game = Game;
})();
