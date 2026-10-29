// Three short example adventures, drawn in code, each in the style of a different kind of maker:
// - "Find Mittens!": a young maker, built almost entirely from stamps
// - "Pizza Night": a first-timer drawing by hand, wobbly lines and scribbly coloring
// - "Solace": a confident artist with a pen on a tablet, a quiet alien world in flat, layered shapes
// Randomness is seeded, so every copy looks the same.
import { CARD_W, CARD_H, ITEM_SIZE, uid, newCard, newItem, newProp, newLook, newButton, newAdventure } from './model.js?v=mvu71pwg';
import { canvas, stamp, words } from './demo.js?v=mvu71pwg';

const W = CARD_W, H = CARD_H;
const go = (props) => newButton(props);
const change = (what, to) => ({ id: uid(), what, to });

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shape(ctx, pts, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
const circle = (ctx, x, y, r, color) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
const ellipsePts = (cx, cy, rx, ry, n = 24) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)]);
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// =====================================================================================
// 1. Find Mittens! (stamps, bright fills, big excited words)
// =====================================================================================

const KID_FONT = '600 44px Lexend, "Segoe UI", sans-serif';
const KID_SMALL = '600 26px Lexend, "Segoe UI", sans-serif';

async function kidYard() {
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#7cc6f2'; ctx.fillRect(0, 0, W, 400);
  ctx.fillStyle = '#8fd14f'; ctx.fillRect(0, 400, W, 200);
  await stamp(ctx, 'sun', 820, 20, 130);
  await stamp(ctx, 'cloud', 520, 40, 130);
  await stamp(ctx, 'cloud', 640, 90, 90);
  await stamp(ctx, 'house', 330, 200, 300);
  await stamp(ctx, 'tree', 640, 230, 230);
  await stamp(ctx, 'fence', 0, 400, 120);
  await stamp(ctx, 'fence', 110, 400, 120);
  for (const [x, y, s] of [[260, 470, 70], [300, 500, 60], [620, 470, 80], [700, 500, 60], [560, 520, 50]]) await stamp(ctx, 'flower', x, y, s);
  await stamp(ctx, 'pine', 20, 180, 140);
  ctx.save(); ctx.translate(150, 520); ctx.scale(-1, 1); await stamp(ctx, 'arrow', 0, 0, 110); ctx.restore();
  await stamp(ctx, 'arrow', 820, 500, 110);
  words(ctx, 'MITTENS IS LOST!!!', 40, 30, '#c0392b', KID_FONT);
  words(ctx, 'where did she go', 40, 86, '#1b2a6b', KID_SMALL);
  words(ctx, 'forest', 165, 540, '#1b2a6b', KID_SMALL);
  words(ctx, 'pond', 830, 470, '#1b2a6b', KID_SMALL);
  return c.toDataURL('image/png');
}

async function kidForest() {
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#1b2a6b'; ctx.fillRect(0, 0, W, 380);
  ctx.fillStyle = '#2e8b3e'; ctx.fillRect(0, 380, W, 220);
  await stamp(ctx, 'moon', 760, 30, 120);
  for (const [x, y] of [[60, 140], [330, 120], [460, 30], [600, 110], [880, 180]]) await stamp(ctx, 'star', x, y, 40);
  for (const [x, y, s] of [[-30, 170, 260], [170, 210, 220], [560, 190, 240], [740, 160, 280]]) await stamp(ctx, 'pine', x, y, s);
  await stamp(ctx, 'ghost', 380, 170, 200);
  for (const [x, y, s] of [[120, 470, 90], [640, 480, 70], [700, 500, 60]]) await stamp(ctx, 'mushroom', x, y, s);
  words(ctx, 'A GHOST!!', 40, 30, '#f6d32d', KID_FONT);
  words(ctx, 'not mittens. spooky', 40, 86, '#ffffff', KID_SMALL);
  return c.toDataURL('image/png');
}

