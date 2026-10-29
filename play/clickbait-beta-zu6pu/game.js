// Clickbait Campus: game engine.
// All content lives in content/*.js (window.CONTENT); this file only runs the rules.
// Each game draws 3 classes, 3 news stories and a set of messages at random. A class code
// (?code=SOGGY-PRETZEL-42) seeds the draw, so everyone using the same code gets the same semester.
(function () {
  'use strict';
  const C = window.CONTENT, cfg = C.config, P = C.pools;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const TICK = 0.25;
  const params = new URLSearchParams(location.search);
  const SPEED = +params.get('speed') || 1; // ?speed=4 fast-forwards for testing
  const PACE = +params.get('pace') || cfg.pace; // ?pace=3 tries a different game pace
  const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const CODE = normCode(params.get('code'));

  let S = null; // game state
  let timer = null;

  // ---------- Every website in the game, gathered from the content files ----------
  const SITES = {};
  for (const s of C.stories) Object.assign(SITES, s.sites);
  for (const p of P.phish) if (p.page) SITES[p.id + '-page'] = { kind: 'phish', outlet: p.page.title, mail: p.id, ...p.page };
  for (const m of P.memes) {
    SITES[m.id] = { kind: 'meme', outlet: 'GooseMemes', domain: 'goosememes.biz', path: '/' + m.link.split('/').pop(),
      theme: { bg: '#fffde8', ink: '#222', accent: '#555', font: 'impact' }, title: m.caption, byline: '',
      body: `<div class="meme">${m.art}<br><span>${esc(m.text)}</span></div>` };
  }

  // ---------- Random draws ----------
  // Every random choice comes from a generator seeded by the class code (or a random seed),
  // labeled by what it's for, so the same code always gives the same semester.
  function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(label) {
    let a = hash(S.seed + '|' + label);
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(a, r = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pickOne = (arr, r) => arr[Math.floor(r() * arr.length)];
  // Fill {placeholders} in content text
  const fill = (s, v = {}) => (s == null ? s : String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : k in S.vars ? S.vars[k] : m)));

  // ---------- Setup ----------
  function newGame() {
    const T = PACE;
    S = {
      seed: CODE || Math.random().toString(36).slice(2), t: 0, T, slow: false, weekLen: cfg.weekSeconds * T, paused: false, over: null,
      vars: { player: cfg.playerName, user: cfg.playerName.toLowerCase() },
      money: cfg.startMoney, stress: cfg.startStress, world: 0, strikes: 0,
      weeksStarted: 0, walkWeek: 0, bank: [],
      courses: {}, optOrder: {}, mail: [], texts: [], stories: {}, fired: new Set(), log: [],
      suggest: [], order: {}, traced: new Set(), bought: {}, scareDone: false,
      arcadeRelief: {}, arcadePlay: 0,
      lap: { app: 'noodle', noodle: { view: 'dash' }, mailSel: null, web: { view: 'home' }, webHist: [], dropdown: false, aboutOpen: null, arcade: 'runner' },
      phone: { view: 'home' },
      tv: { list: [], idx: 0, last: 0 },
      pops: {}
    };
    buildSemester();
  }

  // Draw this semester's classes, stories and messages, and lay them out on the timeline.
  // Timeline times are in "units" (one week = cfg.weekSeconds) and scaled by the pace when they fire.
  function buildSemester() {
    const r = rng('semester');
    const unit = (gameTime) => gameTime / S.T;
    const tl = [];
    const parentFrom = (p) => ({ name: p, email: C.parents[p].email });

    // Classes: 3 of the catalog, one on each schedule track
    S.classList = shuffle(C.courses.slice(), r).slice(0, C.tracks.length);
    S.classList.forEach((c, i) => {
      const st = { adj: 0, quiz: {}, mods: [] };
      let prev = 0;
      C.tracks[i].forEach((due, mi) => {
        const m = c.modules[mi], mid = `${c.id}-${mi + 1}`;
        const dueAt = dueTime(due);
        st.mods.push({ id: mid, def: m, n: mi + 1 });
        st.quiz[mid] = { openAt: prev, dueAt, due, opened: prev === 0, answers: {}, credit: {}, submitted: false, missed: false, score: null };
        S.optOrder[mid] = m.questions.map((q, qi) => shuffle(q.options.map((_, k) => k), rng(`opts:${mid}:${qi}`)));
        if (m.email) { // arrives about a third of the way through the module
          const o = unit(prev), d = unit(dueAt);
          tl.push({ at: o + 0.3 * (d - o), type: 'mail', def: profMail(c, 'mod-' + mid, m.email,
            { fixes: { module: mid, q: m.questions.findIndex((q) => q.fromEmail) }, emailType: m.email.type, regrade: m.email.regrade }) });
        }
        prev = dueAt;
      });
      S.courses[c.id] = st;
    });

    // Stories: 3, each leaning a different way, in random order
    const leans = new Set();
    S.storyList = shuffle(C.stories.slice(), rng('stories')).filter((s) => !leans.has(s.lean) && leans.add(s.lean)).slice(0, 3);
    for (const s of S.storyList) { S.stories[s.id] = { aired: false, result: null }; S.order[s.id] = shuffle(s.results.slice(), rng('results:' + s.id)); }
    S.scare = pickOne(P.scares, rng('scare'));

    const used = new Set(), usedTricks = new Set(), usedLogistics = new Set();
    const fresh = (pool, label, ok = () => true) => {
      const item = shuffle(pool.slice(), rng(label)).find((x) => !used.has(x.id) && ok(x));
      if (item) used.add(item.id);
      return item;
    };
    let storyIdx = 0;
    for (const slot of C.slots) {
      const label = slot.kind + '@' + slot.at;
      if (slot.kind === 'welcome') {
        const c = pickOne(S.classList, rng(label));
        const q = S.courses[c.id].quiz[S.courses[c.id].mods[0].id];
        tl.push({ at: slot.at, type: 'mail', def: profMail(c, 'welcome-' + c.id, c.welcome, { vars: { due: dueLabel(q.due) } }) });
      } else if (slot.kind === 'logistics') {
        // A class with a quiz open now that closes after the reply window
        const options = shuffle(S.classList.slice(), rng(label)).filter((c) => !usedLogistics.has(c.id));
        for (const c of options) {
          const mod = S.courses[c.id].mods.find((md) => { const q = S.courses[c.id].quiz[md.id]; return unit(q.openAt) <= slot.at && unit(q.dueAt) >= slot.at + slot.window; });
          if (!mod) continue;
          usedLogistics.add(c.id);
          const q = S.courses[c.id].quiz[mod.id];
          tl.push({ at: slot.at, type: 'mail', def: profMail(c, 'logistics-' + c.id, c.logistics, { window: slot.window, vars: { due: dueLabel(q.due), module: `Module ${mod.n}` } }) });
          break;
        }
      } else if (slot.kind === 'grade') {
        const graded = S.classList.filter((c) => S.courses[c.id].mods.some((md) => unit(S.courses[c.id].quiz[md.id].dueAt) < slot.at));
        const c = pickOne(graded.length ? graded : S.classList, rng(label));
        const ask = pickOne(C.gradeAsks, rng(label + 'ask'));
        const v = { course: c.title, code: c.code };
        tl.push({ at: slot.at, type: 'mail', def: { id: 'grade-' + slot.at, kind: 'parent-grade', course: c.id, from: parentFrom(slot.parent),
          subject: fill(ask.subject, v), body: fill(ask.body, v) + `<p>${C.parents[slot.parent].sign}</p>`, window: slot.window,
          lesson: 'Your parent wants your real grade. Check Noodle before you answer.' } });
      } else if (slot.kind === 'story') {
        const s = S.storyList[storyIdx++];
        if (!s) continue;
        tl.push({ at: slot.at, type: 'story', def: s });
        const base = { id: 'ask-' + s.id, kind: 'parent-news', story: s.id, replies: s.ask.replies, window: slot.window };
        if (slot.channel === 'email') {
          tl.push({ at: slot.ask, type: 'mail', def: { ...base, from: parentFrom(slot.parent), subject: s.ask.subject,
            body: s.ask.body + `<p>${C.parents[slot.parent].sign}</p><p class="hint">Tip: search for this on GooseSearch before you answer.</p>` } });
        } else {
          tl.push({ at: slot.ask, type: 'text', def: { ...base, from: slot.parent, body: s.ask.text + ' (Try GooseSearch!)' } });
        }
      } else if (slot.kind === 'meme') {
        const m = fresh(P.memes, label);
        tl.push({ at: slot.at, type: 'mail', def: { id: m.id, kind: 'parent-meme', from: parentFrom('Dad'), subject: m.subject,
          body: `<p><a data-go="site:${m.id}" data-href="https://${m.link}">${m.link}</a></p><p>${m.line}</p>`,
          replies: P.memeReplies, window: slot.window, lesson: 'Dad sends memes. He expects a 😂.' } });
      } else if (slot.kind === 'phish') {
        const p = fresh(P.phish, label, (x) => !usedTricks.has(x.trick));
        usedTricks.add(p.trick);
        const prof = pickOne(S.classList, rng(label + 'prof')).prof;
        const v = { prof: prof.name, profEmail: prof.email, profUser: prof.email.split('@')[0] };
        tl.push({ at: slot.at, type: 'mail', def: { ...p, kind: 'phish', from: { name: fill(p.from.name, v), email: fill(p.from.email, v) },
          subject: fill(p.subject, v), body: fill(p.body, v), window: slot.window, site: p.page ? p.id + '-page' : null } });
      } else if (slot.kind === 'smish') {
        tl.push({ at: slot.at, type: 'text', def: { ...fresh(P.smish, label), kind: 'smish', window: slot.window, lesson: 'Text scams ("smishing") work like phishing emails.' } });
      } else if (slot.kind === 'ad') {
        tl.push({ at: slot.at, type: 'text', def: { ...fresh(P.ads, label), kind: 'ad', window: slot.window, lesson: '"Sponsored" means someone paid to put it in front of you.' } });
      } else if (slot.kind === 'checkin') {
        tl.push({ at: slot.at, type: 'text', def: { ...fresh(P.checkins, label), kind: 'parent', window: slot.window, lesson: `Family check-ins don't need perfect answers, just kind ones.` } });
      } else if (slot.kind === 'friend') {
        const f = fresh(P.friends, label, (x) => !slot.free || x.cost === 0);
        tl.push({ at: slot.at, type: 'text', def: { ...f, kind: 'friend', window: 40 } });
      }
    }
    tl.sort((a, b) => a.at - b.at);
    S.timeline = tl;
    S.next = 0;
  }

  // A professor email for one of this semester's classes
  function profMail(c, id, src, extra) {
    const v = extra.vars || {};
    return {
      id, kind: 'prof', course: c.id, from: { name: c.prof.name, email: c.prof.email },
      subject: fill(src.subject, v), body: fill(src.body, v) + `<p>${c.prof.sign}</p>`,
      replies: src.replies.map((r) => ({ ...r, text: fill(r.text, v) })),
      window: extra.window || cfg.profReplyWindow,
      lesson: src.lesson || 'Professors expect a quick, polite reply when they ask for one.',
      fixes: extra.fixes, emailType: extra.emailType, regrade: extra.regrade
    };
  }

  const courseDef = (id) => S.classList.find((c) => c.id === id);
  const storyDef = (id) => S.storyList.find((s) => s.id === id);
  const moduleDef = (mid) => { for (const c of S.classList) for (const md of S.courses[c.id].mods) if (md.id === mid) return [c, md.def, md]; return []; };
  const quizState = (mid) => { const [c] = moduleDef(mid); return S.courses[c.id].quiz[mid]; };
  const week = () => Math.min(cfg.weeks, Math.floor(S.t / S.weekLen) + 1);
  // [week, day] → game time at the end of that day
  const dueTime = ([w, d]) => ((w - 1) + d / 7) * S.weekLen;
  const dueLabel = ([w, d]) => `${DAYS[d - 1]}, Week ${w}`;
  const openLabel = (t) => { const days = Math.round(t / S.weekLen * 7); const w = Math.floor(days / 7) + 1, d = days % 7; return `${DAYS[d]}, Week ${w}`; };

  // ---------- Time formatting ----------
  function clockText() {
    const inWeek = (S.t % S.weekLen) / S.weekLen * 7;
    const d = Math.floor(inWeek), h = Math.floor((inWeek - d) * 24);
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${DAYS[d]} ${hh} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function leftText(sec) {
    if (sec <= 0) return 'Due now';
    const h = sec / S.weekLen * 168;
    if (h >= 24) return `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h left`;
    return h >= 1 ? `${Math.floor(h)}h left` : 'under 1h left';
  }
  const cd = (due) => `<span class="cd" data-due="${due}"></span>`;

  // ---------- Grades ----------
  function quizScore(m, q) {
    const right = m.questions.filter((qq, i) => q.answers[i] === qq.answer || q.credit[i]).length;
    return { right, pct: Math.round(right / m.questions.length * 100) };
  }
  function courseGrade(id) {
    const st = S.courses[id];
    const scores = Object.values(st.quiz).filter((q) => q.submitted || q.missed).map((q) => q.score);
    if (!scores.length) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.max(0, Math.min(100, Math.round(avg + st.adj)));
  }
  function letter(g) { return g == null ? null : g >= 90 ? 'A' : g >= 80 ? 'B' : g >= 70 ? 'C' : g >= 60 ? 'D' : 'F'; }
  const POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  function gpa() {
    const ls = S.classList.map((c) => letter(courseGrade(c.id))).filter(Boolean);
    return ls.length ? (ls.reduce((a, l) => a + POINTS[l], 0) / ls.length).toFixed(2) : '—';
  }
  function gradeOptions(courseId) {
    const cur = letter(courseGrade(courseId));
    if (!cur) return ['No grades yet', 'A', 'B'];
    const all = ['A', 'B', 'C', 'D', 'F'];
    const i = all.indexOf(cur);
    const picks = new Set([cur, all[Math.max(0, i - 1)], all[Math.min(4, i + 1)]]);
    for (const l of all) if (picks.size < 3) picks.add(l);
    return all.filter((l) => picks.has(l));
  }

  // ---------- Effects ----------
  // Floating "+20" / "−$30" next to the HUD so every hit is visible
  function pop(id, amount, fmt) {
    const p = S.pops[id] || (S.pops[id] = { sum: 0, t: null });
    p.sum += amount;
    const el = $(id);
    const good = id === 'stress-pop' ? p.sum < 0 : p.sum > 0;
    el.textContent = fmt(p.sum);
    el.className = 'pop show ' + (good ? 'up' : 'down');
    clearTimeout(p.t);
    p.t = setTimeout(() => { el.classList.remove('show'); p.sum = 0; }, 1800);
    if (id === 'stress-pop' && amount > 0) { const m = $('hud-stress'); m.classList.remove('hit'); void m.offsetWidth; m.classList.add('hit'); }
  }
  function addStress(n) {
    const before = S.stress;
    S.stress = Math.max(0, Math.min(100, S.stress + n));
    const d = Math.round(S.stress - before);
    if (d) pop('stress-pop', d, (v) => (v > 0 ? `+${v}` : `−${-v}`) + ' stress');
    if (d) Sound.play(d > 0 ? 'stressUp' : 'stressDown');
  }
  function spend(amount, what) {
    if (!amount) return;
    S.money = Math.max(0, S.money - amount);
    S.bank.unshift({ what, amount: -amount, when: `Wk ${week()} ${clockText()}` });
    pop('money-pop', -amount, (v) => (v < 0 ? '−$' + -v : '+$' + v));
    Sound.play('spend');
  }
  // A scam that got you: money gone, stress up
  function scammed(amount, what) {
    Sound.play('scam');
    spend(amount, what);
    addStress(20);
    toastLap(`⚠️ Scammed: −$${amount} and +20 stress`);
  }
  const hacked = () => scammed(30, 'GIFT CARDS 4 U (unauthorized)');
  function strike() {
    S.strikes++;
    addStress(3);
  }
  const allowance = () => Math.max(cfg.minAllowance, cfg.weeklyAllowance - cfg.allowanceCut * S.strikes);
  function log(entry) { S.log.push(entry); }

  // ---------- Main loop ----------
  function setup() {
    newGame();
    hideOverlay();
    renderSpeed();
    renderAll();
  }

  function start() {
    if (!S || S.tutorial == null) setup();
    S.tutorial = null;
    $('tut').classList.remove('show');
    Sound.music('study');
    clearInterval(timer);
    timer = setInterval(tick, TICK * 1000);
    tick();
  }

  // ---------- Tutorial ----------
  // A short click-through that spotlights each part of the screen before the clock starts.
  // place: where the card sits relative to the highlighted area.
  const TUTORIAL = [
    { title: 'Welcome to Goose State!', text: `You're ${cfg.playerName}, a first-year student. Your goal: finish the ${cfg.weeks}-week semester with the best GPA you can, while keeping an eye on your money and your stress.` },
    { el: ['hud-clock'], place: 'below', title: 'The clock', text: 'Time keeps moving. Each week lasts a few minutes, and every deadline counts down in game time.' },
    { el: ['hud-money'], place: 'below', title: 'Your allowance', text: 'Mom and Dad send money every Monday. Ignore them or answer rudely, and the allowance shrinks.' },
    { el: ['hud-stress'], place: 'below', title: 'Stress', text: 'If stress reaches 100, you drop out. Hanging out with friends, taking walks and the arcade bring it down. Missed deadlines and scams push it up.' },
    { el: ['speed-btn', 'pause-btn'], place: 'below', title: 'Slow time and Pause', text: 'Things getting hectic? Slow time stretches the clock. Pause hides the screen until you come back.' },
    { el: ['lap-tab-noodle'], place: 'below', title: 'Noodle: your classes', text: `Read each module's articles, then take its quiz before it closes. New quizzes open every week. Miss 2 quizzes in one class and you fail it.` },
    { el: ['lap-tab-mail'], place: 'below', title: 'Mail', text: 'Professors and parents expect replies in time. Some emails hold quiz answers. Some are phishing: check the sender, and hover over links to see where they really go.' },
    { el: ['lap-tab-web'], place: 'below', title: 'GooseSearch', text: `When your parents ask about the news, look it up here. Check who's behind each source before you trust it.` },
    { el: ['lap-tab-arcade'], place: 'below', title: 'Arcade', text: 'Take a break with a quick game. It eases stress a little, but the clock keeps running.' },
    { el: ['tv'], place: 'left', title: 'The TV', text: 'The local news. What you tell your parents about these stories changes what happens in Gooseberry Falls.' },
    { el: ['phone'], place: 'left', title: 'Your phone', text: 'Texts from friends and family (they need replies too), your bank statement, and Stroll, a free walk to ease stress once a week.' },
    { title: `You're ready!`, text: 'At the end of the semester, a debrief walks through every choice you made. Good luck, and read carefully!' }
  ];

  function tutorial() {
    setup();
    S.tutorial = 0;
    showTutStep();
  }

  function showTutStep() {
    const i = S.tutorial, step = TUTORIAL[i];
    const tut = $('tut'), spot = $('tut-spot'), card = $('tut-card');
    tut.classList.add('show');
    const last = i === TUTORIAL.length - 1;
    card.innerHTML = `<div class="tut-count">${i + 1} of ${TUTORIAL.length}</div><h3>${step.title}</h3><p>${step.text}</p>
      <div class="row"><button class="btn" data-act="tut-skip">Skip</button><span style="flex:1"></span>
      ${i ? '<button class="btn" data-act="tut-back">Back</button>' : ''}
      <button class="btn primary" data-act="${last ? 'start' : 'tut-next'}">${last ? 'Start semester' : 'Next'}</button></div>`;
    if (!step.el) {
      spot.style.display = 'none';
      card.style.left = '420px'; card.style.top = '230px';
    } else {
      // Measure in stage pixels, undoing the stage's scale
      const stage = $('stage').getBoundingClientRect(), k = stage.width / 1280;
      const rects = step.el.map((id) => $(id).getBoundingClientRect());
      const x1 = Math.min(...rects.map((r) => r.left)), y1 = Math.min(...rects.map((r) => r.top));
      const x2 = Math.max(...rects.map((r) => r.right)), y2 = Math.max(...rects.map((r) => r.bottom));
      const box = { x: (x1 - stage.left) / k - 6, y: (y1 - stage.top) / k - 6, w: (x2 - x1) / k + 12, h: (y2 - y1) / k + 12 };
      Object.assign(spot.style, { display: 'block', left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
      const cw = 440;
      let left, top;
      if (step.place === 'left') { left = box.x - cw - 20; top = box.y + 10; }
      else { left = box.x + box.w / 2 - cw / 2; top = box.y + box.h + 16; }
      card.style.left = Math.max(16, Math.min(1280 - cw - 16, left)) + 'px';
      card.style.top = Math.max(16, top) + 'px';
    }
    card.querySelector('.btn.primary').focus();
  }

  function tick() {
    if (!S || S.over || S.paused) return;
    S.t += TICK * SPEED / (S.slow ? cfg.slowFactor : 1); // slow time stretches everything, deadlines included
    const t = S.t, T = S.T;

    // Weekly allowance and grind
    while (S.weeksStarted < week()) {
      S.weeksStarted++;
      Sound.play('coin');
      if (S.weeksStarted === cfg.weeks) Sound.music('crunch');
      if (S.weeksStarted > 1) addStress(cfg.weeklyStress);
      const amt = allowance();
      S.money += amt;
      S.bank.unshift({ what: 'Mom & Dad (allowance)', amount: amt, when: `Wk ${S.weeksStarted} Mon` });
      pushText({ id: 'bank-' + S.weeksStarted, kind: 'info', from: 'GooseBank', body: `Deposit: $${amt} from Mom & Dad. Have a great week ${S.weeksStarted}!` });
    }

    // Scheduled content
    while (S.next < S.timeline.length && t >= S.timeline[S.next].at * T) {
      const e = S.timeline[S.next++];
      if (e.type === 'mail') pushMail(e.def);
      else if (e.type === 'text') pushText(e.def);
      else airStory(e.def);
    }

    // Expirations
    for (const m of S.mail) if (!m.done && m.expiresAt && t >= m.expiresAt) resolveMail(m, { expired: true });
    for (const x of S.texts) if (!x.done && x.expiresAt && t >= x.expiresAt) resolveText(x, { expired: true });

    // Quiz modules opening and closing
    for (const c of S.classList) for (const md of S.courses[c.id].mods) {
      const q = S.courses[c.id].quiz[md.id];
      if (!q.opened && t >= q.openAt) {
        q.opened = true;
        Sound.play('quiz'); toastLap(`📚 New on Noodle: ${c.code} Module ${md.n}`);
        if (S.lap.app === 'noodle') renderLapView();
      }
      if (!q.submitted && !q.missed && t >= q.dueAt) {
        q.missed = true; q.score = 0;
        Sound.play('missed');
        addStress(15);
        log({ type: 'quiz', verdict: 'bad', title: `Missed the ${c.code} quiz (Module ${md.n}: ${md.def.title})`, detail: `Missed quizzes count as a zero and can't be made up.`, lesson: 'Start reading early. A new module opens as soon as the last one closes.' });
        toastLap(`⏰ You missed the ${c.code} quiz.`);
        const misses = Object.values(S.courses[c.id].quiz).filter((x) => x.missed).length;
        if (misses >= cfg.missesToFail) return end('fail', c);
        if (S.lap.app === 'noodle') renderLapView();
      }
    }

    // Surviving to the last day counts as finishing, even if the final quiz pushed stress over the edge
    if (t >= cfg.weeks * S.weekLen) return end('complete');
    if (S.stress >= 100) return end('dropout');

    // TV rotation
    if (t - S.tv.last >= 7) { S.tv.idx++; S.tv.last = t; renderTv(); }

    Sound.setStress(S.stress);
    renderHud();
    renderLapTabs();
    updateCountdowns();
  }

  function end(reason, course) {
    S.over = reason;
    Sound.play(reason === 'complete' ? 'endGood' : 'endBad'); // first, so it drowns out the last little sounds
    clearInterval(timer);
    Arcade.stop();
    // Anything still waiting counts as unanswered
    for (const m of S.mail) if (!m.done) resolveMail(m, { expired: true, silent: true });
    for (const x of S.texts) if (!x.done) resolveText(x, { expired: true, silent: true });
    showEnd(reason, course);
  }

  // ---------- Mail ----------
  function pushMail(def) {
    S.fired.add(def.id);
    const m = { id: def.id, def, at: S.t, expiresAt: def.window ? S.t + def.window * S.T : null, status: 'new', done: false, sent: null, verdict: null,
      replies: def.replies ? shuffle(def.replies.map((r) => ({ ...r })), rng('replies:' + def.id)) : null };
    S.mail.unshift(m);
    Sound.play('mail');
    toastLap(`📧 New email from ${def.from.name}: ${def.subject}`);
    if (S.lap.app === 'mail') renderLapView();
    renderLapTabs();
  }

  // Reply buttons for an email. Grade checks are built when first opened; emails that hold a quiz answer
  // gain a polite "please regrade" reply if you already took that quiz.
  function mailReplies(m) {
    const d = m.def;
    if (d.kind === 'parent-grade' && !m.replies) m.replies = gradeOptions(d.course).map((g) => ({ text: g, grade: g }));
    if (d.fixes && d.regrade && !m.done && !m.regradeAdded && quizState(d.fixes.module).submitted) {
      m.regradeAdded = true;
      m.replies.splice(Math.floor(Math.random() * (m.replies.length + 1)), 0, { text: d.regrade, good: true, regrade: true });
    }
    return m.replies || [];
  }

  // Corrections credit you only if you'd picked the reading's typo; other emails (updates, recaps…)
  // credit you for that question, since the answer wasn't available when you took the quiz.
  function regrade(d) {
    const [c, mod] = moduleDef(d.fixes.module);
    const q = quizState(d.fixes.module), qi = d.fixes.q, qq = mod.questions[qi];
    const before = q.score;
    if (q.answers[qi] === qq.answer) return `${d.from.name} checked: you already had that one right!`;
    if (d.emailType === 'correction' && q.answers[qi] !== qq.typo) return `${d.from.name} checked, but your answer wasn't the one from the typo, so the score stays at ${before}%.`;
    q.credit[qi] = true;
    q.score = quizScore(mod, q).pct;
    toastLap(`✅ ${c.code} quiz regraded: ${before}% → ${q.score}%`);
    return `${d.from.name} ${d.emailType === 'correction' ? 'regraded your quiz' : 'gave you credit for that question'}: ${before}% → ${q.score}%.`;
  }

  function resolveMail(m, how) {
    if (m.done) return;
    const d = m.def;
    const r = how.reply != null ? mailReplies(m)[how.reply] : null;
    m.done = true;
    const course = d.course ? courseDef(d.course) : null;
    const profPenalty = () => { S.courses[d.course].adj -= 3; addStress(3); };

    if (d.kind === 'prof') {
      if (r && r.good) {
        m.verdict = 'good';
        const extra = r.regrade ? ' ' + regrade(d) : '';
        log({ type: 'school', verdict: 'good', title: `Replied well to ${d.from.name}`, detail: `"${r.text}"${extra}`, lesson: d.lesson });
      } else {
        profPenalty();
        m.verdict = 'bad';
        const detail = how.reported ? `You reported a real email as phishing. The sender was ${d.from.email}, the school's real domain.`
          : how.expired ? `You didn't reply in time. (−3 in ${course.code})`
          : `${r.note} (−3 in ${course.code})`;
        log({ type: 'school', verdict: 'bad', title: `${course.code}: "${d.subject}"`, detail, lesson: d.lesson });
      }
    } else if (d.kind === 'phish') {
      if (how.reported) {
        m.verdict = 'good';
        log({ type: 'scam', verdict: 'good', title: `You reported a phishing email: "${d.subject}"`, detail: 'Reporting protects your classmates too.', tells: d.tells, lesson: 'Phishing tells to look for:' });
      } else if (how.expired) {
        m.verdict = 'mid';
        log({ type: 'scam', verdict: 'mid', title: `You ignored a phishing email: "${d.subject}"`, detail: 'Safe, but reporting it would have warned the school.', tells: d.tells, lesson: 'Phishing tells to look for:' });
      } else {
        m.verdict = 'bad';
        const cost = d.replyCost && !how.loggedIn ? d.replyCost : 30;
        scammed(cost, d.from.name + ' (scam)');
        const note = how.loggedIn ? SITES[d.site].afterNote : (d.replyNote || r.note);
        log({ type: 'scam', verdict: 'bad', title: `You fell for a phishing email: "${d.subject}"`, detail: `${note} (−$${cost}, +20 stress)`, tells: d.tells, lesson: 'Phishing tells you could have spotted:' });
      }
    } else if (d.kind === 'parent-meme') {
      const ok = r && r.good;
      if (!ok) strike();
      m.verdict = ok ? 'good' : 'bad';
      log({ type: 'family', verdict: m.verdict, title: `${d.from.name}'s meme`, detail: ok ? 'Dad loved your 😂.' : (r ? r.note : 'You left Dad hanging. Allowance −$5/week.'), lesson: d.lesson });
    } else if (d.kind === 'parent-grade') {
      const actual = letter(courseGrade(d.course)) || 'No grades yet';
      const said = r ? r.grade : null;
      const ok = said === actual;
      if (!ok) strike();
      m.verdict = ok ? 'good' : 'bad';
      log({ type: 'family', verdict: m.verdict, title: `${d.from.name} asked your ${course.code} grade`,
        detail: ok ? `You told the truth: ${actual}.` : said ? `You said ${said}, but Noodle showed ${actual}. Allowance −$5/week.` : 'No answer in time. Allowance −$5/week.', lesson: d.lesson });
    } else if (d.kind === 'parent-news') {
      resolveStory(d.story, how.reported ? null : r, d.from.name);
      m.verdict = r && !how.reported ? r.verdict : 'bad';
    }

    if (r) m.sent = r.text;
    if (r || how.reported) Sound.play('sent');
    if (how.reported) m.sent = '🚩 Reported as phishing';
    if (how.loggedIn) m.sent = '🔓 Used the link in this email';
    if (how.expired) m.status = 'missed';
    if (!how.silent) renderAll();
  }

  // ---------- Texts ----------
  function pushText(def) {
    const x = { id: def.id, def, from: def.from, at: S.t, expiresAt: def.window ? S.t + def.window * S.T : null, status: 'new', done: def.kind === 'info', sent: null,
      replies: def.replies ? shuffle(def.replies.map((r) => ({ ...r })), rng('replies:' + def.id)) : null };
    S.texts.push(x);
    if (def.kind !== 'info') Sound.play('text');
    toastPhone(`${def.from}: ${def.body}`);
    renderPhone();
  }

  function textReplies(x) {
    const d = x.def;
    if (d.kind === 'friend') return [
      { text: d.cost ? `I'm in! ($${d.cost})` : `I'm in!`, go: true, disabled: S.money < d.cost },
      { text: `Can't this time 😕`, go: false }
    ];
    return x.replies || [];
  }

  function resolveText(x, how) {
    if (x.done) return;
    x.done = true;
    const d = x.def;
    const r = how.reply != null ? textReplies(x)[how.reply] : null;
    if (r) { x.sent = r.text; Sound.play('sent'); }
    if (how.expired) x.status = 'missed';

    if (d.kind === 'friend') {
      if (r && r.go) { spend(d.cost, `${d.from}: ${d.body.slice(0, 22)}…`); addStress(-d.relief); }
      else if (r) { addStress(S.money < d.cost ? 10 : 5); }
      else addStress(3);
      const broke = S.money < d.cost;
      log({ type: 'life', verdict: r && r.go ? 'good' : 'mid', title: `${d.from}: "${d.body}"`,
        detail: r && r.go ? `You went${d.cost ? ` ($${d.cost})` : ''}. Stress −${d.relief}.` : r ? (broke ? `You couldn't afford it. Stress +10.` : 'You said no. Stress +5.') : 'No reply, so they went without you. Stress +3.',
        lesson: 'Hanging out costs money but eases stress. Free plans help when money is tight.' });
    } else if (d.kind === 'parent-news') {
      resolveStory(d.story, r, d.from);
    } else if (d.kind === 'parent') {
      const ok = r && r.good;
      if (!ok) strike();
      log({ type: 'family', verdict: ok ? 'good' : 'bad', title: `${d.from} texted: "${d.body}"`, detail: r ? (r.note || `${d.from} was happy to hear from you.`) : 'No reply in time. Allowance −$5/week.', lesson: d.lesson });
    } else if (d.kind === 'ad' || d.kind === 'smish') {
      if (r) {
        if (r.scam) Sound.play('scam');
        if (r.money) spend(-r.money, d.from);
        if (r.stress) addStress(r.stress);
        if (r.hacked) hacked();
        log({ type: 'scam', verdict: r.good ? 'good' : 'bad', title: `${d.from}: "${d.body.slice(0, 50)}…"`, detail: r.note, tells: d.tells, lesson: d.lesson });
      } else {
        log({ type: 'scam', verdict: 'mid', title: `You ignored: "${d.body.slice(0, 50)}…"`, detail: d.kind === 'smish' ? 'Safe, but reporting it as junk helps stop it.' : 'Ignoring sponsored messages is a fine choice.', tells: d.tells, lesson: d.lesson });
      }
    }
    if (!how.silent) renderAll();
  }

  // ---------- Stories ----------
  function airStory(s) {
    S.stories[s.id].aired = true;
    Sound.play('news');
    S.suggest.unshift({ q: s.id, label: s.query });
    S.tv.list.unshift({ icon: s.tv.icon, headline: 'BREAKING: ' + s.tv.headline, cls: '', story: s.id });
    S.tv.idx = 0; S.tv.last = S.t;
    renderTv();
  }

  function resolveStory(id, reply, who) {
    const s = storyDef(id), st = S.stories[id];
    const v = reply ? reply.verdict : 'missed';
    st.result = v;
    S.world += { good: 2, mid: 0, bad: -2, missed: -1 }[v];
    // Swap the breaking headline for the follow-up
    S.tv.list = S.tv.list.filter((h) => h.story !== id);
    const f = s.followUp[v];
    S.tv.list.unshift({ icon: f.icon, headline: f.headline, cls: v === 'good' ? 'good' : v === 'mid' ? 'calm' : '' });
    S.tv.idx = 0; S.tv.last = S.t;
    const sources = s.results.map((r) => SITES[r]);
    const match = { good: 'reputable', bad: 'partisan', mid: 'mixed' }[v];
    const site = sources.find((x) => x.kind === match);
    const traced = S.traced.has(id)
      ? ' You also opened the original source, which is how you trace a claim. ✔'
      : ` Tip: the reliable article linked to the original source (${SITES[s.primary].title}). Opening it is how you trace a claim.`;
    log({
      type: 'news', verdict: v === 'good' ? 'good' : v === 'mid' ? 'mid' : 'bad',
      title: `${who} asked about "${s.tv.headline.toLowerCase()}"`,
      detail: (v === 'missed' ? 'No answer in time, so your parents passed along what they heard on TV.' :
        `Your answer matched ${site.outlet} (${{ reputable: 'a reliable source', partisan: 'a hyper-partisan source', mixed: 'a source that mixes fact and opinion' }[match]}). World ${v === 'good' ? '+2' : v === 'bad' ? '−2' : '±0'}.`) + traced,
      tells: sources.map((x) => `${x.outlet} (${x.kind}): ${x.tells.join('; ')}`),
      lesson: s.lesson
    });
    renderTv();
  }

  // ---------- Rendering: HUD ----------
  function renderHud() {
    $('hud-clock').textContent = `Week ${week()} of ${cfg.weeks} · ${clockText()}`;
    const money = $('money-num');
    money.textContent = `$${S.money}`;
    money.className = S.money < 10 ? 'money-low' : '';
    $('stress-fill').style.width = S.stress + '%';
    $('stress-fill').style.background = S.stress >= 75 ? 'var(--bad)' : S.stress >= 50 ? 'var(--mid)' : 'var(--good)';
    $('stress-num').textContent = Math.round(S.stress);
    $('phone-status').innerHTML = `<span>${clockText()}</span><span>$${S.money}</span>`;
  }

  function updateCountdowns() {
    document.querySelectorAll('.cd[data-due]').forEach((el) => {
      const left = +el.dataset.due - S.t;
      el.textContent = leftText(left);
      el.classList.toggle('urgent', left < S.weekLen / 7);
    });
  }

  // Replace a container's HTML but keep scroll positions of scrollable children
  function swap(container, html) {
    const keep = {};
    container.querySelectorAll('[data-scroll]').forEach((el) => { keep[el.dataset.scroll] = el.scrollTop; });
    container.innerHTML = html;
    container.querySelectorAll('[data-scroll]').forEach((el) => { if (keep[el.dataset.scroll] != null) el.scrollTop = keep[el.dataset.scroll]; });
    updateCountdowns();
  }

  function renderAll() { renderHud(); renderLapTabs(); renderLapView(); renderPhone(); renderTv(); }

  // ---------- Laptop ----------
  function openQuizzes() {
    let n = 0;
    for (const c of S.classList) for (const q of Object.values(S.courses[c.id].quiz)) if (q.opened && !q.submitted && !q.missed) n++;
    return n;
  }

  function renderLapTabs() {
    const unread = S.mail.filter((m) => m.status === 'new').length;
    const pending = S.mail.filter((m) => !m.done && m.status !== 'new').length;
    const quizzes = openQuizzes();
    const tabs = [
      ['noodle', 'Noodle', quizzes ? `<span class="badge todo" title="Open quizzes">${quizzes}</span>` : ''],
      ['mail', 'Mail', unread ? `<span class="badge">${unread}</span>` : pending ? `<span class="badge todo">${pending}</span>` : ''],
      ['web', 'GooseSearch', ''],
      ['arcade', 'Arcade', '']
    ];
    // Only redraw the buttons when they change, so clicks aren't lost mid-press
    const html = tabs.map(([id, name, b]) => `<button class="tab ${S.lap.app === id ? 'on' : ''}" id="lap-tab-${id}" data-act="app" data-arg="${id}">${name}${b}</button>`).join('');
    if (S.tabsHtml !== html) { S.tabsHtml = html; $('tab-btns').innerHTML = html; }
    $('tab-clock').textContent = clockText();
  }

  function renderLapView(force) {
    const v = $('lap-view');
    if (S.lap.app === 'arcade') {
      // Redrawing would restart the running game, so leave it alone unless something on the page changed
      const canvas = $('arcade-canvas');
      if (!force && canvas && canvas.dataset.game === S.lap.arcade) return;
      swap(v, arcadeView());
      startArcade();
      return;
    }
    Arcade.stop();
    if (S.lap.app === 'noodle') swap(v, noodleView());
    else if (S.lap.app === 'mail') swap(v, mailView());
    else swap(v, webView());
  }

  // Noodle
  function noodleView() {
    const nv = S.lap.noodle;
    const head = `<div class="noodle-head">🍜 Noodle <small>Goose State University · ${cfg.playerName}</small></div>`;
    if (nv.view === 'dash') {
      const cards = S.classList.map((c) => {
        const g = courseGrade(c.id), st = S.courses[c.id];
        const open = st.mods.filter((md) => { const q = st.quiz[md.id]; return q.opened && !q.submitted && !q.missed; });
        const next = st.mods.map((md) => st.quiz[md.id]).find((q) => !q.opened);
        const line = open.length ? open.map((md) => `Quiz due: ${cd(st.quiz[md.id].dueAt)}`).join('<br>')
          : next ? `Next module opens ${openLabel(next.openAt)}` : 'All quizzes done';
        return `<button class="card" data-act="noodle" data-arg="course:${c.id}">
          <div class="band" style="background:${c.color}"></div>
          <div class="in"><b>${c.code}</b><span>${c.title}</span>
          <span class="grade-big">${g == null ? '—' : `${letter(g)} <small>${g}%</small>`}</span>
          <span class="small">${line}</span></div></button>`;
      }).join('');
      return head + `<div class="scroll pad" data-scroll="dash"><h2>Your classes</h2><div class="cards">${cards}</div>
        <p class="hint" style="margin-top:20px">Each quiz is based on its module's readings and your professors' emails. When a quiz closes, the next module in that class opens. Quizzes can't be made up after the deadline.</p></div>`;
    }
    const [kind, cid, mid, idx] = nv.view.split(':');
    const c = courseDef(cid), st = S.courses[cid];
    const crumbs = `<div class="crumbs"><button data-act="noodle" data-arg="dash">Dashboard</button> › <button data-act="noodle" data-arg="course:${cid}">${c.code}</button>`;
    if (kind === 'course') {
      const g = courseGrade(cid);
      const mods = st.mods.map((md) => {
        const q = st.quiz[md.id], m = md.def, name = `Module ${md.n}: ${m.title}`;
        if (!q.opened) return `<div class="module locked"><h3>🔒 ${name}</h3><p class="small">Opens ${openLabel(q.openAt)}, when the previous quiz closes.</p></div>`;
        const status = q.submitted ? `<b>Submitted: ${q.score}%</b>` : q.missed ? '<b style="color:var(--bad)">Missed (0%)</b>' : `Closes ${dueLabel(q.due)} · ${cd(q.dueAt)}`;
        const arts = m.articles.map((a, i) => `<li><button class="linkbtn" data-act="noodle" data-arg="article:${cid}:${md.id}:${i}">📄 ${a.title}</button></li>`).join('');
        return `<div class="module"><h3>${name}</h3><ul>${arts}</ul>
          <div class="row"><button class="btn primary" data-act="noodle" data-arg="quiz:${cid}:${md.id}">${q.submitted || q.missed ? 'View quiz' : 'Take quiz (4 questions, 1 attempt)'}</button> ${status}</div></div>`;
      }).join('');
      return head + crumbs + '</div>' + `<div class="scroll pad" data-scroll="course-${cid}">
        <h1>${c.code}: ${c.title}</h1><p class="muted">${c.prof.name} · Current grade: <b>${g == null ? 'no grades yet' : `${letter(g)} (${g}%)`}</b>${st.adj ? ` · includes ${st.adj} for professionalism` : ''}</p>${mods}</div>`;
    }
    const [, m, md] = moduleDef(mid);
    if (kind === 'article') {
      const a = m.articles[+idx];
      return head + crumbs + ` › ${esc(a.title)}</div><div class="scroll pad" data-scroll="art-${mid}-${idx}"><div class="article">
        <h1>${a.title}</h1><p class="muted small">${a.author}</p>${a.body}
        <p><button class="btn primary" data-act="noodle" data-arg="quiz:${cid}:${mid}">Go to quiz</button></p></div></div>`;
    }
    // quiz
    const q = st.quiz[mid];
    const locked = q.submitted || q.missed;
    const qs = m.questions.map((qq, qi) => {
      const opts = S.optOrder[mid][qi].map((oi) => {
        let cls = q.answers[qi] === oi ? 'sel' : '';
        if (locked && q.submitted) cls = oi === qq.answer ? 'right' : q.answers[qi] === oi ? (q.credit[qi] ? 'credit' : 'wrong') : '';
        return `<button class="opt ${cls}" ${locked ? 'disabled' : ''} data-act="answer" data-arg="${cid}:${mid}:${qi}:${oi}">${esc(qq.options[oi])}</button>`;
      }).join('');
      return `<div class="q"><b>${qi + 1}. ${esc(qq.q)}</b>${q.credit[qi] ? ' <span class="small" style="color:var(--good)">(regraded)</span>' : ''}<div class="opts">${opts}</div></div>`;
    }).join('');
    const answered = Object.keys(q.answers).length;
    const foot = q.submitted ? `<p><b>Score: ${q.score}%</b></p>` : q.missed ? '<p><b style="color:var(--bad)">Missed. This quiz closed before you submitted it.</b></p>'
      : `<div class="row"><button class="btn primary" data-act="submit" data-arg="${cid}:${mid}" ${answered < m.questions.length ? 'disabled' : ''}>Submit quiz</button> <span class="small">${answered}/${m.questions.length} answered · closes ${dueLabel(q.due)} · ${cd(q.dueAt)}</span></div>`;
    return head + crumbs + ` › Quiz</div><div class="scroll pad" data-scroll="quiz-${mid}"><div class="article"><h1>Module ${md.n}: ${m.title}: Quiz</h1>
      <p class="hint">Open book: you can switch back to the readings. You only get one attempt.</p>${qs}${foot}</div></div>`;
  }

  // Mail
  function mailView() {
    if (!S.mail.length) return '<div class="empty">No email yet. Enjoy the quiet while it lasts.</div>';
    const list = S.mail.map((m) => `<button class="mail-item ${m.status === 'new' ? 'new' : ''} ${S.lap.mailSel === m.id ? 'on' : ''}" data-act="mail" data-arg="${m.id}">
      <span class="who"><span>${esc(m.def.from.name)}</span>${!m.done && m.expiresAt ? cd(m.expiresAt) : m.sent ? '<span class="small muted">replied</span>' : m.status === 'missed' ? '<span class="small" style="color:var(--bad)">no reply</span>' : ''}</span>
      <span class="subj">${esc(m.def.subject)}</span></button>`).join('');
    const m = S.mail.find((x) => x.id === S.lap.mailSel);
    let read = '<div class="empty">Pick an email to read it.</div>';
    if (m) {
      const d = m.def;
      const opts = mailReplies(m);
      const actions = m.done
        ? (m.sent ? `<div class="sent ${m.verdict === 'bad' ? 'bad' : ''}">You sent: ${esc(m.sent)}</div>` : `<div class="sent bad">You didn't reply in time.</div>`)
        : `<div class="replies"><span class="small muted">Reply (${cd(m.expiresAt)}):</span>${opts.map((o, i) => `<button class="reply" data-act="mail-reply" data-arg="${m.id}:${i}">${esc(o.text)}</button>`).join('')}
           <button class="report" data-act="mail-report" data-arg="${m.id}">🚩 Report phishing</button></div>`;
      read = `<h2>${esc(d.subject)}</h2>
        <div class="from-line"><b>${esc(d.from.name)}</b> <span class="addr">&lt;${esc(d.from.email)}&gt;</span><br><span class="small muted">to ${S.vars.user}.goose@goosestate.edu</span></div>
        <div class="mail-body">${fill(d.body)}</div>${actions}`;
    }
    return `<div class="mail"><div class="mail-list" data-scroll="mail-list">${list}</div><div class="mail-read" data-scroll="mail-read-${S.lap.mailSel}">${read}</div></div>`;
  }

  // GooseSearch
  function urlBar(url, secure = true) {
    return `<div class="urlbar"><button class="btn" data-act="web-back" ${S.lap.webHist.length ? '' : 'disabled'}>←</button>
      <button class="btn" data-act="web-home">🏠</button><span class="url">${secure ? '🔒 ' : '<span class="insecure">⚠ Not secure</span> '}${esc(url)}</span></div>`;
  }

  function webView() {
    const w = S.lap.web;
    const box = (label) => `<div class="searchbox"><button data-act="search-box">🔍 ${label ? esc(label) : 'Search GooseSearch'}</button>${S.lap.dropdown ? suggestHtml() : ''}</div>`;
    if (w.view === 'home') {
      return urlBar('https://goosesearch.com') + `<div class="scroll pad" data-scroll="web-home"><div class="goose-logo"><span>Goose</span><span>Sea</span><span>rch</span> 🪿</div>${box()}
        <p class="hint" style="text-align:center;margin-top:20px">Click the search box for suggestions based on things you've seen.</p></div>`;
    }
    if (w.view === 'results') {
      const sug = S.suggest.find((s) => s.q === w.id) || { label: w.id };
      return urlBar('https://goosesearch.com/search?q=' + encodeURIComponent(sug.label)) +
        `<div class="scroll pad" data-scroll="res-${w.id}"><div style="max-width:620px">${box(sug.label)}</div><div class="results" style="margin-top:18px">${resultsHtml(w.id)}</div></div>`;
    }
    if (w.view === 'wiki') {
      const site = SITES[w.id];
      return urlBar(`https://goosepedia.org/wiki/${site.outlet.replace(/ /g, '_')}`) + `<div class="scroll pad wiki" data-scroll="wiki-${w.id}">
        <div class="small muted">Goosepedia, the free encyclopedia</div><h1>${esc(site.outlet)}</h1><p>${esc(site.wiki)}</p>
        <p class="small muted">Website: ${site.domain}</p></div>`;
    }
    if (w.id === 'scareware') {
      const sc = S.scare;
      const body = S.scareDone ? '<p>This page has been closed.</p>' :
        `${sc.body}<div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" data-act="scare-buy">${esc(sc.buy)}</button>
        <button class="btn" data-act="scare-close">Close this page</button></div>`;
      return urlBar(`http://${sc.domain}${sc.path}`, false) + `<div class="scroll scare" data-scroll="scare"><h1>${esc(sc.title)}</h1>${body}</div>`;
    }
    const site = SITES[w.id];
    const url = `${site.secure === false ? 'http' : 'https'}://${site.domain}${w.view === 'about' ? '/about' : site.path}`;
    if (site.kind === 'phish') {
      return urlBar(url, site.secure) + `<div class="scroll" data-scroll="phish-${w.id}" style="background:${site.theme.bg}"><div class="login">
        <b style="font-size:18px">${esc(site.title)}</b><span>${esc(site.subtitle)}</span>
        ${site.fields.map((f) => `<span class="field">${esc(fill(f))}</span>`).join('')}
        <button class="btn primary" data-act="phish-submit" data-arg="${w.id}">${esc(site.button)}</button>
        <span class="small muted">Your browser filled these in for you.</span></div></div>`;
    }
    if (site.kind === 'primary') S.traced.add(S.storyList.find((s) => s.primary === w.id)?.id);
    const th = site.theme;
    const isAbout = w.view === 'about';
    let body = isAbout ? `<h1>About ${esc(site.outlet)}</h1>${site.about}` :
      `${site.kind === 'ad' ? '<p class="small"><b>Sponsored</b></p>' : ''}<h1 style="color:${th.ink}">${esc(site.title)}</h1>${site.byline ? `<p class="small" style="opacity:.75">${esc(site.byline)}</p>` : ''}${site.body}`;
    if (site.kind === 'shop') {
      body += S.bought[w.id] ? '<p class="sent">Order placed! It\'s on its way.</p>'
        : `<div class="row"><button class="btn primary" data-act="shop-buy" data-arg="${w.id}">Buy ($${site.price})</button><button class="btn" data-act="web-back">No thanks</button></div>`;
    }
    return urlBar(url) + `<div class="site ${th.font} ${site.kind === 'primary' ? 'doc' : ''}" data-scroll="site-${w.id}-${w.view}" style="background:${th.bg};color:${th.ink}">
      <div class="site-head" style="background:${th.accent}">${esc(site.outlet)}</div><div class="site-body">${body}</div>
      ${site.about && !isAbout ? `<div class="site-foot"><button class="linkbtn" data-act="web-go" data-arg="about:${w.id}" data-href="https://${site.domain}/about">About us</button></div>` : ''}</div>`;
  }

  function suggestHtml() {
    if (!S.suggest.length) return '<div class="suggest"><button disabled>Nothing to search yet. Keep an eye on the TV.</button></div>';
    return `<div class="suggest">${S.suggest.map((s) => `<button data-act="search" data-arg="${s.q}">🔍 ${esc(s.label)}</button>`).join('')}</div>`;
  }

  function addSuggest(q, label) { if (!S.suggest.some((s) => s.q === q)) S.suggest.push({ q, label }); }

  function resultsHtml(q) {
    const story = storyDef(q);
    if (!story) {
      const id = String(q).split(':')[1];
      const site = SITES[id];
      if (!site) return '<p class="muted">No results.</p>';
      return `<div class="result"><div class="src"><span class="fav" style="background:#555">G</span><span>Goosepedia<br><span class="small muted">goosepedia.org › wiki › ${esc(site.outlet)}</span></span></div>
          <button class="title" data-act="web-go" data-arg="wiki:${id}" data-href="https://goosepedia.org/wiki/${esc(site.outlet.replace(/ /g, '_'))}">${esc(site.outlet)} - Goosepedia</button>
          <div class="snip">${esc(site.wiki.length > 140 ? site.wiki.slice(0, 140) + '…' : site.wiki)}</div></div>
        <div class="result"><div class="src"><span class="fav" style="background:${site.theme.accent}">${site.outlet[0]}</span><span>${esc(site.outlet)}<br><span class="small muted">${site.domain} › about</span></span></div>
          <button class="title" data-act="web-go" data-arg="about:${id}" data-href="https://${site.domain}/about">About ${esc(site.outlet)}</button>
          <div class="snip">What ${esc(site.outlet)} says about itself.</div></div>`;
    }
    const items = [story.sponsored, ...S.order[q]];
    for (const id of story.results.concat(story.sponsored)) addSuggest('outlet:' + id, SITES[id].outlet);
    return items.map((id) => {
      const s = SITES[id];
      const ad = s.kind === 'ad';
      const about = S.lap.aboutOpen === id ? `<div class="about-panel"><b>About this source</b><p style="margin:4px 0">${esc(s.wiki)}</p>
        <button class="linkbtn" data-act="search" data-arg="outlet:${id}">Search for more about ${esc(s.outlet)}</button></div>` : '';
      return `<div class="result">${ad ? '<div class="sponsored-tag">Sponsored</div>' : ''}
        <div class="src"><span class="fav" style="background:${s.theme.accent}">${s.outlet[0]}</span><span>${esc(s.outlet)}<br><span class="small muted">https://${s.domain}${esc(s.path.slice(0, 28))}</span></span>
        <button class="dots" title="About this source" aria-label="About this source" data-act="about-result" data-arg="${id}">⋮</button></div>
        <button class="title" data-act="web-go" data-arg="site:${id}" data-href="https://${s.domain}${s.path}">${esc(s.title)}</button>
        <div class="snip">${esc(s.snippet || '')}</div>${about}</div>`;
    }).join('');
  }

  function webGo(arg, push = true) {
    const cut = arg.indexOf(':'); // ids can contain colons ("outlet:gazette-pond")
    const view = cut < 0 ? arg : arg.slice(0, cut), id = cut < 0 ? undefined : arg.slice(cut + 1);
    if (push && S.lap.app === 'web') S.lap.webHist.push({ ...S.lap.web });
    S.lap.web = { view, id };
    S.lap.dropdown = false;
    S.lap.app = 'web';
    const site = SITES[id];
    if ((view === 'site' || view === 'about') && site && site.wiki && ['reputable', 'partisan', 'mixed', 'ad'].includes(site.kind)) addSuggest('outlet:' + id, site.outlet);
    renderLapTabs(); renderLapView();
  }

  // ---------- Arcade ----------
  function arcadeView() {
    const ad = S.scareDone
      ? `<button class="arcade-ad" data-go="site:glorp-ad" data-href="https://glorp.com/genius"><span>Sponsored</span> 🥤 Glorp Genius. Think Fizzier™</button>`
      : `<button class="arcade-ad warn" data-go="site:scareware" data-href="http://${S.scare.domain}${S.scare.path}"><span>Sponsored</span> ${esc(S.scare.banner)}</button>`;
    const left = Math.max(0, cfg.arcadeReliefPerWeek - (S.arcadeRelief[week()] || 0));
    const games = [['runner', '🪿 Goose Run'], ['pong', '🥚 Honk Pong']];
    return `<div class="urlbar"><span class="url">🔒 https://waddleworld.games</span></div>
      <div class="scroll arcade" data-scroll="arcade"><div class="arcade-head">🎮 WaddleWorld Arcade</div>${ad}
      <div class="row" style="justify-content:center;margin:8px 0">${games.map(([id, name]) => `<button class="btn ${S.lap.arcade === id ? 'primary' : ''}" data-act="arcade-game" data-arg="${id}">${name}</button>`).join('')}</div>
      <canvas id="arcade-canvas" data-game="${S.lap.arcade}" tabindex="0" aria-label="Arcade game"></canvas>
      <p class="small arcade-note">Playing eases stress a little (<span id="arcade-left">${left}</span> more this week), but the clock keeps ticking!</p></div>`;
  }

  function startArcade() {
    Arcade.start($('arcade-canvas'), S.lap.arcade, {
      active: () => !!S && !S.paused && !S.over && S.lap.app === 'arcade' && !document.hidden,
      onPlay: (dt) => {
        S.arcadePlay += dt;
        if (S.arcadePlay < 6) return; // one point of relief per 6 seconds of play
        S.arcadePlay = 0;
        const w = week(), used = S.arcadeRelief[w] || 0;
        if (used >= cfg.arcadeReliefPerWeek) return;
        S.arcadeRelief[w] = used + 1;
        addStress(-1);
        const el = $('arcade-left');
        if (el) el.textContent = cfg.arcadeReliefPerWeek - used - 1;
      }
    });
  }

  // ---------- Phone ----------
  function renderPhone() {
    const pv = S.phone.view;
    const unreadTexts = S.texts.filter((x) => x.status === 'new').length;
    $('phone-nav').innerHTML = [['home', `💬${unreadTexts ? `<span class="badge">${unreadTexts}</span>` : ''}`], ['bank', '🏦 Bank'], ['stroll', '🚶 Stroll']]
      .map(([id, label]) => `<button class="${pv === id || (id === 'home' && pv.startsWith('thread')) ? 'on' : ''}" data-act="phone" data-arg="${id}">${label}</button>`).join('');
    let html = '';
    if (pv === 'home') {
      const threads = [];
      for (const x of S.texts.slice().reverse()) if (!threads.some((t) => t.from === x.from)) threads.push(x);
      html = `<div class="ph-title">Messages</div>` + (threads.length ? threads.map((x) => {
        const unread = S.texts.some((y) => y.from === x.from && y.status === 'new');
        const waiting = S.texts.some((y) => y.from === x.from && !y.done);
        return `<button class="thread-item" data-act="phone" data-arg="thread:${esc(x.from)}"><b><span>${esc(x.from)}</span>${unread ? '<span class="dot"></span>' : waiting ? '<span class="small">↩</span>' : ''}</b><span class="prev">${esc(x.def.body)}</span></button>`;
      }).join('') : '<div class="empty">No messages yet.</div>');
    } else if (pv.startsWith('thread:')) {
      const from = pv.slice(7);
      const items = S.texts.filter((x) => x.from === from);
      items.forEach((x) => { if (x.status === 'new') x.status = 'read'; });
      const bubbles = items.map((x) => {
        let b = `<div class="bub in ${x.def.kind === 'ad' ? 'ad' : ''}">${esc(x.def.body)}${x.def.kind === 'friend' ? `<div class="bub-meta">Cost: ${x.def.cost ? '$' + x.def.cost : 'free'}</div>` : ''}</div>`;
        if (x.sent) b += `<div class="bub out">${esc(x.sent)}</div>`;
        else if (x.status === 'missed') b += '<div class="bub-meta">No reply</div>';
        return b;
      }).join('');
      const pending = items.find((x) => !x.done);
      const replies = pending ? `<div class="ph-replies"><span class="bub-meta">Reply: ${cd(pending.expiresAt)}</span>${textReplies(pending).map((r, i) =>
        `<button data-act="text-reply" data-arg="${pending.id}:${i}" ${r.disabled ? 'disabled' : ''}>${esc(r.disabled ? `Can't afford ($${pending.def.cost})` : r.text)}</button>`).join('')}</div>` : '';
      html = `<button class="ph-back" data-act="phone" data-arg="home">‹ Messages</button><div class="ph-title" style="padding-top:0">${esc(from)}</div><div class="bubbles">${bubbles}</div>${replies}`;
    } else if (pv === 'bank') {
      html = `<div class="ph-title">GooseBank</div><div class="bank-bal">$${S.money}</div><div class="small" style="padding:0 12px 6px">Weekly allowance: $${allowance()}</div>` +
        S.bank.map((b) => `<div class="tx"><span>${esc(b.what)}<br><span class="bub-meta">${b.when}</span></span><span class="${b.amount < 0 ? 'neg' : 'pos'}">${b.amount < 0 ? '−' : '+'}$${Math.abs(b.amount)}</span></div>`).join('');
    } else if (pv === 'stroll') {
      const used = S.walkWeek === week();
      html = `<div class="ph-title">Stroll</div><div style="padding:10px 12px;line-height:1.4"><p>A walk around the quad clears your head. Free, once per week.</p>
        <button class="btn primary" data-act="walk" ${used ? 'disabled' : ''}>${used ? 'You already walked this week' : 'Take a walk (−8 stress)'}</button></div>`;
    }
    swap($('phone-view'), html);
  }

  // ---------- TV ----------
  function renderTv() {
    if (!S) return;
    const tier = S.world > 0 ? 'good' : S.world < 0 ? 'bad' : null;
    const pool = S.tv.list.concat(P.ambient.any, tier ? P.ambient[tier] : []);
    const h = pool[S.tv.idx % pool.length];
    $('tv-icon').textContent = h.icon;
    $('tv-headline').textContent = h.headline;
    $('tv-headline').className = h.cls != null ? h.cls : tier === 'good' ? 'good' : 'calm';
  }

  // ---------- Toasts ----------
  function toast(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
  }
  const toastLap = (m) => toast($('lap-toast'), m);
  // Notifications can cover what you're reading, so a click on one closes it right away
  ['lap-toast', 'phone-toast'].forEach((id) => $(id).addEventListener('click', (e) => { e.stopPropagation(); clearTimeout(e.currentTarget._t); e.currentTarget.classList.remove('show'); }));
  const toastPhone = (m) => toast($('phone-toast'), m);

  // ---------- Overlays ----------
  function showOverlay(html) { $('overlay').innerHTML = html; $('overlay').classList.add('show'); $('overlay').scrollTop = 0; }
  function hideOverlay() { $('overlay').classList.remove('show'); $('stage').classList.remove('blur'); }

  function showTitle() {
    Sound.music('title');
    const code = CODE ? `<p class="code-chip">Class code <b>${CODE}</b>: everyone using this code gets the same semester. Sound starts off.
      <button class="linkbtn light" data-act="leave-code">Play a random semester instead</button></p>` : '';
    showOverlay(`<div class="ov title" style="padding-top:50px"><h1 class="wave" aria-label="Clickbait Campus">${waveTitle('Clickbait Campus')}</h1>
      <p><span class="beta-badge">Beta</span> One semester. Three screens. Way too many emails.</p>${code}
      <p><button class="btn primary" data-act="tutorial">Start (with a quick tour)</button>
      <button class="btn" data-act="start">Skip the tour</button></p>
      <p><button class="btn snd-btn" data-act="sound" data-arg="music"></button> <button class="btn snd-btn" data-act="sound" data-arg="sfx"></button>
      <button class="btn" data-act="feedback">💬 Send feedback</button></p>
      <p class="small"><button class="linkbtn light" data-act="teacher">For teachers: get a class code</button> · <button class="linkbtn light" data-act="join">Have a class code?</button></p>
      <p class="small">Version ${cfg.version} · a ${cfg.weeks}-week semester, about ${Math.round(cfg.weeks * cfg.weekSeconds * PACE / 60)} minutes · Thank you for testing!</p>
      <p class="credit">An Octopus Heart Software game · Music made with Suno · <button class="linkbtn light" data-act="privacy">Privacy</button></p></div>`);
    renderSoundBtns();
  }

  // Each letter floats on its own delay, so the title ripples like a slow wave
  const waveTitle = (text) => [...text].map((ch, i) => `<span aria-hidden="true" style="animation-delay:${(-i * 0.18).toFixed(2)}s">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');

  // ---------- Class codes ----------
  const CODE_WORDS = [
    ['SOGGY', 'CRUNCHY', 'FOGGY', 'WOBBLY', 'SLEEPY', 'FLUFFY', 'DAMP', 'SNEAKY', 'CHEERFUL', 'MOODY', 'TINY', 'BRAVE'],
    ['GOOSE', 'PRETZEL', 'PUDDLE', 'GNOME', 'SOCK', 'CLOUD', 'WAFFLE', 'BASKET', 'NAP', 'DUCK', 'CRUMB', 'KAZOO']
  ];
  const makeCode = () => [CODE_WORDS[0], CODE_WORDS[1]].map((w) => w[Math.floor(Math.random() * w.length)]).join('-') + '-' + (10 + Math.floor(Math.random() * 90));
  const codeLink = (code) => `${location.origin}${location.pathname}?code=${code}`;

  function showTeacher(code = makeCode()) {
    showOverlay(`<div class="ov teacher"><h2>For teachers</h2>
      <p>Give your class a code, and every student who uses it gets <b>the same semester</b>: the same classes, emails, scams and news stories. That makes it easy to discuss the debrief together.</p>
      <p>Music and sound start <b>off</b> for everyone using a class code, so the room stays quiet. Students can turn sound on if they have headphones.</p>
      <div class="code-box">${code}</div>
      <p>Share this link, or have students choose "Have a class code?" and type the code:</p>
      <p class="code-link">${esc(codeLink(code))}</p>
      <p><button class="btn primary" data-act="copy-link" data-arg="${code}">Copy link</button>
      <button class="btn" data-act="teacher">Make a different code</button>
      <button class="btn" data-act="use-code" data-arg="${code}">Try this code myself</button></p>
      <p><button class="linkbtn light" data-act="restart">Back</button></p></div>`);
  }

  function showJoin() {
    showOverlay(`<div class="ov"><h2>Join your class</h2><p>Type the code your teacher gave you.</p>
      <p><input id="join-code" class="code-input" maxlength="30" placeholder="SOGGY-PRETZEL-42" aria-label="Class code" autocomplete="off"></p>
      <p><button class="btn primary" data-act="join-go">Join</button> <button class="btn" data-act="restart">Back</button></p></div>`);
    const input = $('join-code');
    input.focus();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') actions['join-go'](); });
  }

  // ---------- Feedback and privacy ----------
  // Feedback opens the player's own email app with a message to support@, in the same format as every
  // Octopus Heart app ("<App> feedback (v<version>)"), so the daily support digest picks it up.
  // Nothing is sent until they press Send. The game pauses while the panel is open.
  const FEEDBACK_EMAIL = 'support@octopusheartsoftware.com';
  let beforePanel = null; // the overlay to go back to, and whether the game was running

  function deviceInfo() {
    const ua = navigator.userAgent;
    const os = /CrOS/.test(ua) ? 'ChromeOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'browser';
    return `${os} · ${browser} · window ${innerWidth}×${innerHeight}`;
  }

  function feedbackDetails(kind) {
    const where = !S ? 'Title screen' : S.over ? `Finished (${S.over})` : S.tutorial != null ? 'Tour' : `Week ${week()}, ${clockText()}`;
    return ['', '', '', '---', 'Please keep the lines below; they help us fix problems.',
      `App: Clickbait Campus ${cfg.version}`, `Type: ${kind}`, `Device: ${deviceInfo()}`, `Where: ${where}`,
      S ? `Classes: ${S.classList.map((c) => c.code).join(', ')}` : null, S ? `News: ${S.storyList.map((s) => s.id).join(', ')}` : null,
      CODE ? `Class code: ${CODE}` : null].filter((l) => l != null).join('\n');
  }

  function showFeedback() {
    if (!beforePanel) {
      const running = !!S && !S.over && !S.paused && S.tutorial == null && !$('overlay').classList.contains('show');
      if (running) { S.paused = true; Sound.setPaused(true); $('stage').classList.add('blur'); }
      beforePanel = { html: $('overlay').classList.contains('show') ? $('overlay').innerHTML : null, running };
    }
    showOverlay(`<div class="ov feedback"><h2>💬 Send feedback</h2>
      <p>Thanks for testing Clickbait Campus! Pick what kind of feedback it is, and your email app will open with a message to us. Nothing is sent until you press Send.</p>
      <p><button class="btn primary" data-act="feedback-send" data-arg="Bug">🐞 Something went wrong</button>
      <button class="btn primary" data-act="feedback-send" data-arg="Idea">💡 I have an idea</button>
      <button class="btn primary" data-act="feedback-send" data-arg="Content">📝 About the readings or news</button>
      <button class="btn primary" data-act="feedback-send" data-arg="Other">💬 Something else</button></p>
      <p class="small">Email app didn't open? Write to <b>${FEEDBACK_EMAIL}</b> and paste in the details:
      <button class="linkbtn light" data-act="feedback-copy">Copy the details</button></p>
      <p class="small">The details say which version, browser and semester you were playing, so we can find problems. No personal information is added. We'll only use your email address to reply.</p>
      <p><button class="btn" data-act="panel-close">Back</button></p></div>`);
  }

  function showPrivacy() {
    if (!beforePanel) beforePanel = { html: $('overlay').innerHTML, running: false };
    showOverlay(`<div class="ov privacy"><h2>Privacy</h2>
      <p><b>Clickbait Campus collects nothing about you.</b> There are no accounts, no ads, no tracking and no analytics.</p>
      <p>The only thing the game remembers is whether you turned music and sounds on or off, saved in your own browser. Everything else, including your grades and choices, disappears when you close the page.</p>
      <p>The game, its fonts and its music all load from octopusheartsoftware.com. Nothing loads from other companies.</p>
      <p>If you send feedback, it's an ordinary email from your own email app. We use it only to reply and to improve the game.</p>
      <p>Everyone, school, company and website in the game is made up.</p>
      <p class="small">Questions? Email ${FEEDBACK_EMAIL}. See also the <a class="light" href="https://octopusheartsoftware.com/privacy.html" target="_blank" rel="noopener">Octopus Heart Software privacy policy</a>.</p>
      <p><button class="btn" data-act="panel-close">Back</button></p></div>`);
  }

  function closePanel() {
    const prev = beforePanel;
    beforePanel = null;
    if (prev && prev.html) { showOverlay(prev.html); renderSoundBtns(); return; }
    hideOverlay();
    if (prev && prev.running) { S.paused = false; Sound.setPaused(false); }
  }

  const goToCode = (code) => { location.search = code ? '?code=' + encodeURIComponent(code) : ''; };

  // Music and sound-effect toggles, on the HUD and the title screen
  function renderSoundBtns() {
    document.querySelectorAll('.snd-btn').forEach((b) => {
      const on = Sound.settings[b.dataset.arg];
      b.textContent = b.dataset.arg === 'music' ? (on ? '🎵 Music: on' : '🎵 Music: off') : (on ? '🔊 Sounds: on' : '🔇 Sounds: off');
      b.classList.toggle('off', !on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function showEnd(reason, course) {
    const world = S.world / (S.storyList.length * 2);
    const ending = C.endings.find((e) => world >= e.min);
    Sound.setStress(0);
    Sound.music(world >= 0 ? 'ending-hopeful' : 'ending-moody');
    const titles = {
      complete: ['Semester complete!', `You made it through all ${cfg.weeks} weeks.`],
      dropout: ['You dropped out', 'Your stress hit 100. Time to go home and rest.'],
      fail: ['You failed a class', `You missed ${cfg.missesToFail} quizzes in ${course ? course.code : 'a class'}, so it's an automatic F.`]
    }[reason];
    const grades = S.classList.map((c) => { const g = courseGrade(c.id); return `${c.code}: <b>${g == null ? '—' : letter(g) + ' (' + g + '%)'}</b>`; }).join('<br>');
    S.debriefCat = 'all';
    showOverlay(`<div class="ov"><h2>${titles[0]}</h2><p>${titles[1]}</p>${CODE ? `<p class="small">Class code: <b>${CODE}</b></p>` : ''}
      <div class="results-grid"><div class="stat">GPA<b>${reason === 'complete' ? gpa() : '—'}</b></div><div class="stat">Money<b>$${S.money}</b></div>
      <div class="stat">Stress<b>${Math.round(S.stress)}</b></div><div class="stat">Grades<div class="small" style="margin-top:6px">${grades}</div></div></div>
      <div class="world-end"><div class="big">${ending.icon}</div><h2>${ending.title}</h2><p>${ending.text}</p></div>
      <h2>Semester debrief</h2><div id="debrief">${debriefHtml()}</div>
      <p><button class="btn primary" data-act="restart">Play again</button>${CODE ? ' <button class="btn" data-act="leave-code">Play a random semester</button>' : ''} <button class="btn" data-act="feedback">💬 Send feedback</button></p>
      <p class="credit">An Octopus Heart Software game · Music made with Suno</p></div>`);
  }

  // The debrief can be filtered by skill area, so a class can review one kind of choice at a time
  const DEBRIEF_CATS = [
    ['all', 'Everything', 'Every choice you made this semester.'],
    ['school', 'School', 'Readings, quizzes and emails from professors: close reading and professional replies.'],
    ['family', 'Family & friends', 'Check-ins, memes and hangouts: keeping your people happy without going broke.'],
    ['news', 'News & research', 'What you looked up on GooseSearch: SIFT, lateral reading and tracing claims.'],
    ['scam', 'Scams & spam', 'Phishing, scam texts, sponsored ads and pop-ups: spotting the tells.']
  ];
  const CAT_OF = { quiz: 'school', school: 'school', family: 'family', life: 'family', news: 'news', scam: 'scam' };

  function debriefHtml() {
    const cat = S.debriefCat;
    const tally = (c) => {
      const ls = S.log.filter((l) => c === 'all' || CAT_OF[l.type] === c);
      return { n: ls.length, good: ls.filter((l) => l.verdict === 'good').length, bad: ls.filter((l) => l.verdict === 'bad').length };
    };
    const tabs = DEBRIEF_CATS.map(([id, name]) => {
      const t = tally(id);
      return `<button class="deb-tab ${cat === id ? 'on' : ''}" data-act="debrief" data-arg="${id}" aria-pressed="${cat === id}">${name}<span>✔ ${t.good} · ✖ ${t.bad}</span></button>`;
    }).join('');
    const items = S.log.filter((l) => cat === 'all' || CAT_OF[l.type] === cat);
    const list = items.map((l) => `<div class="deb ${l.verdict}">${l.verdict === 'good' ? '✔' : l.verdict === 'bad' ? '✖' : '•'} <b>${esc(l.title)}</b>
      ${l.detail ? `<div>${esc(l.detail)}</div>` : ''}${l.lesson ? `<div class="lesson">${esc(l.lesson)}</div>` : ''}
      ${l.tells ? `<ul>${l.tells.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>`).join('');
    return `<div class="deb-tabs">${tabs}</div><p class="deb-about">${DEBRIEF_CATS.find((c) => c[0] === cat)[2]}</p>
      <div class="debrief">${list || '<p>Nothing in this category this time.</p>'}</div>`;
  }

  function renderSpeed() {
    const b = $('speed-btn');
    b.textContent = S.slow ? '🐢 Slow time: on' : '🐢 Slow time';
    b.setAttribute('aria-pressed', S.slow);
    b.classList.toggle('on', S.slow);
  }

  function setPaused(p) {
    if (!S || S.over || S.tutorial != null) return;
    S.paused = p;
    Sound.setPaused(p);
    $('stage').classList.toggle('blur', p);
    if (p) showOverlay('<div class="ov" style="padding-top:220px"><h2>Paused</h2><p><button class="btn primary" data-act="resume">Resume</button> <button class="btn" data-act="feedback">💬 Send feedback</button></p></div>');
    else hideOverlay();
  }

  // ---------- Actions ----------
  const actions = {
    start: () => start(),
    tutorial: () => tutorial(),
    'tut-next': () => { Sound.play('tick'); S.tutorial++; showTutStep(); },
    'tut-back': () => { Sound.play('tick'); S.tutorial--; showTutStep(); },
    'tut-skip': () => start(),
    sound: (a) => { Sound.toggle(a); renderSoundBtns(); },
    teacher: () => showTeacher(),
    join: () => showJoin(),
    'join-go': () => { const c = normCode($('join-code').value); if (c) goToCode(c); },
    'use-code': (a) => goToCode(a),
    'leave-code': () => goToCode(''),
    'copy-link': (a, el) => {
      const done = () => { el.textContent = 'Copied!'; };
      try { navigator.clipboard.writeText(codeLink(a)).then(done, () => { el.textContent = 'Select the link above to copy it'; }); } catch (e) { el.textContent = 'Select the link above to copy it'; }
    },
    speed: () => { if (!S || S.over) return; S.slow = !S.slow; renderSpeed(); },
    restart: () => showTitle(),
    debrief: (a) => { S.debriefCat = a; $('debrief').innerHTML = debriefHtml(); },
    pause: () => setPaused(true),
    feedback: () => showFeedback(),
    privacy: () => showPrivacy(),
    'panel-close': () => closePanel(),
    'feedback-send': (a) => {
      const subject = `Clickbait Campus feedback (v${cfg.version})`;
      location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(feedbackDetails(a))}`;
    },
    'feedback-copy': (a, el) => {
      const text = `To: ${FEEDBACK_EMAIL}\nSubject: Clickbait Campus feedback (v${cfg.version})\n${feedbackDetails('Other')}`;
      // If copying is blocked, show the text so it can be selected and copied by hand
      const fail = () => { el.insertAdjacentHTML('afterend', `<br><textarea class="feedback-text" readonly aria-label="Feedback details">${esc(text)}</textarea>`); el.remove(); };
      try { navigator.clipboard.writeText(text).then(() => { el.textContent = 'Copied!'; }, fail); } catch (e) { fail(); }
    },
    resume: () => setPaused(false),
    app: (a) => { S.lap.app = a; S.lap.dropdown = false; renderLapTabs(); renderLapView(); },
    noodle: (a) => { S.lap.noodle.view = a; renderLapView(); },
    answer: (a) => {
      const [cid, mid, qi, oi] = a.split(':');
      const q = S.courses[cid].quiz[mid];
      if (q.submitted || q.missed) return;
      q.answers[qi] = +oi; renderLapView();
    },
    submit: (a) => {
      const [cid, mid] = a.split(':');
      const [c, m] = moduleDef(mid), q = S.courses[cid].quiz[mid];
      if (q.submitted || q.missed) return;
      const { right, pct } = quizScore(m, q);
      q.submitted = true; q.score = pct;
      Sound.play('submit');
      if (q.score >= 75) addStress(-5); else if (q.score < 50) addStress(8);
      const ei = m.questions.findIndex((qq) => qq.fromEmail);
      let detail = '';
      if (ei >= 0 && q.answers[ei] !== m.questions[ei].answer) {
        detail = S.fired.has('mod-' + mid) ? `One answer came from a professor's email, not the reading.`
          : `One answer depended on a professor's email that hadn't arrived yet. When it comes, you can ask politely for a regrade.`;
      }
      log({ type: 'quiz', verdict: q.score >= 75 ? 'good' : q.score >= 50 ? 'mid' : 'bad', title: `${c.code} quiz (${m.title}): ${right}/${m.questions.length}`,
        detail, lesson: `Answers only exist in the readings and your professors' emails. Read closely.` });
      renderAll();
    },
    mail: (a) => {
      S.lap.mailSel = a;
      const m = S.mail.find((x) => x.id === a);
      if (m.status === 'new') m.status = 'read';
      renderLapTabs(); renderLapView();
    },
    'mail-reply': (a) => { const [id, i] = a.split(':'); resolveMail(S.mail.find((x) => x.id === id), { reply: +i }); },
    'mail-report': (a) => resolveMail(S.mail.find((x) => x.id === a), { reported: true }),
    'search-box': () => { S.lap.dropdown = !S.lap.dropdown; renderLapView(); },
    search: (a) => { if (a) webGo('results:' + a); },
    'about-result': (a) => { S.lap.aboutOpen = S.lap.aboutOpen === a ? null : a; renderLapView(); },
    'web-go': (a) => webGo(a),
    'web-back': () => { if (S.lap.webHist.length) { S.lap.web = S.lap.webHist.pop(); renderLapView(); } },
    'web-home': () => webGo('home'),
    'phish-submit': (a) => {
      const site = SITES[a];
      const m = S.mail.find((x) => x.id === site.mail && !x.done);
      if (m) resolveMail(m, { loggedIn: true });
      else {
        hacked();
        const p = P.phish.find((x) => x.id === site.mail);
        log({ type: 'scam', verdict: 'bad', title: `You entered your details on ${site.domain}`, detail: site.afterNote + ' (−$30, +20 stress)', tells: p && p.tells, lesson: 'Phishing tells you could have spotted:' });
      }
      S.lap.web = { view: 'home' }; S.lap.webHist = []; renderAll();
      toastLap('⚠️ That was a fake site. Check the address bar!');
    },
    'scare-buy': () => {
      if (S.scareDone) return;
      S.scareDone = true;
      Sound.play('scam');
      spend(S.scare.price, `${S.scare.domain}`);
      addStress(10);
      log({ type: 'scam', verdict: 'bad', title: `You paid a pop-up ad on ${S.scare.domain}`, detail: `It was fake. You paid $${S.scare.price} for nothing. (+10 stress)`, tells: S.scare.tells, lesson: S.scare.lesson });
      toastLap(`💸 −$${S.scare.price}. It was a fake pop-up.`);
      renderAll();
    },
    'scare-close': () => {
      if (S.scareDone) return;
      S.scareDone = true;
      log({ type: 'scam', verdict: 'good', title: 'You closed a fake pop-up ad', detail: 'Good call. Ads can\'t scan, fix or reward your laptop.', tells: S.scare.tells, lesson: S.scare.lesson });
      S.lap.app = 'arcade'; renderAll();
    },
    'shop-buy': (a) => {
      if (S.bought[a]) return;
      const site = SITES[a];
      S.bought[a] = true;
      spend(site.price, `${site.outlet} (${site.path.split('?')[1] || ''})`);
      log({ type: 'scam', verdict: 'mid', title: `You bought from ${site.outlet} through an affiliate link`, detail: `${site.affiliate || 'The writer'} earned a commission on your $${site.price}.`, tells: site.tells, lesson: `Affiliate links aren't always bad, but they mean the writer earns money when you buy.` });
      renderAll();
    },
    'arcade-game': (a) => { S.lap.arcade = a; renderLapView(true); },
    phone: (a) => { S.phone.view = a; renderPhone(); },
    'text-reply': (a) => { const [id, i] = a.split(':'); resolveText(S.texts.find((x) => x.id === id), { reply: +i }); },
    walk: () => { if (S.walkWeek === week()) return; S.walkWeek = week(); addStress(-8); renderAll(); toastPhone('🚶 That helped. Stress −8'); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act], [data-go], a[data-href]');
    if (!el || el.disabled) return;
    if (S && S.tutorial != null && !el.closest('#tut') && !['sound', 'feedback'].includes(el.dataset.act) && !el.closest('#overlay')) return;
    if (!el.dataset.act && !el.dataset.go) return toastLap('That page is outside this game.');
    if (el.dataset.go) { e.preventDefault(); return follow(el.dataset.go); }
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset.arg, el);
  });

  // Links inside emails and sites
  function follow(go) {
    const [kind, arg] = go.split(':');
    if (kind === 'noodle') { S.lap.app = 'noodle'; S.lap.noodle.view = 'course:' + arg; renderLapTabs(); renderLapView(); }
    else if (kind === 'site' && (SITES[arg] || arg === 'scareware')) webGo('site:' + arg);
  }

  // Hovering a link shows where it really goes, like a real browser's status bar
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-href]');
    $('lap-status').textContent = el ? el.dataset.href : '';
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.over && !S.paused && !$('overlay').classList.contains('show')) setPaused(true); });

  // Scale the 1280×720 stage to fit the window
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    $('stage').style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();
  showTitle();
})();
