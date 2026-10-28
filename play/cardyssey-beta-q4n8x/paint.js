// The paint program. Every tool draws on a see-through "wet" layer on top of the picture first,
// and the wet paint is pressed onto the picture when you let go. That keeps see-through paint even
// (no darker blobs where a stroke crosses itself) and makes one stroke exactly one undo step.
//
// It paints cards (white paper, CARD_W × CARD_H) and items (see-through paper, square), so the
// eraser makes white on cards and makes holes on items.
import { CARD_W, CARD_H } from './model.js';
import { stampImage } from './stamps.js';

const UNDO_LIMIT = 30;
const FILL_TOLERANCE = 96; // how different a neighbouring color can be and still get filled
const FREEHAND = new Set(['pencil', 'brush', 'eraser']);

export class Painter {
  constructor(paper, wet, stage) {
    this.paper = paper; this.wet = wet; this.stage = stage;
    this.ctx = paper.getContext('2d', { willReadFrequently: true });
    this.wctx = wet.getContext('2d', { willReadFrequently: true });
    this.tool = 'brush'; this.color = '#000000'; this.size = 10; this.opacity = 1; this.filled = false; this.stamp = 'tree';
    this.undoStack = []; this.redoStack = [];
    this.drag = null; this.text = null; this.loading = 0;
    this.onChange = () => {}; this.onPick = () => {}; this.onHistory = () => {};
    this.setFormat(CARD_W, CARD_H, false);
    wet.addEventListener('pointerdown', (e) => this.down(e));
    wet.addEventListener('pointermove', (e) => this.move(e));
    wet.addEventListener('pointerup', (e) => this.up(e));
    wet.addEventListener('pointercancel', (e) => this.up(e));
    wet.addEventListener('pointerleave', () => { if (!this.drag && this.tool === 'stamp') this.wctx.clearRect(0, 0, this.W, this.H); });
  }

  // Cards are white paper; items are see-through so they sit on a card like a sticker.
  setFormat(w, h, transparent) {
    this.W = w; this.H = h; this.transparent = transparent;
    for (const c of [this.paper, this.wet]) { c.width = w; c.height = h; }
  }

  // Show a picture (or blank paper) and start a fresh undo history. `ready` resolves once it's showing.
  load(src) {
    this.ready = this.loadNow(src);
    return this.ready;
  }

  async loadNow(src) {
    const token = ++this.loading;
    this.cancelText();
    this.drag = null;
    let img = null;
    if (src) { img = new Image(); img.src = src; try { await img.decode(); } catch { img = null; } }
    if (token !== this.loading) return; // another picture was opened while this one loaded
    this.blank(this.ctx);
    if (img) this.ctx.drawImage(img, 0, 0);
    this.wctx.clearRect(0, 0, this.W, this.H);
    this.undoStack = []; this.redoStack = [];
    this.onHistory();
  }

