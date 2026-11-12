/* Terrain: rules (Dangerous, Hindering, cover, line of sight, garrisons), drawing and the legend. */
/* ---------- terrain catalogue and terrain rules ---------- */
const TKW = [
  'Traversable',
  'Elevated',
  'Obstructing',
  'Cover',
  'Hindering',
  'Dangerous',
  'Perilous',
  'Water',
  'Impassable',
  'Garrison',
  'Earth'
];
const TKWD = {
  Traversable: 'Can be moved through; does not raise a regiment’s Size.',
  Elevated: 'Can be moved through; regiments standing on it add its Size to their own.',
  Obstructing:
    'Blocks Line of Sight for regiments of equal or smaller Size; regiments on it can see over everything.',
  Cover:
    'Volleys through it, or at a regiment wholly inside it, halve their Barrage (round up) if the target’s Size is not above the terrain’s. Sureshot ignores this.',
  Hindering:
    'If at least half the stands charge through it, no Impact Attacks; Medium and Heavy regiments also lose Inspired that round.',
  Dangerous:
    'Roll a die for each stand that moves through it: each 6 is 1 Wound (2 for Cavalry and Chariots). No Morale Tests.',
  Perilous:
    'Roll a die for each stand that moves through it: each 4+ is 1 Wound (2 for Cavalry and Chariots). No Morale Tests.',
  Water: 'A regiment with at least half its stands in it gets −1 Clash (minimum 1).',
  Impassable: 'Cannot be moved through.',
  Garrison:
    'A building. Infantry that fit its Capacity can Occupy it for +Defense and 360° sight; nobody else may move into or within 1″ of it.'
};
function tInfo(t) {
  const d = TTYPES[t.type] || TTYPES.forest;
  return {
    name: t.name || d.name,
    size: t.size != null ? +t.size : d.size,
    kw: Array.isArray(t.kw) ? t.kw : d.kw,
    cap: t.cap != null ? +t.cap : d.cap || 4,
    def: t.def != null ? +t.def : d.def || 1
  };
}
function tHas(t, k) {
  return tInfo(t).kw.includes(k);
}
function tId(t) {
  return String(t.seed || t.x + '_' + t.y);
}
function inT(t, p, pad) {
  pad = pad || 0;
  return ((p[0] - t.x) / (t.rx + pad)) ** 2 + ((p[1] - t.y) / (t.ry + pad)) ** 2 <= 1;
}
function tBlocks(t, occ) {
  return tHas(t, 'Impassable') || (tHas(t, 'Garrison') && !occ);
}
function baseSize(u) {
  const c = u.cls || '';
  let s = /Monster|Titan/i.test(c) || u.type === 'monster' ? 3 : /Cavalry|Brute|Chariot/i.test(c) ? 2 : 1;
  const R = (u.rules || [])
      .concat(u.charRules || [])
      .concat((u.abilities || []).map(a => a[0] + ': ' + a[1])),
    fac = frFac(u);
  for (const t of R) {
    const x = String(t);
    let m = x.match(/\bSize\s*\(?\s*(\d)\s*\)?/i);
    if (!m) {
      let d = '';
      try {
        d = ruleInfo(x, fac) || '';
      } catch (e) {}
      m = String(d).match(/count[s]?\s+as\s+Size\s+(\d)/i);
    }
    if (m) return { s: +m[1], why: x.replace(/\s*\(.*$/, '').replace(/:.*$/, '') };
  }
  return { s, why: '' };
}
function uSize(u) {
  let s = baseSize(u).s;
  const e = terrainOf().find(t => tHas(t, 'Elevated') && inT(t, [u.x, u.y]));
  if (e) s += tInfo(e).size;
  if (u.garrison) {
    const g = terrainOf().find(t => tId(t) === u.garrison);
    if (g) s = Math.max(s, tInfo(g).size);
  }
  return s;
}
function tIgnore(u, k) {
  const R = (u.rules || []).concat(fx(u));
  if (rh(R, 'Fly')) return true;
  if (R.some(x => new RegExp('^Ignores ' + k, 'i').test(x))) return true;
  if (
    k === 'Hindering' &&
    (armyHas(u.side, /ignores Hindering/i) ||
      frFac(u) === 'Weaver Courts' ||
      R.some(x => /Ignores Hindering/i.test(x)))
  )
    return true;
  return false;
}
function segHits(t, a, b) {
  for (let k = 0; k <= 12; k++) {
    const f = k / 12;
    if (inT(t, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])) return true;
  }
  return false;
}
/* which stands crossed which terrain during a move */
function tCrossed(u, from, to) {
  const A = standsOf(Object.assign({}, u, from)),
    B = standsOf(Object.assign({}, u, to));
  const out = {};
  terrainOf().forEach(t => {
    let n = 0;
    A.forEach((s, i) => {
      const b = B[i] || B[B.length - 1];
      if (segHits(t, stC(s), stC(b))) n++;
    });
    if (n) out[tId(t)] = { t, n };
  });
  return { per: out, total: A.length };
}
function stC(s) {
  const P = s.poly;
  return [(P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4];
}
function standCenters(u) {
  return standsOf(u).map(stC);
}
/* after a move: Dangerous / Perilous rolls; charges through Hindering */
function tAfterMove(u, entry) {
  const res = { notes: [], wounds: 0, hindered: false };
  if (!entry.from || !entry.to) return res;
  const C = tCrossed(u, entry.from, entry.to),
    big = /Cavalry|Chariot/i.test(u.cls || '');
  Object.values(C.per).forEach(({ t, n }) => {
    const I = tInfo(t);
    ['Dangerous', 'Perilous'].forEach(k => {
      if (!I.kw.includes(k) || tIgnore(u, k)) return;
      const need = k === 'Dangerous' ? 6 : 4,
        rolls = [];
      let w = 0;
      for (let i = 0; i < n; i++) {
        const d = d6();
        rolls.push(d);
        if (d >= need) w += big ? 2 : 1;
      }
      res.wounds += w;
      res.notes.push(`${I.name} (${k}): rolled ${rolls.join(', ')} → ${w} wound${w === 1 ? '' : 's'}`);
    });
    if (
      entry.type === 'charge' &&
      I.kw.includes('Hindering') &&
      !tIgnore(u, 'Hindering') &&
      n >= Math.ceil(C.total / 2)
    )
      res.hindered = I.name;
  });
  return res;
}
/* Volley Cover and Line of Sight */
function tCover(A, T) {
  if (rh((A.rules || []).concat(fx(A)), 'Sureshot')) return null;
  const sz = uSize(T),
    tc = standCenters(T);
  for (const t of terrainOf()) {
    if (!tHas(t, 'Cover')) continue;
    const I = tInfo(t);
    if (sz > I.size) continue;
    if (tc.every(p => inT(t, p))) return I.name + ' (target inside)';
    if (!inT(t, [A.x, A.y]) && segHits(t, [A.x, A.y], [T.x, T.y])) return I.name + ' (shooting through)';
  }
  return null;
}
function tLos(A, T, volley) {
  const sa = uSize(A),
    st = uSize(T);
  for (const t of terrainOf()) {
    if (!tHas(t, 'Obstructing') && !tHas(t, 'Garrison')) continue;
    if (inT(t, [A.x, A.y]) || inT(t, [T.x, T.y])) continue;
    const I = tInfo(t);
    const blocks = volley ? I.size >= sa && I.size >= st : I.size >= sa && I.size >= st;
    if (blocks && segHits(t, [A.x, A.y], [T.x, T.y])) return I.name + ' (Size ' + I.size + ')';
  }
  return null;
}
function tWater(u) {
  const P = standCenters(u);
  if (!P.length) return false;
  const w = P.filter(p => terrainOf().some(t => tHas(t, 'Water') && inT(t, p))).length;
  return w >= Math.ceil(P.length / 2);
}
/* Garrison terrain */
function tGarrisonNear(u) {
  if (!/Infantry/i.test(u.cls || '') || u.garrison) return [];
  const C = corners(u);
  return terrainOf().filter(t => {
    if (!tHas(t, 'Garrison')) return false;
    const I = tInfo(t);
    if (live(u) > I.cap) return false;
    if (all().some(o => o.garrison === tId(t) && !o.destroyed)) return false;
    let dmin = 1e9;
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2,
        q = [t.x + Math.cos(a) * t.rx, t.y + Math.sin(a) * t.ry];
      C.forEach(c => {
        dmin = Math.min(dmin, Math.hypot(c[0] - q[0], c[1] - q[1]));
      });
    }
    return dmin <= (u.m || 0) + 1;
  });
}
function tGarrisonOf(u) {
  return u && u.garrison ? terrainOf().find(t => tId(t) === u.garrison) : null;
}