async function kidPond() {
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#7cc6f2'; ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = '#8fd14f'; ctx.fillRect(0, 300, W, 300);
  ctx.beginPath(); ctx.ellipse(430, 440, 330, 120, 0, 0, Math.PI * 2); ctx.fillStyle = '#1f5fbf'; ctx.fill();
  await stamp(ctx, 'sun', 40, 20, 110);
  await stamp(ctx, 'fish', 260, 400, 100);
  await stamp(ctx, 'fish', 470, 450, 80);
  await stamp(ctx, 'bird', 620, 120, 90);
  await stamp(ctx, 'rock', 740, 330, 190);
  await stamp(ctx, 'cat', 775, 230, 140);
  await stamp(ctx, 'grass', 60, 300, 90);
  await stamp(ctx, 'grass', 860, 470, 90);
  words(ctx, 'the pond', 300, 30, '#1b2a6b', KID_FONT);
  words(ctx, 'is that her??', 680, 190, '#c0392b', KID_SMALL);
  return c.toDataURL('image/png');
}

async function kidFound() {
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#f28ab2'; ctx.fillRect(0, 0, W, H);
  for (const [x, y, s] of [[60, 160, 90], [800, 120, 110], [120, 420, 80], [780, 400, 100], [650, 60, 60], [250, 60, 70]]) await stamp(ctx, 'heart', x, y, s);
  for (const [x, y, s] of [[200, 280, 60], [700, 280, 60], [600, 515, 50], [380, 110, 50], [880, 520, 50]]) await stamp(ctx, 'star', x, y, s);
  await stamp(ctx, 'cat', 330, 170, 300);
  words(ctx, 'YOU FOUND MITTENS!!!', 160, 30, '#ffffff', KID_FONT);
  words(ctx, 'the end :)', 400, 520, '#ffffff', KID_SMALL);
  return c.toDataURL('image/png');
}

export async function buildKitten() {
  await document.fonts.load(KID_FONT).catch(() => {});
  const adv = newAdventure('Find Mittens!');
  const yard = Object.assign(adv.cards[0], { name: 'My yard', image: await kidYard() });
  const forest = Object.assign(newCard('Spooky forest'), { image: await kidForest(), back: true });
  const pond = Object.assign(newCard('The pond'), { image: await kidPond(), back: true });
  const found = Object.assign(newCard('Found her'), { image: await kidFound(), ending: true });
  adv.cards.push(forest, pond, found);
  yard.buttons.push(
    go({ x: 20, y: 470, w: 170, h: 120, target: forest.id, sound: 'footsteps' }),
    go({ x: 800, y: 460, w: 150, h: 140, target: pond.id, sound: 'footsteps' }),
    go({ x: 400, y: 330, w: 160, h: 160, sound: 'knock' }),
    go({ kind: 'oval', x: 820, y: 20, w: 130, h: 130, sound: 'magic' }),
  );
  forest.buttons.push(go({ kind: 'oval', x: 400, y: 180, w: 160, h: 180, sound: 'whoosh' }), go({ x: 110, y: 460, w: 110, h: 110, sound: 'boing' }));
  pond.buttons.push(
    go({ kind: 'oval', x: 785, y: 235, w: 130, h: 120, target: found.id, sound: 'fanfare' }),
    go({ kind: 'oval', x: 120, y: 340, w: 600, h: 200, sound: 'splash' }),
    go({ kind: 'oval', x: 620, y: 120, w: 90, h: 90, sound: 'bird' }),
  );
  found.buttons.push(go({ kind: 'oval', x: 360, y: 200, w: 240, h: 240, sound: 'chime' }));
  return adv;
}

// =====================================================================================
// 2. Pizza Night (hand-drawn: wobbly lines, scribbly crayon coloring, lots of white paper)
// =====================================================================================

const HAND_FONT = '500 30px Lexend, "Segoe UI", sans-serif';

