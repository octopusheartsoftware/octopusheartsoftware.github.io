// Computer cities: simple, readable choices, using only the same actions a person has.
(function () {
  const BT = (globalThis.BT = globalThis.BT || {});
  const C = BT.CONFIG;
  const RES = C.resources;
  const rand = (a, b) => a + Math.random() * (b - a);

  class Brain {
    constructor(game, p) {
      this.g = game; this.p = p;
      this.aggression = rand(0.25, 0.75);  // how much of a war-monger
      this.friendliness = rand(0.4, 0.9);  // how readily it sends trucks back
      this.think = rand(0, 2);
      this.threat = {};    // ground threat by player
      this.airThreat = {}; // bomber threat by player
      this.grudge = {};    // who attacked us lately
      this.nextAttack = C.peaceSeconds + rand(15, 60);
    }

    // Something happened in the game that this city might care about.
    hear(e) {
      const p = this.p;
      if (e.type === 'arrived' && e.to === p.id) {
        const k = e.kind === 'bomb' ? this.airThreat : this.threat;
        k[e.from] = (k[e.from] || 0) + e.count * (e.kind === 'tank' ? 4 : e.kind === 'bomb' ? 5 : 1);
        this.grudge[e.from] = (this.grudge[e.from] || 0) + e.count;
      }
      if (e.type === 'attack' && e.to === p.id) this.grudge[e.from] = (this.grudge[e.from] || 0) + 1;
      if (e.type === 'truck' && e.to === p.id) this.maybeReciprocate(this.g.players[e.from]);
    }

    maybeReciprocate(q) {
      const g = this.g, p = this.p;
      if (g.trucksTo(p, q.id) > 0) return;
      if ((this.grudge[q.id] || 0) > 6 && Math.random() > 0.3) return;
      if (Math.random() > this.friendliness) return;
      setTimeoutSim(g, rand(2, 6), () => { if (g.trucksTo(q, p.id) > 0) this.sendOrMoveTruck(q.id); });
    }

    // A person asked this city out loud for a truck (in the test: the "Ask for a truck" button).
    askedForTruck(q) {
      const g = this.g, p = this.p;
      if (g.cooldownLeft(p, q) > 0) return { yes: false, say: `${p.name}: "You just attacked me. Ask again later."` };
      if (g.trucksTo(p, q.id) > 0) return { yes: false, say: `${p.name}: "I already have a truck on your road."` };
      const sendsMe = g.trucksTo(q, p.id) > 0;
      const g2 = this.grudge[q.id] || 0;
      const chance = (sendsMe ? 0.85 : 0.45) * this.friendliness * (g2 > 6 ? 0.3 : 1) + (sendsMe ? 0.15 : 0);
      if (Math.random() < chance) {
        const ok = this.sendOrMoveTruck(q.id);
        if (ok) return { yes: true, say: sendsMe ? `${p.name}: "Deal. Truck's on its way."` : `${p.name}: "Sure, but send one back, okay?"` };
        return { yes: false, say: `${p.name}: "I'd like to, but I've no trucks or fuel right now."` };
      }
      return { yes: false, say: sendsMe ? `${p.name}: "Not right now."` : `${p.name}: "What's in it for me? Send me a truck first."` };
    }

    sendOrMoveTruck(dest) {
      const g = this.g, p = this.p;
      if (g.idleTrucks(p).length === 0) {
        // pull one off the countryside road, or buy one
        if (g.trucksTo(p, 'home') > 0) g.recallTruck(p, 'home');
        else if (!g.buy(p, 'truck').ok) return false;
      }
      return g.sendTruck(p, dest).ok;
    }

    update(dt) {
      this.think -= dt;
      if (this.think > 0) return;
      this.think = rand(1.5, 2.5);
      const g = this.g, p = this.p;
      for (const k in this.threat) this.threat[k] *= 0.97;
      for (const k in this.airThreat) this.airThreat[k] *= 0.97;
      for (const k in this.grudge) this.grudge[k] *= 0.98;

      this.useTrucks();
      for (let i = 0; i < 6; i++) if (!this.spendOnce()) break;
      if (!g.peace && g.t >= this.nextAttack) this.attack();
    }

    useTrucks() {
      const g = this.g, p = this.p;
      const others = g.players.filter((q) => q !== p);
      // Partners: players whose riches we lack, who aren't fighting us. Trade routes first.
      const score = (q) => {
        if (g.cooldownLeft(p, q) > 0) return -1;
        const useful = q.rich.filter((r) => !p.rich.includes(r)).length;
        if (!useful) return -1;
        return useful + (g.trucksTo(q, p.id) > 0 ? 3 : 0) - (this.grudge[q.id] || 0) * 0.2 - g.trucksTo(p, q.id) * 0.8;
      };
      for (const t of g.idleTrucks(p)) {
        const best = others.map((q) => [q, score(q)]).sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] > 1.2) g.sendTruck(p, best[0].id);
        else g.sendTruck(p, 'home');
      }
    }

    // Pick the most useful affordable thing and buy it. Returns false when nothing was bought.
    spendOnce() {
      const g = this.g, p = this.p;
      const options = [];
      const free = p.buildings.some((b) => b === null);
      const late = g.t / C.gameSeconds;
      const groundThreat = Object.values(this.threat).reduce((a, b) => a + b, 0);
      const airThreat = Object.values(this.airThreat).reduce((a, b) => a + b, 0);
      const rubble = p.buildings.findIndex((b) => b && b.rubble);

      const opt = (score, act, cost) => options.push([score, act, cost]);
      if (rubble >= 0) opt(9, () => g.rebuild(p, rubble), g.rebuildCost(p, rubble));
      const lowest = p.buildings.map((b, i) => [b, i]).filter(([b]) => b && b.type === 'housing' && !b.rubble && b.level < C.housingMaxLevel).sort((a, b) => a[0].level - b[0].level)[0];
      if (free) opt(6 + late * 3, () => g.build(p, 'housing'), g.costOf(p, 'housing'));
      else if (lowest) opt(6 + late * 3, () => g.raise(p, lowest[1]), g.costOf(p, 'housing'));
      if (free) {
        if (g.count(p, 'workshop') < 2 && late < 0.6) opt(5.5 - g.count(p, 'workshop') * 2, () => g.build(p, 'workshop'), g.costOf(p, 'workshop'));
        if (g.count(p, 'depot') < 2 && p.trucks.length >= g.truckLimit(p) - 1) opt(4, () => g.build(p, 'depot'), g.costOf(p, 'depot'));
        if (g.count(p, 'barracks') < 2 && groundThreat > 8) opt(4.5, () => g.build(p, 'barracks'), g.costOf(p, 'barracks'));
      }
      const ag = p.turrets.filter((t) => t.type === 'ag').length, aa = p.turrets.filter((t) => t.type === 'aa').length;
      if (late > 0.08) opt(3 + groundThreat * 0.15 - ag * 0.6, () => this.placeTurret('ag', this.threat), g.costOf(p, 'ag'));
      if (airThreat > 0 || late > 0.35) opt(2 + airThreat * 0.2 - aa * 0.8, () => this.placeTurret('aa', this.airThreat), g.costOf(p, 'aa'));
      if (p.trucks.length < Math.min(g.truckLimit(p), 2 + Math.floor(g.t / 120))) opt(4.5, () => g.buy(p, 'truck'), g.costOf(p, 'truck'));
      for (const path in C.upgrades) if (p.up[path] < 3) opt(3.5 + (path === 'uDmg' ? this.aggression : 0), () => g.upgrade(p, path), g.upgradeCost(p, path));
      const war = (g.peace ? 0.6 : 1) * (2 + this.aggression * 4 * (0.4 + late)) * (g.finalPush ? 1.8 : 1);
      opt(war, () => g.buy(p, 'inf'), g.costOf(p, 'inf'));
      opt(war * 0.9, () => g.buy(p, 'tank'), g.costOf(p, 'tank'));
      opt(war * 0.8, () => g.buy(p, 'bomb'), g.costOf(p, 'bomb'));

      // Use it or lose it: a big pile of one resource pushes its own item up.
      const pile = { food: 'inf', steel: 'ag', fuel: 'bomb', chips: 'aa' };
      for (const r of RES) if (p.stock[r] > 220) {
        const it = pile[r];
        opt(8, () => (it === 'ag' || it === 'aa') ? this.placeTurret(it, it === 'aa' ? this.airThreat : this.threat) : g.buy(p, it), g.costOf(p, it));
      }

      // Best first. If the best can't be paid for yet, save up for it:
      // cheaper things may not use the resources it is waiting on.
      options.sort((a, b) => b[0] - a[0]);
      for (const o of options) o[0] += rand(-0.8, 0.8);
      options.sort((a, b) => b[0] - a[0]);
      const reserved = {}; let saving = 0;
      for (const [, act, cost] of options) {
        if (!cost) continue;
        const fits = RES.every((r) => p.stock[r] - (reserved[r] || 0) >= (cost[r] || 0));
        if (fits) { if (act().ok) return true; continue; }
        if (saving < 2) { saving++; for (const r in cost) reserved[r] = (reserved[r] || 0) + cost[r]; }
      }
      return false;
    }

    // Put a turret on the side the biggest threat comes from (or toward a random rival).
    placeTurret(type, threats) {
      const g = this.g, p = this.p;
      let from = Object.keys(threats).sort((a, b) => threats[b] - threats[a])[0];
      if (from == null) { const others = g.players.filter((q) => q !== p); from = others[(Math.random() * others.length) | 0].id; }
      const ang = p.dir[from] + rand(-0.5, 0.5), r = rand(46, 70);
      return g.placeTurret(p, type, Math.sin(ang) * r, -Math.cos(ang) * r);
    }

    attack() {
      const g = this.g, p = this.p;
      this.nextAttack = g.t + rand(25, 55) * (1.4 - this.aggression) * (g.finalPush ? 0.5 : 1);
      const army = p.army.inf + p.army.tank * 3 + p.army.bomb * 3;
      if (army < 8 && !g.finalPush) return;
      // target: someone who hurt us, or the leader; spare trade partners unless they lead late on
      const rank = g.ranking();
      const cands = g.players.filter((q) => q !== p).map((q) => {
        let s = (this.grudge[q.id] || 0) * 0.4 + (rank[0] === q ? 4 : 0) + (rank.indexOf(q) < rank.indexOf(p) ? 2 : 0) + rand(0, 2);
        if (g.tradeRoute(p, q)) s -= g.finalPush && rank[0] === q ? 0 : 5;
        return [q, s];
      }).sort((a, b) => b[1] - a[1]);
      const target = cands[0][0];
      for (const kind of ['inf', 'tank', 'bomb']) if (p.army[kind] > 0) g.sendArmy(p, kind, target.id);
    }
  }

  // tiny helper: run something after some game seconds
  function setTimeoutSim(g, secs, fn) { (g.timers = g.timers || []).push({ at: g.t + secs, fn }); }
  BT.runTimers = (g) => {
    if (!g.timers) return;
    const due = g.timers.filter((t) => g.t >= t.at);
    g.timers = g.timers.filter((t) => g.t < t.at);
    for (const t of due) t.fn();
  };

  // One small step of the whole game: rules, timers, then computer choices.
  // Returns the events that happened, for the screen.
  BT.advance = (g, brains, dt) => {
    g.step(dt);
    BT.runTimers(g);
    for (const b of brains) b.update(dt);
    const evs = g.events; g.events = [];
    for (const e of evs) for (const b of brains) b.hear(e);
    return evs;
  };

  BT.Brain = Brain;
})();
