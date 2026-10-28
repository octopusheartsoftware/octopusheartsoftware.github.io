// A small example adventure, drawn in code from the stamp library. It shows props and changes:
// the hallway is one card, and its door is a prop with a "Shut" and an "Open" look. Using the key
// on the door switches the door to "Open" and turns on the doorway button that leads inside.
import { CARD_W, CARD_H, ITEM_SIZE, uid, newCard, newItem, newProp, newLook, newButton, newAdventure } from './model.js';
import { stampImage } from './stamps.js';

const FONT = '500 34px Lexend, "Segoe UI", sans-serif';
const DOOR = { x: 280, y: 64, size: 400 };                    // where the door prop sits on the hallway
const DOORWAY = { x: 380, y: 96, w: 200, h: 344 };            // the button area over it

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export async function stamp(ctx, id, x, y, size) {
  const img = stampImage(id);
  if (!img.complete) await img.decode();
  ctx.drawImage(img, x, y, size, size);
}

export function words(ctx, text, x, y, color = '#3e2723', font = FONT) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

async function hallway() {
  const [c, ctx] = canvas(CARD_W, CARD_H);
  ctx.fillStyle = '#f3e5c8'; ctx.fillRect(0, 0, CARD_W, 440);       // wall
  ctx.fillStyle = '#a1887f'; ctx.fillRect(0, 440, CARD_W, 160);     // floor
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(0, 432, CARD_W, 10);      // skirting board
  await stamp(ctx, 'window', 90, 110, 170);
  await stamp(ctx, 'arrow', 800, 470, 120);
  words(ctx, 'Garden', 800, 560, '#3e2723', '500 24px Lexend, "Segoe UI", sans-serif');
  words(ctx, 'The hallway', 40, 30);
  return c.toDataURL('image/png');
}

// The door prop, on see-through paper. The door stamp fills the square, so the door itself
// covers x 25%–75% and y 8%–94% of it.
async function door(open) {
  const S = ITEM_SIZE, [c, ctx] = canvas(S, S);
  if (!open) { await stamp(ctx, 'door', 0, 0, S); return c.toDataURL('image/png'); }
  const x = S * 0.25, y = S * 0.08, w = S * 0.5, h = S * 0.86;
  ctx.fillStyle = '#2b1d16'; ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  await stamp(ctx, 'chest', x + w * 0.22, y + h * 0.55, w * 0.56);
  await stamp(ctx, 'star', x + w * 0.15, y + h * 0.4, w * 0.22);
  await stamp(ctx, 'star', x + w * 0.62, y + h * 0.3, w * 0.16);
  ctx.fillStyle = '#8d5524';                                      // the door, swung open
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + S * 0.18, y - S * 0.04); ctx.lineTo(x + w + S * 0.18, y + h + S * 0.04); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  return c.toDataURL('image/png');
}

async function garden() {
  const [c, ctx] = canvas(CARD_W, CARD_H);
  ctx.fillStyle = '#bfe3f7'; ctx.fillRect(0, 0, CARD_W, 400);
  ctx.fillStyle = '#8bc34a'; ctx.fillRect(0, 400, CARD_W, 200);
  await stamp(ctx, 'sun', 780, 30, 150);
  await stamp(ctx, 'cloud', 300, 40, 150);
  await stamp(ctx, 'tree', 60, 150, 300);
  await stamp(ctx, 'bird', 180, 140, 70);
  await stamp(ctx, 'flower', 420, 360, 110);
  await stamp(ctx, 'flower', 520, 380, 90);
  await stamp(ctx, 'grass', 700, 380, 120);
  ctx.save(); ctx.translate(900, 470); ctx.scale(-1, 1); await stamp(ctx, 'arrow', 0, 0, 120); ctx.restore();
  words(ctx, 'Hallway', 785, 560, '#3e2723', '500 24px Lexend, "Segoe UI", sans-serif');
  words(ctx, 'The garden', 40, 30);
  return c.toDataURL('image/png');
}

async function treasureRoom() {
  const [c, ctx] = canvas(CARD_W, CARD_H);
  ctx.fillStyle = '#4e342e'; ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = '#3e2723'; ctx.fillRect(0, 450, CARD_W, 150);
  await stamp(ctx, 'chest', 330, 200, 300);
  for (const [x, y, s] of [[200, 120, 70], [700, 100, 90], [620, 300, 50], [260, 330, 50], [480, 70, 60]]) await stamp(ctx, 'star', x, y, s);
  words(ctx, 'You found the treasure!', 40, 30, '#fff3c4');
  return c.toDataURL('image/png');
}

async function keyPicture() {
  const [c, ctx] = canvas(ITEM_SIZE, ITEM_SIZE);
  await stamp(ctx, 'key', 0, 0, ITEM_SIZE);
  return c.toDataURL('image/png');
}

export async function buildDemo() {
  await document.fonts.load(FONT).catch(() => {});
  const adv = newAdventure('Example: the locked door');

  const key = Object.assign(newItem('Gold key'), { image: await keyPicture() });
  const doorProp = newProp('Door');
  doorProp.looks = [newLook('Shut', await door(false)), newLook('Open', await door(true))];
  adv.items.push(key);
  adv.props.push(doorProp);

  const hall = Object.assign(adv.cards[0], { name: 'Hallway', image: await hallway() });
  const yard = Object.assign(newCard('Garden'), { image: await garden() });
  const end = Object.assign(newCard('Treasure room'), { image: await treasureRoom(), ending: true });
  adv.cards.push(yard, end);

  hall.props.push({ id: uid(), propId: doorProp.id, ...DOOR });
  // The doorway button is off until the door opens. It's listed after the lock, so once it's on, it's the one players click.
  const inset = 24; // a little smaller than the lock, so both are easy to pick in the editor
  const doorway = newButton({ x: DOORWAY.x + inset, y: DOORWAY.y + inset, w: DOORWAY.w - inset * 2, h: DOORWAY.h - inset * 2, target: end.id, sound: 'fanfare', startsOff: true });
  const lock = newButton({
    ...DOORWAY, needs: key.id, useUp: true, sound: 'unlock', lockedSound: 'locked',
    lockedMsg: "It's locked. Maybe the key is somewhere outside?",
    changes: [
      { id: uid(), what: `prop:${doorProp.id}`, to: `look:${doorProp.looks[1].id}` },
      { id: uid(), what: `button:${doorway.id}`, to: 'show' },
    ],
  });
  hall.buttons.push(lock, doorway, newButton({ x: 790, y: 470, w: 140, h: 125, target: yard.id, sound: 'footsteps' }));

  yard.buttons.push(
    newButton({ kind: 'oval', x: 175, y: 140, w: 80, h: 75, sound: 'bird' }), // a sound-only button
    newButton({ x: 770, y: 465, w: 150, h: 130, target: hall.id, sound: 'footsteps' }),
  );
  yard.items.push({ id: uid(), itemId: key.id, x: 600, y: 470, size: 90 });
  return adv;
}