// Lines the way a mouse draws them: never quite straight.
function jitter(pts, r, amt, closed) {
  const out = [], segs = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 14));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([x1 + (x2 - x1) * t + (r() - 0.5) * amt, y1 + (y2 - y1) * t + (r() - 0.5) * amt]); }
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}
function wobble(ctx, r, pts, { color = '#222222', width = 4, fill = null, closed = false, amt = 4 } = {}) {
  const p = jitter(pts, r, amt, closed);
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
  if (closed) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = ctx.lineCap = 'round'; ctx.stroke();
}
// Coloring in with a brush, back and forth, missing bits and going over the lines a little.
function scribble(ctx, r, pts, color, gap = 10) {
  ctx.save();
  const edge = jitter(pts, r, 14, true);
  ctx.beginPath(); ctx.moveTo(edge[0][0], edge[0][1]);
  for (const q of edge.slice(1)) ctx.lineTo(q[0], q[1]);
  ctx.closePath(); ctx.clip();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10;
  ctx.strokeStyle = color; ctx.lineWidth = gap * 0.85; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = Math.min(...ys) - gap; y < Math.max(...ys) + gap; y += gap) { ctx.moveTo(x0, y + (r() - 0.5) * 5); ctx.lineTo(x1, y + gap * 0.7 + (r() - 0.5) * 5); }
  ctx.stroke();
  ctx.restore();
}
function handWords(ctx, text, x, y, angle = -0.03, color = '#222222') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  words(ctx, text, 0, 0, color, HAND_FONT);
  ctx.restore();
}
function stickPerson(ctx, r, x, y, s = 1, hat = false) {
  wobble(ctx, r, ellipsePts(x, y, 20 * s, 22 * s, 14), { closed: true, fill: '#ffe0b2', width: 3, amt: 2 });
  ctx.fillStyle = '#222222'; ctx.fillRect(x - 8 * s, y - 6 * s, 4, 5); ctx.fillRect(x + 5 * s, y - 6 * s, 4, 5);
  wobble(ctx, r, [[x - 9 * s, y + 7 * s], [x, y + 12 * s], [x + 9 * s, y + 6 * s]], { width: 3, amt: 1 });
  wobble(ctx, r, [[x, y + 22 * s], [x, y + 95 * s]], { width: 4 });
  wobble(ctx, r, [[x - 38 * s, y + 40 * s], [x, y + 50 * s], [x + 38 * s, y + 36 * s]], { width: 4 });
  wobble(ctx, r, [[x - 28 * s, y + 150 * s], [x, y + 95 * s], [x + 28 * s, y + 150 * s]], { width: 4 });
  if (hat) wobble(ctx, r, [[x - 20 * s, y - 18 * s], [x - 26 * s, y - 52 * s], [x - 6 * s, y - 44 * s], [x + 8 * s, y - 56 * s], [x + 26 * s, y - 46 * s], [x + 20 * s, y - 18 * s]], { closed: true, fill: '#ffffff', width: 3 });
}
function pizza(ctx, r, x, y, rad, missing = false) {
  const crust = ellipsePts(x, y, rad, rad * 0.9, 20);
  if (missing) crust.splice(1, 4, [x, y]);
  wobble(ctx, r, crust, { closed: true, fill: '#f0c27a', width: 4 });
  const inner = ellipsePts(x, y, rad * 0.8, rad * 0.72, 18);
  if (missing) inner.splice(1, 3, [x, y]);
  scribble(ctx, r, inner, '#e8613c', 9);
  for (const [dx, dy] of [[-0.4, -0.3], [0.1, 0.4], [-0.2, 0.3], [0.35, -0.1], [-0.5, 0.15], [0.05, -0.45]]) {
    if (missing && dx > 0.05 && dy > -0.2 && dy < 0.5) continue;
    wobble(ctx, r, ellipsePts(x + dx * rad, y + dy * rad, rad * 0.1, rad * 0.1, 8), { closed: true, fill: '#9c1f1f', width: 2, amt: 2 });
  }
}