  blank(c) {
    c.clearRect(0, 0, this.W, this.H);
    if (!this.transparent) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, this.W, this.H); }
  }

  toDataURL() { return this.paper.toDataURL('image/png'); }

  pt(e) {
    const r = this.wet.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * this.W) / r.width, y: ((e.clientY - r.top) * this.H) / r.height };
  }

  // Tablets: once a pen has touched the screen, fingers and palms resting on it are ignored.
  // A second finger landing mid-stroke (the start of a pinch, or a resting hand) cancels the stroke.
  ignore(e) {
    if (e.pointerType === 'pen') this.penSeen = true;
    return e.pointerType === 'touch' && this.penSeen;
  }

  // Pen pressure makes brush strokes thinner or thicker. Mice and fingers draw at full size.
  width(e) {
    const base = this.tool === 'pencil' ? 2 : this.size;
    if (e.pointerType !== 'pen' || this.tool === 'eraser' || !e.pressure) return base;
    return Math.max(1, base * (0.3 + e.pressure * 1.1));
  }

  down(e) {
    if (e.button > 0 || this.ignore(e)) return;
    if (this.drag) {
      if (e.pointerId !== this.drag.pointer) { this.drag = null; this.wctx.clearRect(0, 0, this.W, this.H); }
      return;
    }
    const p = this.pt(e);
    if (this.tool === 'text') { e.preventDefault(); this.startText(p); return; }
    this.commitText();
    if (this.tool === 'picker') { this.pick(p); return; }
    if (this.tool === 'fill') { this.fill(p); return; }
    if (this.tool === 'stamp') { this.wctx.clearRect(0, 0, this.W, this.H); this.drawStamp(p); this.press(this.opacity); return; }
    this.wet.setPointerCapture(e.pointerId);
    this.drag = { pointer: e.pointerId, start: p, last: p, lastMid: p };
    this.wctx.clearRect(0, 0, this.W, this.H);
    this.wet.style.opacity = this.tool === 'eraser' ? 1 : this.opacity;
    const w = this.wctx;
    w.strokeStyle = w.fillStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
    w.lineWidth = FREEHAND.has(this.tool) ? this.width(e) : this.size;
    w.lineCap = w.lineJoin = 'round';
    if (FREEHAND.has(this.tool)) { w.beginPath(); w.arc(p.x, p.y, w.lineWidth / 2, 0, Math.PI * 2); w.fill(); }
  }

  move(e) {
    if (this.drag && e.pointerId !== this.drag.pointer) return;
    if (!this.drag) {
      // Show a faint stamp under the pointer (mouse or a hovering pen), so people can see where it will land.
      if (this.tool === 'stamp' && e.pointerType !== 'touch') {
        this.wctx.clearRect(0, 0, this.W, this.H);
        this.wet.style.opacity = 0.5;
        this.drawStamp(this.pt(e));
      }
      return;
    }
    const d = this.drag, w = this.wctx;
    if (FREEHAND.has(this.tool)) {
      // Smooth curves through the midpoints, using every point the mouse or pen reported.
      for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) {
        const p = this.pt(ev), mid = { x: (d.last.x + p.x) / 2, y: (d.last.y + p.y) / 2 };
        w.lineWidth = this.width(ev);
        w.beginPath(); w.moveTo(d.lastMid.x, d.lastMid.y); w.quadraticCurveTo(d.last.x, d.last.y, mid.x, mid.y); w.stroke();
        d.last = p; d.lastMid = mid;
      }
    } else {
      d.last = this.pt(e);
      w.clearRect(0, 0, this.W, this.H);
      this.shape(d.start, d.last, e.shiftKey);
    }
  }

  up(e) {
    if (!this.drag || e.pointerId !== this.drag.pointer) return;
    const d = this.drag;
    this.drag = null;
    if (FREEHAND.has(this.tool)) {
      const w = this.wctx;
      w.beginPath(); w.moveTo(d.lastMid.x, d.lastMid.y); w.lineTo(d.last.x, d.last.y); w.stroke();
    } else if (e.type === 'pointercancel' || Math.hypot(d.last.x - d.start.x, d.last.y - d.start.y) < 2) {
      this.wctx.clearRect(0, 0, this.W, this.H); return; // a click without a drag makes no shape
    }
    this.press(this.tool === 'eraser' ? 1 : this.opacity);
  }

  // Line, box or oval from a to b. Holding Shift keeps lines straight and boxes/ovals even.
  shape(a, b, even) {
    const w = this.wctx;
    w.beginPath();
    if (this.tool === 'line') {
      if (even) {
        const ang = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(b.x - a.x, b.y - a.y);
        b = { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
      }
      w.moveTo(a.x, a.y); w.lineTo(b.x, b.y); w.stroke();
      return;
    }
    let dx = b.x - a.x, dy = b.y - a.y;
    if (even) { const s = Math.max(Math.abs(dx), Math.abs(dy)); dx = Math.sign(dx || 1) * s; dy = Math.sign(dy || 1) * s; }
    const x = Math.min(a.x, a.x + dx), y = Math.min(a.y, a.y + dy), wd = Math.abs(dx), ht = Math.abs(dy);
    if (this.tool === 'rect') w.rect(x, y, wd, ht);
    else w.ellipse(x + wd / 2, y + ht / 2, wd / 2, ht / 2, 0, 0, Math.PI * 2);
    if (this.filled) w.fill(); else w.stroke();
  }

  stampSize() { return Math.round(60 + this.size * 6); }

  drawStamp(p) {
    const img = stampImage(this.stamp), s = this.stampSize();
    if (img.complete) this.wctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
  }

  // Press the wet layer onto the picture. On see-through items the eraser cuts holes instead.
  press(alpha) {
    this.snapshot();
    this.ctx.globalAlpha = alpha;
    if (this.tool === 'eraser' && this.transparent) this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.drawImage(this.wet, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
    this.wctx.clearRect(0, 0, this.W, this.H);
    this.wet.style.opacity = 1;
    this.onChange();
  }

  snapshot() {
    this.undoStack.push(this.ctx.getImageData(0, 0, this.W, this.H));
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.onHistory();
  }

  undo() { this.step(this.undoStack, this.redoStack); }
  redo() { this.step(this.redoStack, this.undoStack); }
  step(from, to) {
    this.commitText();
    if (!from.length) return;
    to.push(this.ctx.getImageData(0, 0, this.W, this.H));
    this.ctx.putImageData(from.pop(), 0, 0);
    this.onHistory();
    this.onChange();
  }

  // Paint bucket: fills the area of matching color around the click (scanline flood fill).
  fill(p) {
    const W = this.W, H = this.H, x0 = Math.floor(p.x), y0 = Math.floor(p.y);
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
    const d = this.ctx.getImageData(0, 0, W, H).data;
    const i0 = (y0 * W + x0) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
    const [r, g, b] = hexToRgb(this.color);
    if (tr === r && tg === g && tb === b && ta === 255 && this.opacity === 1) return;
    const mask = new Uint8Array(W * H);
    const match = (k) => !mask[k] && Math.abs(d[k * 4] - tr) + Math.abs(d[k * 4 + 1] - tg) + Math.abs(d[k * 4 + 2] - tb) + Math.abs(d[k * 4 + 3] - ta) <= FILL_TOLERANCE;
    const stack = [[x0, y0]];
    while (stack.length) {
      let [x, y] = stack.pop();
      while (x >= 0 && match(y * W + x)) x--;
      x++;
      let up = false, down = false;
      while (x < W && match(y * W + x)) {
        mask[y * W + x] = 1;
        if (y > 0) { const m = match((y - 1) * W + x); if (m && !up) stack.push([x, y - 1]); up = m; }
        if (y < H - 1) { const m = match((y + 1) * W + x); if (m && !down) stack.push([x, y + 1]); down = m; }
        x++;
      }
    }
    // Grow the filled area by one pixel so no pale fringe is left along soft line edges.
    const out = this.wctx.createImageData(W, H), o = out.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (mask[k] || (x > 0 && mask[k - 1]) || (x < W - 1 && mask[k + 1]) || (y > 0 && mask[k - W]) || (y < H - 1 && mask[k + W])) {
          o[k * 4] = r; o[k * 4 + 1] = g; o[k * 4 + 2] = b; o[k * 4 + 3] = 255;
        }
      }
    }
    this.wctx.putImageData(out, 0, 0);
    this.press(this.opacity);
  }

  pick(p) {
    const [r, g, b, a] = this.ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
    if (a === 0) return; // a see-through spot on an item has no color to pick
    this.color = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    this.onPick(this.color);
  }

  textSize() { return Math.round(14 + this.size * 1.6); }

  // Text: click the picture, type, then press Enter (or click away) to paint it on.
  startText(p) {
    this.commitText();
    const box = this.wet.getBoundingClientRect(), stageBox = this.stage.getBoundingClientRect(), scale = box.width / this.W;
    const fs = this.textSize();
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'text-entry'; input.placeholder = 'Type, then press Enter'; input.maxLength = 120;
    Object.assign(input.style, {
      left: `${box.left - stageBox.left + p.x * scale}px`, top: `${box.top - stageBox.top + p.y * scale}px`,
      fontSize: `${fs * scale}px`, color: this.color,
    });
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') this.commitText();
      if (ev.key === 'Escape') this.cancelText();
    });
    input.addEventListener('blur', () => this.commitText());
    this.stage.append(input);
    this.text = { input, p, fs, color: this.color };
    setTimeout(() => input.focus());
  }

  commitText() {
    const t = this.text;
    if (!t) return;
    this.text = null;
    const s = t.input.value;
    t.input.remove();
    if (!s.trim()) return;
    const w = this.wctx;
    w.clearRect(0, 0, this.W, this.H);
    w.font = `500 ${t.fs}px Lexend, "Segoe UI", sans-serif`;
    w.textBaseline = 'top';
    w.fillStyle = t.color;
    w.fillText(s, t.p.x, t.p.y);
    this.wet.style.opacity = this.opacity;
    this.press(this.opacity);
  }

  cancelText() {
    if (!this.text) return;
    this.text.input.remove();
    this.text = null;
  }

  flip() {
    this.commitText();
    this.snapshot();
    const w = this.wctx;
    w.clearRect(0, 0, this.W, this.H);
    w.setTransform(-1, 0, 0, 1, this.W, 0);
    w.drawImage(this.paper, 0, 0);
    w.setTransform(1, 0, 0, 1, 0, 0);
    this.blank(this.ctx);
    this.ctx.drawImage(this.wet, 0, 0);
    this.wctx.clearRect(0, 0, this.W, this.H);
    this.onChange();
  }

  clear() {
    this.commitText();
    this.snapshot();
    this.blank(this.ctx);
    this.onChange();
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
