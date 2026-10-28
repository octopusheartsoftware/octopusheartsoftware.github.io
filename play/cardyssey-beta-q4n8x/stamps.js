// The stamp library: simple, friendly drawings (our own) that people can stamp onto cards
// and items to get started quickly. Each is drawn on a 100×100 grid with a dark outline.

const O = 'stroke="#2b2b2b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

const ART = {
  tree: `<rect x="43" y="55" width="14" height="38" rx="3" fill="#8a5a2b" ${O}/><circle cx="50" cy="36" r="28" fill="#4caf50" ${O}/><circle cx="40" cy="30" r="6" fill="#81c784"/>`,
  pine: `<rect x="45" y="76" width="10" height="18" fill="#8a5a2b" ${O}/><path d="M50 6 L70 36 H62 L78 58 H68 L84 80 H16 L32 58 H22 L38 36 H30 Z" fill="#2e7d32" ${O}/>`,
  flower: `<path d="M50 52 V95" stroke="#2e7d32" stroke-width="5" stroke-linecap="round"/><path d="M50 82 Q34 82 30 68 Q46 68 50 82 Z" fill="#66bb6a" ${O}/>
    ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${50 + 14 * Math.cos((a - 90) * Math.PI / 180)}" cy="${34 + 14 * Math.sin((a - 90) * Math.PI / 180)}" r="11" fill="#f48fb1" ${O}/>`).join('')}
    <circle cx="50" cy="34" r="9" fill="#fdd835" ${O}/>`,
  grass: `<path d="M14 90 L24 56 L32 90 L42 44 L52 90 L62 50 L70 90 L80 60 L88 90 Z" fill="#7cb342" ${O}/>`,
  rock: `<path d="M10 88 Q12 58 36 50 Q52 30 74 48 Q92 58 90 88 Z" fill="#9e9e9e" ${O}/><path d="M40 62 Q50 56 58 62" fill="none" ${O}/>`,
  mountain: `<path d="M4 92 L38 20 L56 56 L68 40 L96 92 Z" fill="#8d9db6" ${O}/><path d="M38 20 L49 43 L42 38 L35 45 L29 39 Z" fill="#ffffff" ${O}/>`,
  sun: `${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${50 + 30 * Math.cos(r)} ${50 + 30 * Math.sin(r)} L${50 + 44 * Math.cos(r)} ${50 + 44 * Math.sin(r)}" stroke="#f9a825" stroke-width="6" stroke-linecap="round"/>`; }).join('')}<circle cx="50" cy="50" r="22" fill="#fdd835" ${O}/>`,
  moon: `<path d="M60 10 A40 40 0 1 0 90 66 A32 32 0 1 1 60 10 Z" fill="#fff59d" ${O}/>`,
  cloud: `<path d="M20 74 A16 16 0 0 1 24 43 A22 22 0 0 1 64 36 A18 18 0 0 1 82 74 Z" fill="#ffffff" ${O}/>`,
  star: `<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#fdd835" ${O}/>`,
  heart: `<path d="M50 88 C10 60 8 30 28 20 C40 14 48 22 50 30 C52 22 60 14 72 20 C92 30 90 60 50 88 Z" fill="#e53935" ${O}/>`,
  house: `<rect x="18" y="46" width="64" height="46" fill="#ffcc80" ${O}/><path d="M10 50 L50 14 L90 50 Z" fill="#c62828" ${O}/><rect x="42" y="64" width="16" height="28" fill="#8d5524" ${O}/><rect x="24" y="58" width="12" height="12" fill="#bbdefb" ${O}/><rect x="64" y="58" width="12" height="12" fill="#bbdefb" ${O}/>`,
  castle: `<path d="M14 92 V30 H24 V40 H34 V30 H44 V40 H56 V30 H66 V40 H76 V30 H86 V92 Z" fill="#b0bec5" ${O}/><path d="M40 92 V66 A10 10 0 0 1 60 66 V92 Z" fill="#6d4c41" ${O}/><rect x="24" y="52" width="8" height="12" fill="#37474f" ${O}/><rect x="68" y="52" width="8" height="12" fill="#37474f" ${O}/>`,
  door: `<rect x="25" y="8" width="50" height="86" rx="4" fill="#8d5524" ${O}/><rect x="32" y="16" width="36" height="30" rx="2" fill="none" ${O}/><rect x="32" y="54" width="36" height="32" rx="2" fill="none" ${O}/><circle cx="64" cy="52" r="4" fill="#fdd835" ${O}/>`,
  window: `<rect x="16" y="16" width="68" height="68" rx="3" fill="#bbdefb" ${O}/><path d="M50 16 V84 M16 50 H84" ${O}/><path d="M24 30 L34 22" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`,
  key: `<circle cx="28" cy="50" r="17" fill="#fbc02d" ${O}/><circle cx="28" cy="50" r="6" fill="#ffffff" ${O}/><path d="M45 45 H92 V55 H84 V66 H75 V55 H67 V63 H58 V55 H45 Z" fill="#fbc02d" ${O}/>`,
  chest: `<path d="M12 44 Q12 18 50 18 Q88 18 88 44 Z" fill="#a1662f" ${O}/><rect x="12" y="44" width="76" height="44" fill="#8d5524" ${O}/><rect x="42" y="38" width="16" height="18" rx="2" fill="#fdd835" ${O}/><path d="M12 44 H88" ${O}/>`,
  sign: `<rect x="45" y="44" width="10" height="50" fill="#8a5a2b" ${O}/><rect x="12" y="14" width="76" height="34" rx="4" fill="#d7a86e" ${O}/><path d="M24 26 H70 M24 36 H58" stroke="#6d4c41" stroke-width="3" stroke-linecap="round"/>`,
  arrow: `<path d="M8 40 H56 V20 L92 50 L56 80 V60 H8 Z" fill="#fdd835" ${O}/>`,
  ladder: `<path d="M30 6 V94 M70 6 V94" stroke="#8a5a2b" stroke-width="8" stroke-linecap="round"/>${[18, 36, 54, 72, 88].map((y) => `<path d="M30 ${y} H70" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>`).join('')}`,
  fence: `${[10, 32, 54, 76].map((x) => `<path d="M${x} 90 V30 L${x + 7} 20 L${x + 14} 30 V90 Z" fill="#fff8e1" ${O}/>`).join('')}<rect x="4" y="44" width="92" height="9" fill="#fff8e1" ${O}/><rect x="4" y="68" width="92" height="9" fill="#fff8e1" ${O}/>`,
  person: `<circle cx="50" cy="22" r="14" fill="#e8b48c" ${O}/><path d="M32 92 V52 Q32 38 50 38 Q68 38 68 52 V92 Z" fill="#42a5f5" ${O}/><path d="M32 54 L20 74 M68 54 L80 74" ${O} fill="none"/><path d="M44 21 h1 M55 21 h1" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/><path d="M45 28 Q50 32 55 28" fill="none" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round"/>`,
  cat: `<path d="M78 84 Q96 70 86 50" fill="none" stroke="#2b2b2b" stroke-width="9" stroke-linecap="round"/><path d="M78 84 Q96 70 86 50" fill="none" stroke="#ff9800" stroke-width="4" stroke-linecap="round"/><ellipse cx="56" cy="72" rx="26" ry="18" fill="#ff9800" ${O}/><path d="M18 30 L22 10 L34 22 L46 10 L50 30 A16 16 0 1 1 18 30 Z" fill="#ff9800" ${O}/><path d="M28 34 h1 M40 34 h1" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>`,
  fish: `<path d="M70 50 L94 30 V70 Z" fill="#29b6f6" ${O}/><ellipse cx="44" cy="50" rx="34" ry="22" fill="#4fc3f7" ${O}/><circle cx="26" cy="45" r="4" fill="#2b2b2b"/><path d="M48 36 Q56 50 48 64" fill="none" ${O}/>`,
  bird: `<circle cx="46" cy="54" r="26" fill="#ef5350" ${O}/><path d="M70 46 L90 52 L70 58 Z" fill="#ffb300" ${O}/><path d="M30 56 Q42 74 56 58 Z" fill="#c62828" ${O}/><circle cx="58" cy="44" r="4" fill="#2b2b2b"/><path d="M38 80 V92 M50 80 V92" ${O}/>`,
  ghost: `<path d="M22 90 V45 A28 28 0 0 1 78 45 V90 L69 82 L59 90 L50 82 L41 90 L31 82 Z" fill="#ffffff" ${O}/><ellipse cx="40" cy="46" rx="5" ry="7" fill="#2b2b2b"/><ellipse cx="60" cy="46" rx="5" ry="7" fill="#2b2b2b"/>`,
  mushroom: `<path d="M38 56 H62 L64 90 H36 Z" fill="#fff8e1" ${O}/><path d="M8 58 Q8 14 50 14 Q92 14 92 58 Z" fill="#e53935" ${O}/><circle cx="34" cy="36" r="7" fill="#ffffff"/><circle cx="62" cy="30" r="6" fill="#ffffff"/><circle cx="72" cy="48" r="5" fill="#ffffff"/>`,
};

export const STAMPS = Object.keys(ART);
export const stampSvg = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${ART[id]}</svg>`;

// Stamps as images, ready to draw onto a canvas. Loaded once.
const images = {};
export function stampImage(id) {
  if (!images[id]) {
    images[id] = new Image();
    images[id].src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stampSvg(id));
  }
  return images[id];
}
STAMPS.forEach(stampImage);