async function handHome() {
  const r = seeded(11), [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  wobble(ctx, r, [[0, 430], [960, 425]], { width: 5 });                                           // the floor line
  scribble(ctx, r, [[0, 432], [960, 428], [960, 600], [0, 600]], '#c9a27a', 14);                   // floor, coloured in
  wobble(ctx, r, rectPts(90, 90, 170, 140), { closed: true, fill: '#bfe3f7', width: 5 });          // window
  wobble(ctx, r, [[175, 90], [178, 230]], { width: 4 }); wobble(ctx, r, [[90, 160], [260, 158]], { width: 4 });
  wobble(ctx, r, rectPts(700, 140, 170, 290), { closed: true, fill: '#8d5524', width: 5 });        // door
  circle(ctx, 840, 290, 9, '#f6d32d');
  wobble(ctx, r, [[340, 330], [600, 335]], { width: 9, color: '#7a4a22' });                        // table
  wobble(ctx, r, [[365, 335], [360, 430]], { width: 7, color: '#7a4a22' }); wobble(ctx, r, [[580, 337], [585, 430]], { width: 7, color: '#7a4a22' });
  stickPerson(ctx, r, 260, 290, 0.95);
  handWords(ctx, 'Im SO hungry', 300, 40);
  handWords(ctx, 'lets get pizza!!', 320, 82, 0.02);
  handWords(ctx, 'door', 740, 100, -0.06);
  return c.toDataURL('image/png');
}

async function handStreet() {
  const r = seeded(22), [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  scribble(ctx, r, rectPts(0, 0, 960, 120), '#9fd3f5', 16);                                        // sky, only along the top
  wobble(ctx, r, ellipsePts(110, 90, 50, 50, 14), { closed: true, fill: '#f6d32d', width: 4 });     // sun
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; wobble(ctx, r, [[110 + Math.cos(a) * 62, 90 + Math.sin(a) * 62], [110 + Math.cos(a) * 88, 90 + Math.sin(a) * 88]], { width: 4, color: '#f0a020' }); }
  wobble(ctx, r, [[0, 470], [960, 465]], { width: 5 });
  scribble(ctx, r, [[0, 472], [960, 467], [960, 600], [0, 600]], '#9a9a9a', 13);                  // road
  for (let x = 40; x < 960; x += 160) wobble(ctx, r, [[x, 540], [x + 70, 538]], { width: 7, color: '#ffffff' });
  wobble(ctx, r, rectPts(420, 170, 360, 300), { closed: true, fill: '#f9e0cf', width: 5 });        // pizza shop
  wobble(ctx, r, [[400, 175], [600, 90], [800, 175]], { closed: true, fill: '#c0392b', width: 5 });
  wobble(ctx, r, rectPts(560, 330, 90, 140), { closed: true, fill: '#7a4a22', width: 5 });         // shop door
  wobble(ctx, r, rectPts(460, 210, 270, 70), { closed: true, fill: '#ffffff', width: 4 });
  handWords(ctx, 'PIZZA', 520, 225, 0.04, '#c0392b');
  wobble(ctx, r, rectPts(120, 380, 200, 70), { closed: true, fill: '#1f5fbf', width: 5 });         // car
  wobble(ctx, r, [[160, 380], [180, 335], [270, 335], [290, 380]], { width: 5, fill: '#7cc6f2' });
  for (const x of [160, 285]) wobble(ctx, r, ellipsePts(x, 455, 25, 25, 12), { closed: true, fill: '#222222', width: 3 });
  stickPerson(ctx, r, 370, 300, 0.8);
  handWords(ctx, 'the pizza place', 360, 20, -0.02);
  return c.toDataURL('image/png');
}

async function handShop() {
  const r = seeded(33), [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  scribble(ctx, r, rectPts(0, 0, 960, 330), '#fff3c4', 18);                                        // yellow walls, half done
  wobble(ctx, r, rectPts(0, 330, 960, 120), { closed: true, fill: '#c0392b', width: 5 });          // counter
  for (let x = 30; x < 960; x += 90) wobble(ctx, r, rectPts(x, 345, 40, 40), { closed: true, width: 3, color: '#ffffff' });
  stickPerson(ctx, r, 620, 150, 1.1, true);                                                        // the chef
  pizza(ctx, r, 330, 270, 95);
  handWords(ctx, 'one pizza please', 60, 40);
  handWords(ctx, 'that will be 1 dollar', 520, 470, 0.03, '#7a4a22');
  return c.toDataURL('image/png');
}

async function handYum() {
  const r = seeded(44), [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  pizza(ctx, r, 360, 330, 180, true);
  stickPerson(ctx, r, 720, 230, 1.3);
  handWords(ctx, 'YUM', 640, 80, -0.1, '#c0392b');
  handWords(ctx, 'THE END', 60, 40, 0.02);
  return c.toDataURL('image/png');
}

async function handMoney() {
  const r = seeded(55), [c, ctx] = canvas(ITEM_SIZE, ITEM_SIZE);
  wobble(ctx, r, rectPts(30, 80, 240, 140), { closed: true, fill: '#8fd14f', width: 8 });
  wobble(ctx, r, ellipsePts(150, 150, 40, 40, 12), { closed: true, width: 6 });
  ctx.save(); ctx.font = '600 70px Lexend, sans-serif'; ctx.fillStyle = '#2e8b3e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 150, 154); ctx.restore();
  return c.toDataURL('image/png');
}

export async function buildPizza() {
  await document.fonts.load(HAND_FONT).catch(() => {});
  const adv = newAdventure('Pizza Night');
  const money = Object.assign(newItem('Dollar'), { image: await handMoney() });
  adv.items.push(money);
  const home = Object.assign(adv.cards[0], { name: 'Home', image: await handHome() });
  const street = Object.assign(newCard('Street'), { image: await handStreet(), back: true });
  const shop = Object.assign(newCard('Pizza place'), { image: await handShop(), back: true });
  const yum = Object.assign(newCard('Yum'), { image: await handYum(), ending: true });
  adv.cards.push(street, shop, yum);
  home.items.push({ id: uid(), itemId: money.id, x: 430, y: 255, size: 90 });
  home.buttons.push(go({ x: 700, y: 140, w: 170, h: 290, target: street.id, sound: 'door' }));
  street.buttons.push(go({
    x: 560, y: 330, w: 90, h: 140, target: shop.id, sound: 'ding', needs: money.id, useUp: true,
    lockedMsg: 'you need money for pizza!! (look at home)', lockedSound: 'sad',
  }), go({ x: 120, y: 330, w: 200, h: 150, sound: 'alarm' }));
  shop.buttons.push(go({ kind: 'oval', x: 235, y: 185, w: 190, h: 170, target: yum.id, sound: 'coin' }));
  return adv;
}

// =====================================================================================
// 3. Solace (a skilled artist with a pen: flat layered shapes, banded skies, a lone traveller)
// =====================================================================================

const CAPTION = '500 17px Lexend, "Segoe UI", sans-serif';

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
// A sky in flat steps rather than a smooth fade, the way a painter blocks in color.
function ramp(stops, steps) {
  const out = [];
  for (let s = 0; s < stops.length - 1; s++) for (let i = 0; i < steps; i++) out.push(mix(stops[s], stops[s + 1], i / steps));
  out.push(stops[stops.length - 1]);
  return out;
}
function bands(ctx, y0, y1, colors) {
  const h = (y1 - y0) / colors.length;
  colors.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(0, Math.floor(y0 + i * h), W, Math.ceil(h) + 1); });
}
function starsIn(ctx, r, n, maxY) {
  for (let i = 0; i < n; i++) { ctx.globalAlpha = 0.3 + r() * 0.6; ctx.fillStyle = '#f2ecff'; const s = r() < 0.15 ? 2.5 : 1.4; ctx.fillRect(r() * W, r() * maxY, s, s); }
  ctx.globalAlpha = 1;
}
function glow(ctx, x, y, rad, color) {
  for (const [k, a] of [[1, 0.1], [0.62, 0.18], [0.34, 0.45], [0.16, 1]]) { ctx.globalAlpha = a; circle(ctx, x, y, rad * k, color); }
  ctx.globalAlpha = 1;
}
// A jagged skyline across the card, with the odd tall spire.
function ridge(ctx, r, base, amp, step, color, spires = 0.12) {
  const pts = [[0, H]];
  for (let x = -step; x <= W + step; x += step) {
    const tall = r() < spires;
    pts.push([x, base - r() * amp - (tall ? amp * 1.6 : 0)]);
    if (tall) pts.push([x + step * 0.25, base - amp * 0.3]);
  }
  pts.push([W, H]);
  shape(ctx, pts, color);
}
// A pen stroke that thins out, like pressing less at the end.
function taper(ctx, pts, w0, w1, color) {
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]);
  });
  shape(ctx, [...L, ...R.reverse()], color);
}
function curve(x, y, dx, dy, bend, n = 10) {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return [x + dx * t + Math.sin(t * Math.PI) * bend, y + dy * t]; });
}
// The traveller: a slim silhouette with a thin edge of light on one side.
function traveller(ctx, x, y, h, color, rim) {
  const u = h / 8;
  const body = [[x - 0.5 * u, y - 6.6 * u], [x + 0.5 * u, y - 6.6 * u], [x + 0.62 * u, y - 3.9 * u], [x + 0.36 * u, y - 3.8 * u], [x + 0.42 * u, y], [x + 0.12 * u, y], [x, y - 3.3 * u], [x - 0.14 * u, y], [x - 0.46 * u, y], [x - 0.36 * u, y - 3.8 * u], [x - 0.62 * u, y - 3.9 * u]];
  shape(ctx, body, color);
  circle(ctx, x, y - 7.3 * u, 0.55 * u, color);
  shape(ctx, [[x + 0.42 * u, y - 6.5 * u], [x + 0.55 * u, y - 6.5 * u], [x + 0.66 * u, y - 3.95 * u], [x + 0.5 * u, y - 3.9 * u]], rim);
  shape(ctx, [[x + 0.3 * u, y - 7.7 * u], [x + 0.55 * u, y - 7.3 * u], [x + 0.4 * u, y - 6.9 * u]], rim);
}
function caption(ctx, text, color = '#e9e4f5') {
  ctx.save();
  ctx.font = CAPTION; ctx.letterSpacing = '6px'; ctx.globalAlpha = 0.85; ctx.fillStyle = color; ctx.textBaseline = 'top';
  ctx.fillText(text, 40, 560);
  ctx.restore();
}

