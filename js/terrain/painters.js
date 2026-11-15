/*
 * Scenery painters
 *
 * The grass on the table and the artwork of each terrain type (forest, hill, rocks, swamp, water,
 * ruins, field, rubble, thorns, building).
 *
 * In this file: blob(), tg, forest(), hill(), rocks(), stones(), swamp(), water(), ruins(), field(),
 *   rubble(), thorns(), building(), buildingRoof()
 */

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

/* a hipped roof on a building's rectangle (screen corners in order): two long roof planes, two end triangles, a ridge */
function buildingRoof(C, g) {
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  let [c0, c1, c2, c3] = C;
  if (d(c0, c1) < d(c1, c2)) [c0, c1, c2, c3] = [c1, c2, c3, c0];
  const L = d(c0, c1),
    H = d(c1, c2),
    u = [(c1[0] - c0[0]) / L, (c1[1] - c0[1]) / L],
    m0 = [(c0[0] + c3[0]) / 2, (c0[1] + c3[1]) / 2],
    m1 = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2],
    R1 = [m0[0] + (u[0] * H) / 2, m0[1] + (u[1] * H) / 2],
    R2 = [m1[0] - (u[0] * H) / 2, m1[1] - (u[1] * H) / 2],
    pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '),
    face = (a, f) => el('polygon', { points: pts(a), fill: f, stroke: '#5E3A24', 'stroke-width': 0.9 }, g);
  face([c0, c1, R2, R1], '#A65E3C');
  face([c3, c2, R2, R1], '#8A4A2E');
  face([c0, R1, c3], '#975433');
  face([c1, R2, c2], '#975433');
  el('line', { x1: R1[0], y1: R1[1], x2: R2[0], y2: R2[1], stroke: '#4A2C1A', 'stroke-width': 1.6 }, g);
  /* roof tiles: thin lines along the long planes */
  for (let k = 1; k < 6; k++) {
    const f = k / 6;
    const a = [c0[0] + (R1[0] - c0[0]) * f, c0[1] + (R1[1] - c0[1]) * f],
      b = [c1[0] + (R2[0] - c1[0]) * f, c1[1] + (R2[1] - c1[1]) * f],
      a2 = [c3[0] + (R1[0] - c3[0]) * f, c3[1] + (R1[1] - c3[1]) * f],
      b2 = [c2[0] + (R2[0] - c2[0]) * f, c2[1] + (R2[1] - c2[1]) * f];
    el(
      'line',
      { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#7A4028', 'stroke-width': 0.6, opacity: 0.6 },
      g
    );
    el(
      'line',
      { x1: a2[0], y1: a2[1], x2: b2[0], y2: b2[1], stroke: '#6A3620', 'stroke-width': 0.6, opacity: 0.6 },
      g
    );
  }
}
