/*
 * Buildings
 *
 * Kinds of building, each with its own footprint (in inches), look and Garrison values (how many stands it holds
 * and the Defense it gives). A piece of one of these kinds stores its kind (bv), its turn (rot, in degrees) and its
 * outline (pts, relative to its centre), so every rule uses the real shape. A building without a kind is the plain
 * house it always was.
 *
 * In this file: BVAR, bvPts(), bvPiece(), bvLocal(), buildingDraw()
 */

const BVAR = {
  house: { name: 'House', w: 5, d: 3.6, cap: 4, def: 1, size: 2, note: 'a family home' },
  stall: { name: 'Market stall', w: 2.6, d: 1.8, cap: 1, def: 1, size: 1, note: 'a counter under an awning' },
  longhouse: { name: 'Longhouse', w: 7.5, d: 3.2, cap: 6, def: 1, size: 2, note: 'a long timber hall' },
  tower: { name: 'Watchtower', w: 3.2, d: 3.2, cap: 2, def: 2, size: 3, note: 'small, tall and stone' },
  mansion: { name: 'Mansion', w: 8, d: 6, cap: 8, def: 1, size: 3, note: 'two wings around a corner' },
  outpost: { name: 'Outpost', w: 7, d: 7, cap: 8, def: 2, size: 2, note: 'a palisade around a yard' }
};

/* the outline of a kind, turned by rot degrees, relative to its centre (inches) */
function bvPts(v, rot) {
  const B = BVAR[v] || BVAR.house,
    w = B.w / 2,
    d = B.d / 2;
  let P;
  if (v === 'tower')
    P = Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 8) * (2 * i + 1);
      return [Math.cos(a) * w, Math.sin(a) * w];
    });
  else if (v === 'mansion') {
    const x1 = -w + B.w * 0.42;
    P = [
      [-w, -d],
      [w, -d],
      [w, 0],
      [x1, 0],
      [x1, d],
      [-w, d]
    ];
  } else
    P = [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d]
    ];
  const a = ((rot || 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return P.map(([x, y]) => [+(x * c - y * s).toFixed(2), +(x * s + y * c).toFixed(2)]);
}

/* a building piece of a kind at x, y */
function bvPiece(v, x, y, rot) {
  const B = BVAR[v] || BVAR.house,
    pts = bvPts(v, rot),
    xs = pts.map(p => p[0]),
    ys = pts.map(p => p[1]);
  return {
    type: 'building',
    bv: v,
    rot: rot || 0,
    name: B.name,
    size: B.size,
    cap: B.cap,
    def: B.def,
    x: +(+x).toFixed(2),
    y: +(+y).toFixed(2),
    rx: +((Math.max(...xs) - Math.min(...xs)) / 2).toFixed(2),
    ry: +((Math.max(...ys) - Math.min(...ys)) / 2).toFixed(2),
    seed: (Date.now() % 997) + 1,
    pts
  };
}

/* a point given in the piece's own frame (inches from its centre, before turning) on the screen */
function bvLocal(t) {
  const a = ((t.rot || 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return (x, y) => [px(t.x + x * c - y * s), py(t.y + x * s + y * c)];
}

/* the drawing of a building piece (C: its outline on the screen) */
function buildingDraw(t, C, g) {
  const v = t.bv,
    B = BVAR[v],
    L = bvLocal(t),
    pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '),
    poly = (a, attrs) => el('polygon', Object.assign({ points: pts(a) }, attrs), g),
    rect = (x0, y0, x1, y1) => [L(x0, y0), L(x1, y0), L(x1, y1), L(x0, y1)];
  if (!B || v === 'house' || v === 'longhouse') return buildingRoof(C, g);
  if (v === 'stall') {
    /* a striped awning over the counter */
    const w = B.w / 2,
      d = B.d / 2,
      n = 6;
    poly(rect(-w, -d, w, d), { fill: '#E9DDBB', stroke: '#5E3A24', 'stroke-width': 0.9 });
    for (let k = 0; k < n; k += 2) {
      const x0 = -w + (B.w * k) / n,
        x1 = -w + (B.w * (k + 1)) / n;
      poly(rect(x0, -d, x1, d), { fill: '#B8322A', opacity: 0.9 });
    }
    el(
      'line',
      Object.assign(
        { stroke: '#5E3A24', 'stroke-width': 1.2 },
        (([a, b]) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }))([L(-w, 0), L(w, 0)])
      ),
      g
    );
    return;
  }
  if (v === 'tower') {
    /* a stone tower with a pointed roof: the eight roof faces meet in the middle */
    const ctr = L(0, 0);
    poly(C, { fill: '#8E8A80', stroke: '#3F3A33', 'stroke-width': 1.4 });
    const inner = C.map(p => [ctr[0] + (p[0] - ctr[0]) * 0.8, ctr[1] + (p[1] - ctr[1]) * 0.8]);
    inner.forEach((p, i) => {
      const q = inner[(i + 1) % inner.length];
      poly([p, q, ctr], { fill: i % 2 ? '#7A4A30' : '#975433', stroke: '#4A2C1A', 'stroke-width': 0.6 });
    });
    el('circle', { cx: ctr[0], cy: ctr[1], r: 1.6, fill: '#3F2A1C' }, g);
    return;
  }
  if (v === 'mansion') {
    /* two wings, each with its own roof; the stone between them shows at the corner */
    const w = B.w / 2,
      d = B.d / 2,
      x1 = -w + B.w * 0.42;
    poly(C, { fill: '#8C8571', stroke: '#3F3A33', 'stroke-width': 1 });
    buildingRoof(rect(-w, -d, w, 0), g);
    buildingRoof(rect(-w, 0, x1, d), g);
    /* chimneys */
    [
      [w * 0.55, -d * 0.5],
      [-w * 0.75, d * 0.55]
    ].forEach(([x, y]) =>
      poly(rect(x - 0.3, y - 0.3, x + 0.3, y + 0.3), { fill: '#6F6C66', stroke: '#3F3A33' })
    );
    return;
  }
  if (v === 'outpost') {
    /* a palisade around a yard, towers at the corners, a gate and a hut inside */
    const w = B.w / 2,
      d = B.d / 2,
      in0 = 0.45;
    poly(C, { fill: '#6B4A2B', stroke: '#3F2A1C', 'stroke-width': 1 });
    poly(rect(-w + in0, -d + in0, w - in0, d - in0), { fill: '#A08E6A' });
    /* stakes along the wall */
    const stakes = el('g', { opacity: 0.55 }, g);
    for (let k = 0; k <= 14; k++) {
      const f = -w + (B.w * k) / 14;
      [
        [f, -d + in0 / 2],
        [f, d - in0 / 2],
        [-w + in0 / 2, -d + (B.d * k) / 14],
        [w - in0 / 2, -d + (B.d * k) / 14]
      ].forEach(([x, y]) => {
        const p = L(x, y);
        el('circle', { cx: p[0], cy: p[1], r: 1, fill: '#3F2A1C' }, stakes);
      });
    }
    /* the gate, on the side facing the table's edge it was turned to */
    poly(rect(-0.7, d - in0, 0.7, d), { fill: '#A08E6A' });
    /* corner towers */
    [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d]
    ].forEach(([x, y]) => {
      const sx = Math.sign(x) * -1,
        sy = Math.sign(y) * -1;
      buildingRoof(rect(x, y, x + sx * 1.3, y + sy * 1.3), g);
    });
    /* a hut in the yard */
    buildingRoof(rect(-1.6, -1.6, 1.0, -0.2), g);
    return;
  }
  buildingRoof(C, g);
}