async function alienArrival() {
  const r = seeded(101), [c, ctx] = canvas(W, H);
  bands(ctx, 0, 420, ramp(['#10142e', '#2b3366', '#6a5a92', '#d8988a'], 5));
  starsIn(ctx, r, 90, 230);
  circle(ctx, 710, 170, 115, '#cdbbe0');                                                         // the ringed planet
  ctx.save(); ctx.beginPath(); ctx.arc(710, 170, 115, 0, Math.PI * 2); ctx.clip(); circle(ctx, 670, 140, 118, '#5a5390'); ctx.restore();
  ctx.save(); ctx.translate(710, 170); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, 190, 34, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.strokeStyle = '#efe2f6'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
  circle(ctx, 210, 95, 16, '#ece6f7');
  ridge(ctx, r, 395, 60, 46, '#55507f', 0.15);                                                   // far, hazy
  ridge(ctx, r, 440, 80, 64, '#33305e', 0.12);                                                   // middle
  shape(ctx, [[0, H], [0, 468], [140, 452], [300, 462], [470, 448], [600, 470], [650, 520], [690, H]], '#16152f'); // the ledge
  shape(ctx, [[0, 468], [140, 452], [300, 462], [470, 448], [600, 470], [604, 478], [470, 456], [300, 470], [140, 460], [0, 476]], '#4a4479');
  shape(ctx, [[110, 452], [250, 410], [330, 430], [300, 462], [140, 470]], '#7e83a3');           // the crashed pod
  shape(ctx, [[140, 470], [300, 462], [330, 430], [338, 452], [300, 476]], '#3f425e');
  glow(ctx, 268, 428, 40, '#7ff3ff');
  for (const [x, y] of [[760, 560], [820, 520], [880, 490], [930, 460]]) glow(ctx, x, y, 14, '#7ff3ff'); // a trail of lights going down
  traveller(ctx, 540, 452, 70, '#0a0a1a', '#f3b49c');
  caption(ctx, 'I · ARRIVAL');
  return c.toDataURL('image/png');
}