/* ---------- drawing the new terrain types ---------- */
function swamp(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 11, 0.25);
  el('path', { d: b(1), fill: '#5D6B3C' }, g);
  el('path', { d: b(0.72), fill: '#4B5A35', opacity: 0.9 }, g);
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.55;
    el(
      'ellipse',
      {
        cx: cx + Math.cos(a) * d * rx,
        cy: cy + Math.sin(a) * d * ry,
        rx: 6 + r() * 7,
        ry: 3 + r() * 3,
        fill: '#3E5560',
        opacity: 0.75
      },
      g
    );
  }
  const n = Math.max(10, Math.round((rx * ry) / 35));
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.85,
      x = cx + Math.cos(a) * d * rx,
      y = cy + Math.sin(a) * d * ry;
    el(
      'path',
      {
        d: `M${x} ${y}l-2 -7M${x} ${y}l0 -9M${x} ${y}l2.5 -6`,
        stroke: '#9AA25A',
        'stroke-width': 1.1,
        fill: 'none'
      },
      g
    );
  }
}
function water(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 10, 0.18);
  el('path', { d: b(1.06), fill: '#C9B98A', opacity: 0.9 }, g);
  el('path', { d: b(1), fill: '#3F6F8E' }, g);
  el('path', { d: b(0.7), fill: '#4C82A3' }, g);
  for (let i = 0; i < 6; i++) {
    const x = cx + (r() - 0.5) * rx * 1.2,
      y = cy + (r() - 0.5) * ry * 1.1,
      w = 6 + r() * 10;
    el(
      'path',
      {
        d: `M${x - w} ${y} q${w / 2} -3 ${w} 0 t${w} 0`,
        stroke: '#A9CDE0',
        'stroke-width': 1,
        fill: 'none',
        opacity: 0.8
      },
      g
    );
  }
}
function ruins(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 9, 0.2);
  el('path', { d: b(1), fill: '#9B9483' }, g);
  el('path', { d: b(0.8), fill: '#AAA391', opacity: 0.8 }, g);
  const w = rx * 0.7,
    h = ry * 0.6;
  el(
    'path',
    {
      d: `M${cx - w} ${cy + h} L${cx - w} ${cy - h} L${cx + w * 0.2} ${cy - h}`,
      stroke: '#6E675A',
      'stroke-width': 4,
      fill: 'none',
      'stroke-linecap': 'square'
    },
    g
  );
  el(
    'path',
    {
      d: `M${cx + w * 0.5} ${cy - h * 0.2} L${cx + w} ${cy - h * 0.2} L${cx + w} ${cy + h * 0.6}`,
      stroke: '#6E675A',
      'stroke-width': 4,
      fill: 'none'
    },
    g
  );
  for (let i = 0; i < 8; i++)
    el(
      'rect',
      {
        x: cx + (r() - 0.5) * rx * 1.4,
        y: cy + (r() - 0.5) * ry * 1.2,
        width: 3 + r() * 4,
        height: 2 + r() * 3,
        fill: '#7E7767'
      },
      g
    );
}
function field(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 8, 0.12);
  el('path', { d: b(1), fill: '#C9A94A', stroke: '#8C7330', 'stroke-width': 0.8 }, g);
  const id = 'fc' + Math.floor(r() * 1e9);
  const cp = el('clipPath', { id }, g);
  el('path', { d: b(1) }, cp);
  const lines = el('g', { 'clip-path': `url(#${id})` }, g);
  for (let k = -rx * 2; k < rx * 2; k += 5)
    el(
      'line',
      {
        x1: cx + k,
        y1: cy - ry * 1.2,
        x2: cx + k + ry * 0.6,
        y2: cy + ry * 1.2,
        stroke: '#A88B32',
        'stroke-width': 1.4
      },
      lines
    );
}
function rubble(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 10, 0.25);
  el('path', { d: b(1), fill: '#8F7B5C', opacity: 0.85 }, g);
  const n = Math.max(14, Math.round((rx * ry) / 20));
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.85,
      x = cx + Math.cos(a) * d * rx,
      y = cy + Math.sin(a) * d * ry,
      z = 1.5 + r() * 2.5;
    el('circle', { cx: x, cy: y, r: z, fill: ['#7A7468', '#958E80', '#6A6458'][i % 3] }, g);
  }
}
function thorns(cx, cy, rx, ry, g) {
  const b = blob(cx, cy, rx, ry, 12, 0.3);
  el('path', { d: b(1), fill: '#3F4A2A' }, g);
  const n = Math.max(14, Math.round((rx * ry) / 25));
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * 0.85,
      x = cx + Math.cos(a) * d * rx,
      y = cy + Math.sin(a) * d * ry;
    el(
      'path',
      {
        d: `M${x - 5} ${y + 3}Q${x} ${y - 6} ${x + 5} ${y + 3}M${x - 2} ${y - 1}l-2 -2M${x + 2} ${y - 1}l2 -2`,
        stroke: '#7A5A3A',
        'stroke-width': 1.1,
        fill: 'none'
      },
      g
    );
  }
  for (let i = 0; i < 4; i++)
    el('circle', { cx: cx + (r() - 0.5) * rx, cy: cy + (r() - 0.5) * ry, r: 1.6, fill: '#B0413A' }, g);
}
function building(cx, cy, rx, ry, g) {
  el(
    'ellipse',
    {
      cx,
      cy,
      rx,
      ry,
      fill: '#8C8571',
      opacity: 0.55,
      stroke: '#5E5848',
      'stroke-width': 0.8,
      'stroke-dasharray': '3 2'
    },
    g
  );
  const w = rx * 1.15,
    h = ry * 1.0;
  el('rect', { x: cx - w / 2 + 2, y: cy - h / 2 + 3, width: w, height: h, fill: '#000', opacity: 0.25 }, g);
  el(
    'rect',
    {
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      fill: '#B9A989',
      stroke: '#5E4B33',
      'stroke-width': 1.2
    },
    g
  );
  el(
    'path',
    {
      d: `M${cx - w / 2} ${cy - h / 2} L${cx} ${cy - h / 2 + h * 0.5} L${cx + w / 2} ${cy - h / 2} M${cx - w / 2} ${cy + h / 2} L${cx} ${cy - h / 2 + h * 0.5} L${cx + w / 2} ${cy + h / 2}`,
      stroke: '#7A4E32',
      'stroke-width': 1,
      fill: 'none'
    },
    g
  );
  el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, fill: '#9C5A3A', opacity: 0.35 }, g);
}
const TDRAW = { forest, hill, rocks, swamp, water, ruins, field, rubble, thorns, building };
const TLAYER = {
  forest: 'forests',
  hill: 'hills',
  rocks: 'rocks',
  swamp: 'terr-low',
  water: 'terr-low',
  field: 'terr-low',
  rubble: 'terr-low',
  thorns: 'forests',
  ruins: 'rocks',
  building: 'rocks'
};
function terrainOf() {
  return state && Array.isArray(state.terrain) ? state.terrain : TERR0;
}
let terrKey = '';
function drawTerrain() {
  const T = terrainOf(),
    k = JSON.stringify(T) + '|' + (typeof terrSel === 'number' ? terrSel : '');
  if (k === terrKey) return;
  terrKey = k;
  ['forests', 'hills', 'rocks', 'terr-low'].forEach(i => ($(i).innerHTML = ''));
  T.forEach((t, i) => {
    const g = el('g', { 'data-tid': String(i), class: 'tpiece' }, $(TLAYER[t.type] || 'rocks'));
    s = t.seed | 0 || i + 1;
    const I = tInfo(t);
    const tt = el('title', {}, g);
    tt.textContent =
      I.name +
      ' · Size ' +
      I.size +
      ' · ' +
      I.kw.join(', ') +
      (I.kw.includes('Garrison') ? ' · Capacity ' + I.cap + ', Defense +' + I.def : '');
    (TDRAW[t.type] || forest)(px(t.x), py(t.y), t.rx * S, t.ry * S, g);
    if (terrSel === i)
      el(
        'ellipse',
        {
          cx: px(t.x),
          cy: py(t.y),
          rx: t.rx * S + 4,
          ry: t.ry * S + 4,
          fill: 'none',
          stroke: '#E8C65A',
          'stroke-width': 2,
          'stroke-dasharray': '5 3'
        },
        g
      );
  });
}
const L = $('legend');
function lt(x, y, cls, t) {
  const e = el('text', { x, y, class: cls, 'dominant-baseline': 'central' }, L);
  e.textContent = t;
  if (t === 'Claude’s army') e.id = 'leg-them-t';
}
[
  ['Large zone', '9 in, 3 VP'],
  ['Small zone', '6 in, 2 VP'],
  ['Forest', 'Hindering, cover'],
  ['Hill', 'Blocks sight'],
  ['Rocks', 'Impassable'],
  ['Your army', 'Bottom edge'],
  ['Claude’s army', 'Top edge'],
  ['Command stand', 'Leader, gold edge'],
  ['Minotaur', 'Auxiliary stand']
].forEach(([a, b], i) => {
  const y = 50 + i * 36;
  lt(48, y, 'lt', a);
  lt(48, y + 17, 'ls', b);
  const ic = el('g', {}, L),
    cy = y + 8;
  if (i == 0)
    el(
      'circle',
      {
        cx: 24,
        cy,
        r: 12,
        fill: '#D9B44A',
        'fill-opacity': 0.25,
        stroke: '#C9A63E',
        'stroke-width': 1.5,
        'stroke-dasharray': '4 3'
      },
      ic
    );
  if (i == 1)
    el(
      'circle',
      {
        cx: 24,
        cy,
        r: 8,
        fill: '#D9B44A',
        'fill-opacity': 0.25,
        stroke: '#C9A63E',
        'stroke-width': 1.5,
        'stroke-dasharray': '3 3'
      },
      ic
    );
  if (i == 2) forest(24, cy, 14, 10, ic);
  if (i == 3) hill(24, cy, 14, 9, ic);
  if (i == 4) rocks(24, cy, 11, 7, ic);
  if (i == 5)
    el(
      'rect',
      {
        id: 'leg-you',
        x: 12,
        y: cy - 7,
        width: 24,
        height: 14,
        rx: 2,
        fill: '#9A3328',
        stroke: '#F3E6C4',
        'stroke-width': 1
      },
      ic
    );
  if (i == 6)
    el(
      'rect',
      {
        id: 'leg-them',
        x: 12,
        y: cy - 7,
        width: 24,
        height: 14,
        rx: 2,
        fill: '#2C5A8E',
        stroke: '#F3E6C4',
        'stroke-width': 1
      },
      ic
    );
  if (i == 7) {
    el(
      'rect',
      {
        x: 16,
        y: cy - 7,
        width: 14,
        height: 14,
        rx: 1.5,
        fill: '#9A3328',
        stroke: '#E8C65A',
        'stroke-width': 2.2
      },
      ic
    );
    el(
      'path',
      {
        d: `M23 ${cy - 4.5} L27 ${cy} L23 ${cy + 4.5} L19 ${cy}Z`,
        fill: '#E8C65A',
        stroke: '#4A3418',
        'stroke-width': 0.6
      },
      ic
    );
  }
  if (i == 8) {
    el(
      'rect',
      {
        x: 16,
        y: cy - 7,
        width: 14,
        height: 14,
        rx: 1.5,
        fill: '#3B1A14',
        stroke: '#F3E6C4',
        'stroke-width': 0.8
      },
      ic
    );
    el(
      'path',
      {
        d: `M18.5 ${cy - 3.5} Q20 ${cy + 2} 23 ${cy + 2} Q26 ${cy + 2} 27.5 ${cy - 3.5}`,
        fill: 'none',
        stroke: '#F3E6C4',
        'stroke-width': 1.6,
        'stroke-linecap': 'round'
      },
      ic
    );
  }
});
const sy = 50 + 9 * 36 + 2;
el('rect', { x: 10, y: sy, width: 84, height: 5, fill: '#4A3418' }, L);
el('rect', { x: 10, y: sy, width: 42, height: 5, fill: '#C9B27A' }, L);
lt(102, sy + 3, 'ls', '12 in');

