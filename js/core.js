/* Core: board coordinates, the seeded random generator, SVG helpers and the painted table background. */
document.documentElement.dataset.ui = 'steel';
const NS = 'http://www.w3.org/2000/svg',
  X0 = 170,
  S = 7;
let ME = 'cs',
  FLIP = false;
const px = x => X0 + (FLIP ? x : 72 - x) * S,
  py = y => 40 + (FLIP ? 48 - y : y) * S,
  ix = p => (FLIP ? (p - X0) / S : 72 - (p - X0) / S),
  iy = p => (FLIP ? 48 - (p - 40) / S : (p - 40) / S),
  ROT = f => (f || 0) + (FLIP ? 0 : 180);
let s = 31;
function r() {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function el(tag, a, p) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  if (p) p.appendChild(e);
  return e;
}
function blob(cx, cy, rx, ry, n, j) {
  const rad = [];
  for (let i = 0; i < n; i++) rad.push(1 - j + r() * j * 2);
  return k => {
    let p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      p.push([cx + Math.cos(a) * rx * k * rad[i], cy + Math.sin(a) * ry * k * rad[i]]);
    }
    let d = 'M' + (p[0][0] + p[n - 1][0]) / 2 + ' ' + (p[0][1] + p[n - 1][1]) / 2;
    for (let i = 0; i < n; i++) {
      const a = p[i],
        b = p[(i + 1) % n];
      d += ` Q${a[0]} ${a[1]} ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`;
    }
    return d + 'Z';
  };
}
const $ = id => document.getElementById(id);
const tg = $('tufts');
for (let i = 0; i < 200; i++) {
  const x = 176 + r() * 492,
    y = 54 + r() * 308;
  el('path', { d: `M${x} ${y}l-2 -4M${x} ${y}l0 -5M${x} ${y}l2 -4` }, tg);
}
function forest(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 10, 0.22);
  el('path', { d: b(1.08), transform: 'translate(2 3)', fill: '#2E4A22', opacity: 0.35 }, g);
  el('path', { d: b(1), fill: '#5A7F3A' }, g);
  const nt = Math.max(12, Math.round((rx * ry) / 30));
  for (let i = 0; i < nt; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.75,
      x = cx + Math.cos(a) * d * rx,
      y = cy + Math.sin(a) * d * ry,
      rr = 4.5 + r() * 3;
    el('circle', { cx: x + 1.5, cy: y + 2, r: rr, fill: '#1F3B1A', opacity: 0.45 }, g);
    el('circle', { cx: x, cy: y, r: rr, fill: ['#2F5E2A', '#3B7033', '#467C38'][i % 3] }, g);
    el('circle', { cx: x - rr * 0.35, cy: y - rr * 0.35, r: rr * 0.35, fill: '#6E9A4E', opacity: 0.6 }, g);
  }
}
function hill(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 9, 0.2);
  el('path', { d: b(1.06), transform: 'translate(3 4)', fill: '#3D4A22', opacity: 0.3 }, g);
  [
    [1, '#9AA65C'],
    [0.72, '#AFB86C'],
    [0.46, '#C4C882'],
    [0.22, '#D6D59A']
  ].forEach(([k, f]) => el('path', { d: b(k), fill: f, stroke: '#7C8746', 'stroke-width': 0.6 }, g));
}
function rocks(cx, cy, rx, ry, g) {
  el(
    'ellipse',
    { cx: cx + 2, cy: cy + ry * 0.7, rx: rx * 1.05, ry: ry * 0.55, fill: '#2B2A26', opacity: 0.3 },
    g
  );
  const ns = Math.max(6, Math.round((rx * ry) / 45)),
    k = Math.max(1, Math.min(rx, ry) / 12);
  for (let i = 0; i < ns; i++) {
    const x = cx + (r() - 0.5) * rx * 1.5,
      y = cy + (r() - 0.5) * ry * 1.2,
      sz = (4 + r() * 6.5) * k,
      c = ['#8D8A84', '#A19D95', '#7C7973', '#96928A'][i % 4];
    el(
      'polygon',
      {
        points: `${x - sz},${y + sz * 0.6} ${x - sz * 0.5},${y - sz * 0.7} ${x + sz * 0.3},${y - sz} ${x + sz},${y - sz * 0.2} ${x + sz * 0.7},${y + sz * 0.6}`,
        fill: c,
        stroke: '#5C5A55',
        'stroke-width': 0.6
      },
      g
    );
    el(
      'polygon',
      {
        points: `${x - sz * 0.5},${y - sz * 0.7} ${x + sz * 0.3},${y - sz} ${x + sz * 0.1},${y - sz * 0.2}`,
        fill: '#C2BEB4',
        opacity: 0.7
      },
      g
    );
  }
}
function stones(cx, cy, n, rad, g) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4,
      x = cx + Math.cos(a) * rad,
      y = cy + Math.sin(a) * rad * 0.7;
    el(
      'rect',
      {
        x: x - 2.5,
        y: y - 6,
        width: 5,
        height: 8,
        rx: 1.5,
        fill: '#8F8B80',
        stroke: '#5C5A55',
        'stroke-width': 0.5
      },
      g
    );
  }
  el('line', { x1: cx, y1: cy + 4, x2: cx, y2: cy - 15, stroke: '#4A3418', 'stroke-width': 1.2 }, g);
  el(
    'path',
    { d: `M${cx} ${cy - 15} l10 3 l-10 3z`, fill: '#E8C65A', stroke: '#8A6D3B', 'stroke-width': 0.5 },
    g
  );
}
const TERR0 = [
  { type: 'forest', x: 20, y: 38, rx: 3.5, ry: 2.5, seed: 11 },
  { type: 'forest', x: 54, y: 9, rx: 3.5, ry: 2.5, seed: 12 },
  { type: 'hill', x: 37, y: 40, rx: 3, ry: 2, seed: 13 },
  { type: 'hill', x: 32, y: 8, rx: 3, ry: 2, seed: 14 },
  { type: 'rocks', x: 61, y: 37, rx: 2.5, ry: 1.5, seed: 15 },
  { type: 'rocks', x: 10, y: 11, rx: 2.5, ry: 1.5, seed: 16 }
];