async function alienPool() {
  const r = seeded(202), [c, ctx] = canvas(W, H);
  bands(ctx, 0, H, ramp(['#06141c', '#0e2e3a', '#14404c'], 6));
  shape(ctx, [[400, 0], [520, 0], [500, 120], [470, 210], [445, 120]], '#2b6b78');               // light falling through a crack
  shape(ctx, [[430, 0], [490, 0], [478, 120], [462, 190], [450, 110]], '#4c9aa3');
  shape(ctx, [[0, 0], [260, 0], [210, 140], [240, 300], [150, 420], [0, 440]], '#04101a');        // cave walls
  shape(ctx, [[260, 0], [210, 140], [240, 300], [226, 300], [196, 140], [246, 0]], '#174250');
  shape(ctx, [[W, 0], [700, 0], [760, 160], [720, 320], [820, 430], [W, 450]], '#04101a');
  shape(ctx, [[700, 0], [760, 160], [720, 320], [736, 320], [776, 160], [716, 0]], '#174250');
  shape(ctx, [[0, H], [0, 440], [200, 430], [380, 420], [600, 425], [820, 430], [W, 450], [W, H]], '#071820');
  const pool = ['#0d4d5c', '#137080', '#1f9aa8', '#5fd6dc'];                                      // the glowing pool, in steps
  pool.forEach((col, i) => { ctx.beginPath(); ctx.ellipse(480, 480, 300 - i * 62, 72 - i * 15, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
  for (let i = 0; i < 5; i++) { ctx.fillStyle = '#bff4f6'; ctx.globalAlpha = 0.5; ctx.fillRect(340 + r() * 280, 458 + r() * 44, 30 + r() * 50, 2); }
  ctx.globalAlpha = 1;
  for (const [x, h, bend, col] of [[150, 170, 30, '#ff7ad9'], [205, 120, -20, '#7ff3ff'], [790, 190, -35, '#ff7ad9'], [850, 130, 25, '#7ff3ff'], [730, 100, 15, '#7ff3ff']]) {
    taper(ctx, curve(x, 450, 0, -h, bend), 9, 2, '#0b2a33');
    glow(ctx, x + bend * 0.05, 450 - h, 16, col);
  }
  for (const [x, y] of [[90, 300], [118, 302]]) glow(ctx, x, y, 7, '#ffd36b');                  // something watching from the dark
  traveller(ctx, 300, 440, 58, '#030b10', '#5fd6dc');
  caption(ctx, 'II · THE POOL', '#bff4f6');
  return c.toDataURL('image/png');
}

async function alienRuins() {
  const r = seeded(303), [c, ctx] = canvas(W, H);
  bands(ctx, 0, 470, ramp(['#0b2229', '#25525a', '#93b6a0'], 6));
  starsIn(ctx, r, 40, 160);
  ridge(ctx, r, 470, 50, 70, '#3c6466', 0.05);
  for (const [x, w, h, lean] of [[40, 110, 380, 18], [170, 70, 300, -10], [700, 90, 420, -14], [820, 120, 330, 12]]) { // the monoliths
    shape(ctx, [[x, 520], [x + lean, 520 - h], [x + w * 0.55 + lean, 520 - h - 12], [x + w * 0.55, 520]], '#14262e');
    shape(ctx, [[x + w * 0.55, 520], [x + w * 0.55 + lean, 520 - h - 12], [x + w + lean, 520 - h], [x + w, 520]], '#2c4950');
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#7ff3ff'; ctx.globalAlpha = 0.55; ctx.fillRect(x + w * 0.66 + lean * (1 - i / 6), 520 - h * 0.85 + i * h * 0.12, w * 0.22, 3); }
    ctx.globalAlpha = 1;
  }
  bands(ctx, 470, H, ramp(['#122329', '#08141a'], 4));
  traveller(ctx, 300, 525, 70, '#050c10', '#c9e6c8');
  caption(ctx, 'III · THE RING', '#d9efe0');
  return c.toDataURL('image/png');
}

async function alienBeyond() {
  const r = seeded(404), [c, ctx] = canvas(W, H);
  bands(ctx, 0, 400, ramp(['#4b5aa0', '#b7a8d8', '#fde4c4'], 5));
  glow(ctx, 480, 400, 150, '#fff6e0');
  for (const [x, y, w] of [[120, 160, 150], [690, 110, 200], [430, 220, 90], [820, 260, 70]]) {   // floating islands
    shape(ctx, [[x, y], [x + w, y], [x + w * 0.7, y + w * 0.55], [x + w * 0.45, y + w * 0.8], [x + w * 0.25, y + w * 0.45]], '#6b6aa0');
    shape(ctx, [[x + w * 0.55, y], [x + w, y], [x + w * 0.7, y + w * 0.55], [x + w * 0.45, y + w * 0.8]], '#8a86bd'); // the lit side
    shape(ctx, [[x, y], [x + w, y], [x + w * 0.95, y + 8], [x + 4, y + 8]], '#f5d7c8');
    taper(ctx, curve(x + w * 0.6, y, 0, -w * 0.35, 6, 6), 5, 1, '#3f3f78');
  }
  bands(ctx, 400, H, ramp(['#d9c3e3', '#8d7fb8', '#57508a'], 4));
  for (let i = 0; i < 12; i++) { ctx.fillStyle = '#fff6e0'; ctx.globalAlpha = 0.45; ctx.fillRect(480 - 80 + r() * 160, 410 + i * 15, 20 + r() * 60, 2); }
  ctx.globalAlpha = 1;
  traveller(ctx, 480, 470, 40, '#2a2650', '#fff6e0');
  caption(ctx, 'IV · BEYOND', '#2a2650');
  return c.toDataURL('image/png');
}

// The ring gate, a prop with two looks.
async function ring(awake) {
  const S = ITEM_SIZE, [c, ctx] = canvas(S, S), cx = S / 2, cy = S / 2;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, lit = Math.cos(a0 + Math.PI * 0.75) > 0.2;
    shape(ctx, [[cx + Math.cos(a0) * 142, cy + Math.sin(a0) * 142], [cx + Math.cos(a1) * 142, cy + Math.sin(a1) * 142], [cx + Math.cos(a1) * 108, cy + Math.sin(a1) * 108], [cx + Math.cos(a0) * 108, cy + Math.sin(a0) * 108]],
      lit ? '#56707c' : i % 2 ? '#2c3a44' : '#34444f');
  }
  if (awake) {
    ['#1fb5c9', '#5fd6dc', '#bff4f6', '#ffffff'].forEach((col, i) => circle(ctx, cx, cy, 106 - i * 24, col));
    for (let i = 0; i < n; i += 2) { const a = (i / n) * Math.PI * 2 + 0.2; ctx.fillStyle = '#bff4f6'; ctx.fillRect(cx + Math.cos(a) * 124 - 4, cy + Math.sin(a) * 124 - 4, 8, 8); }
  } else {
    circle(ctx, cx, cy, 106, '#0b0f1a');
    for (let i = 0; i < n; i += 2) { const a = (i / n) * Math.PI * 2 + 0.2; ctx.fillStyle = '#3b4a58'; ctx.fillRect(cx + Math.cos(a) * 124 - 4, cy + Math.sin(a) * 124 - 4, 8, 8); }
  }
  return c.toDataURL('image/png');
}

async function shard() {
  const S = ITEM_SIZE, [c, ctx] = canvas(S, S);
  glow(ctx, 150, 160, 130, '#7ff3ff');
  shape(ctx, [[150, 30], [205, 140], [160, 275], [100, 150]], '#3fb8c4');
  shape(ctx, [[150, 30], [160, 275], [100, 150]], '#bff4f6');
  shape(ctx, [[150, 30], [205, 140], [150, 120]], '#ffffff');
  return c.toDataURL('image/png');
}

export async function buildAlien() {
  await document.fonts.load(CAPTION).catch(() => {});
  const adv = newAdventure('Solace');
  const crystal = Object.assign(newItem('Light shard'), { image: await shard() });
  const gate = newProp('Ring');
  gate.looks = [newLook('Asleep', await ring(false)), newLook('Awake', await ring(true))];
  adv.items.push(crystal);
  adv.props.push(gate);

  const arrival = Object.assign(adv.cards[0], { name: 'Arrival', image: await alienArrival() });
  const pool = Object.assign(newCard('The pool'), { image: await alienPool() });
  const ruins = Object.assign(newCard('The ring'), { image: await alienRuins() });
  const beyond = Object.assign(newCard('Beyond'), { image: await alienBeyond(), ending: true });
  adv.cards.push(pool, ruins, beyond);

  arrival.buttons.push(
    go({ kind: 'free', points: [[700, 600], [700, 470], [960, 420], [960, 600]], target: pool.id, sound: 'footsteps' }),
    go({ kind: 'free', points: [[110, 452], [250, 410], [338, 452], [300, 476], [140, 470]], sound: 'ding' }),
  );
  pool.items.push({ id: uid(), itemId: crystal.id, x: 445, y: 425, size: 70 });
  pool.buttons.push(
    go({ kind: 'free', points: [[0, 440], [200, 430], [230, 600], [0, 600]], target: arrival.id, sound: 'footsteps' }),
    go({ kind: 'free', points: [[820, 430], [960, 450], [960, 600], [760, 600]], target: ruins.id, sound: 'footsteps' }),
    go({ kind: 'oval', x: 180, y: 420, w: 600, h: 120, sound: 'splash' }),
    go({ kind: 'oval', x: 70, y: 285, w: 70, h: 35, sound: 'heartbeat' }),
  );
  ruins.props.push({ id: uid(), propId: gate.id, x: 330, y: 150, size: 340 });
  const through = go({ kind: 'oval', x: 400, y: 222, w: 200, h: 196, target: beyond.id, sound: 'whoosh', startsOff: true });
  const wake = go({
    kind: 'oval', x: 345, y: 165, w: 310, h: 310, needs: crystal.id, useUp: true, sound: 'magic', lockedSound: 'heartbeat',
    lockedMsg: 'The ring is silent. Something is missing.',
    changes: [change(`prop:${gate.id}`, `look:${gate.looks[1].id}`), change(`button:${through.id}`, 'show')],
  });
  ruins.buttons.push(wake, through, go({ x: 0, y: 470, w: 200, h: 130, target: pool.id, sound: 'footsteps' }));
  return adv;
}