/* legend: a toggle panel over the map, listing what this game uses */
let legOpen = false;
try {
  legOpen = localStorage.getItem('conquest-legend') === '1';
} catch (e) {}
function legIcon(draw) {
  const sv = document.createElementNS(NS, 'svg');
  sv.setAttribute('viewBox', '0 0 40 26');
  sv.setAttribute('width', '40');
  sv.setAttribute('height', '26');
  sv.setAttribute('aria-hidden', 'true');
  draw(sv);
  return sv;
}
function legStand(g, fill, stroke, sw) {
  return el(
    'rect',
    {
      x: 13,
      y: 6,
      width: 14,
      height: 14,
      rx: 1.5,
      fill,
      stroke: stroke || '#F3E6C4',
      'stroke-width': sw || 0.8
    },
    g
  );
}
function renderLegend() {
  const pan = $('leg-panel'),
    btn = $('leg-btn');
  if (!pan || !btn) return;
  btn.setAttribute('aria-expanded', String(legOpen));
  btn.textContent = legOpen ? 'Hide legend' : 'Legend';
  pan.hidden = !legOpen;
  if (!legOpen || !state) return;
  pan.innerHTML = '';
  const sec = t => {
    const h = document.createElement('div');
    h.className = 'leg-h';
    h.textContent = t;
    pan.appendChild(h);
  };
  const item = (draw, a, b) => {
    const r = document.createElement('div');
    r.className = 'leg-i';
    const t = document.createElement('div');
    const s1 = document.createElement('strong');
    s1.textContent = a;
    t.appendChild(s1);
    if (b) {
      const s2 = document.createElement('span');
      s2.textContent = b;
      t.appendChild(s2);
    }
    r.append(legIcon(draw), t);
    pan.appendChild(r);
  };
  const zs = zonesOf(),
    T = terrainOf(),
    U = (state.units || []).filter(u => u.type !== 'marker');
  sec('Objectives');
  if (zs.some(z => z.size === 9))
    item(
      g =>
        el(
          'circle',
          {
            cx: 20,
            cy: 13,
            r: 11,
            fill: '#D9B44A',
            'fill-opacity': 0.25,
            stroke: '#C9A63E',
            'stroke-width': 1.5,
            'stroke-dasharray': '4 3'
          },
          g
        ),
      'Large zone',
      '9″, 3 VP'
    );
  if (zs.some(z => z.size !== 9))
    item(
      g =>
        el(
          'circle',
          {
            cx: 20,
            cy: 13,
            r: 7,
            fill: '#D9B44A',
            'fill-opacity': 0.25,
            stroke: '#C9A63E',
            'stroke-width': 1.5,
            'stroke-dasharray': '3 3'
          },
          g
        ),
      'Small zone',
      '6″, 2 VP'
    );
  if (zs.some(z => z.friendly))
    item(
      g => {
        el(
          'circle',
          { cx: 13, cy: 13, r: 8, fill: COL.cs.light, 'fill-opacity': 0.35, stroke: COL.cs.light },
          g
        );
        el(
          'circle',
          { cx: 28, cy: 13, r: 8, fill: COL.nord.light, 'fill-opacity': 0.35, stroke: COL.nord.light },
          g
        );
      },
      'Friendly zones',
      'Only the other side can seize them'
    );
  if ((state.units || []).some(u => u.type === 'marker'))
    item(
      g => {
        [
          [COL.cs.fill, 9],
          [COL.nord.fill, 20],
          ['#6B5638', 31]
        ].forEach(([c, x]) =>
          el('circle', { cx: x, cy: 13, r: 5, fill: c, stroke: '#F3E6C4', 'stroke-width': 1 }, g)
        );
      },
      'Objective Markers',
      PAL[colId('cs')].name + ' south, ' + colName('nord') + ' north, brown neutral; 3 wounds'
    );
  const types = [...new Set(T.map(t => t.type))];
  if (types.length) {
    sec('Terrain');
    types.forEach(ty => {
      const d = TTYPES[ty] || TTYPES.forest;
      item(
        g => (TDRAW[ty] || forest)(20, 13, ty === 'building' ? 9 : 14, ty === 'building' ? 7 : 9, g),
        d.name,
        'Size ' + d.size + ' · ' + d.kw.join(', ')
      );
    });
  }
  sec('Armies');
  ['cs', 'nord'].forEach(sd =>
    item(
      g => {
        el(
          'rect',
          {
            x: 8,
            y: 6,
            width: 24,
            height: 14,
            rx: 2,
            fill: COL[sd].fill,
            stroke: '#F3E6C4',
            'stroke-width': 1
          },
          g
        );
      },
      N(sd) + (sd === HU ? ' (you)' : ''),
      sd === HU ? 'Bottom edge' : 'Top edge'
    )
  );
  sec('Stands');
  item(
    g => {
      legStand(g, COL[HU].fill, '#E8C65A', 2.2);
      el(
        'path',
        { d: 'M20 8.5 L24 13 L20 17.5 L16 13Z', fill: '#E8C65A', stroke: '#4A3418', 'stroke-width': 0.6 },
        g
      );
    },
    'Command stand',
    'Gold edge and diamond; removed last'
  );
  item(
    g => {
      legStand(g, COL[HU].light);
    },
    'Rear rank',
    'Lighter colour'
  );
  if (U.some(u => u.char != null))
    item(
      g => {
        legStand(g, COL[HU].fill);
        el('circle', { cx: 20, cy: 13, r: 4, fill: '#F3E6C4', stroke: '#4A3418', 'stroke-width': 0.8 }, g);
      },
      'Character',
      'Always in the front rank'
    );
  const auxes = new Set(U.filter(u => u.aux != null && u.auxStats).map(u => auxStyle(u).key));
  if (auxes.has('mino'))
    item(
      g => {
        legStand(g, '#3B1A14');
        el(
          'path',
          {
            d: 'M15.5 9.5 Q17 15 20 15 Q23 15 24.5 9.5',
            fill: 'none',
            stroke: '#F3E6C4',
            'stroke-width': 1.6,
            'stroke-linecap': 'round'
          },
          g
        );
      },
      'Minotaur',
      'Auxiliary stand, own profile'
    );
  if (auxes.has('sb'))
    item(
      g => {
        legStand(g, '#2E3B55');
        el('circle', { cx: 20, cy: 13, r: 4.6, fill: '#B8862E', stroke: '#F3E6C4', 'stroke-width': 0.8 }, g);
        el(
          'path',
          { d: 'M17.7 15.2 L20 10.4 L22.3 15.2', fill: 'none', stroke: '#1C1410', 'stroke-width': 1.2 },
          g
        );
      },
      'Sacred Band Veteran',
      'Auxiliary stand, own profile'
    );
  const mods = [...new Set(U.flatMap(u => u.mods || []))];
  if (mods.length) {
    sec('Modular stands');
    mods.forEach(m => {
      const M = MODSTYLE[m];
      if (!M) return;
      const P = MODULAR[m] || {};
      item(
        g => {
          legStand(g, COL[HU].fill);
          el(
            'rect',
            { x: 14, y: 9, width: 12, height: 8, rx: 2, fill: M[1], stroke: '#1C1410', 'stroke-width': 0.5 },
            g
          );
          const t = el(
            'text',
            {
              x: 20,
              y: 13.3,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              'font-size': 6,
              'font-weight': 700,
              fill: '#1C1410'
            },
            g
          );
          t.textContent = M[0];
        },
        m,
        P.role ? 'Ideal ' + P.role + ' · ' + (P.rules || []).join(', ') : ''
      );
    });
  }
  sec('Markers');
  item(
    g => {
      legStand(g, COL[HU].fill);
      el('circle', { cx: 26, cy: 9, r: 5.5, fill: '#B3261E', stroke: '#FFF3E0', 'stroke-width': 1.2 }, g);
      const t = el(
        'text',
        {
          x: 26,
          y: 9.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': 7,
          'font-weight': 700,
          fill: '#FFF3E0'
        },
        g
      );
      t.textContent = '3';
    },
    'Wounds',
    'On the stand taking them'
  );
  item(
    g => {
      legStand(g, COL[HU].fill);
      el(
        'path',
        {
          d: 'M15 8 L19 11 L22 13 L19 16 L25 19',
          fill: 'none',
          stroke: '#1C1410',
          'stroke-width': 1.4,
          'stroke-linecap': 'round'
        },
        g
      );
    },
    'Broken',
    'Crack across the stands'
  );
  item(
    g => {
      el('rect', { x: 4, y: 10, width: 32, height: 5, fill: '#4A3418' }, g);
      el('rect', { x: 4, y: 10, width: 16, height: 5, fill: '#C9B27A' }, g);
    },
    'Scale',
    'Bar is 12″, each half 6″'
  );
}
$('leg-btn').onclick = () => {
  legOpen = !legOpen;
  try {
    localStorage.setItem('conquest-legend', legOpen ? '1' : '0');
  } catch (e) {}
  renderLegend();
};
