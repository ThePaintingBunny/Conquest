/* Facing arcs viewer (core rules, Facing Arcs: a 45° line from each corner of the regiment splits the table into its
   front arc, two flank arcs and rear arc).
   A (or the Arcs tool) turns arcs mode on and off. In arcs mode the regiment under the pointer shows its arcs, and the
   selected regiment keeps showing them (click a regiment to check it). Online, the opponent sees the arcs you are
   looking at, drawn the same way. */

let arcsOn = false,
  arcHover = null /* regiment id under the pointer */,
  rArcs = null /* online: the arcs the opponent is looking at {id} */,
  arcSent = '',
  arcSendT = 0;

const ARC_FILL = { front: '#7BD389', left: '#FFC857', right: '#FFC857', rear: '#E57373' };

/* clip a polygon to the table (Sutherland–Hodgman against 0..72 × 0..48) */
function clipTable(P) {
  const edges = [
    [p => p[0] >= 0, (a, b) => a[0] / (a[0] - b[0])],
    [p => p[0] <= 72, (a, b) => (a[0] - 72) / (a[0] - b[0])],
    [p => p[1] >= 0, (a, b) => a[1] / (a[1] - b[1])],
    [p => p[1] <= 48, (a, b) => (a[1] - 48) / (a[1] - b[1])]
  ];
  let out = P;
  for (const [inside, tAt] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i],
        b = src[(i + 1) % src.length],
        ia = inside(a),
        ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = tAt(a, b);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    if (!out.length) return out;
  }
  return out;
}

/* the four arcs of a regiment as table polygons */
function arcPolys(u) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    fe = G.d / 2,
    hw = G.w / 2,
    L = 120;
  const P = (fw, rr) => [u.x + f[0] * fw + r[0] * rr, u.y + f[1] * fw + r[1] * rr];
  const FL = P(fe, -hw),
    FR = P(fe, hw),
    RL = P(-fe, -hw),
    RR = P(-fe, hw),
    out = (p, df, dr) => [p[0] + (f[0] * df + r[0] * dr) * L, p[1] + (f[1] * df + r[1] * dr) * L];
  const fl = out(FL, 1, -1),
    fr = out(FR, 1, 1),
    rl = out(RL, -1, -1),
    rr = out(RR, -1, 1);
  return {
    front: [FL, fl, fr, FR],
    right: [FR, fr, rr, RR],
    rear: [RR, rr, rl, RL],
    left: [RL, rl, fl, FL],
    lines: [
      [FL, fl],
      [FR, fr],
      [RL, rl],
      [RR, rr]
    ]
  };
}

/* draw one regiment's arcs: shaded areas and the four 45° lines */
function drawArcs(u, g, remote) {
  if (!u || !u.onTable || u.destroyed) return;
  const A = arcPolys(u),
    pts = q => q.map(p => px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1)).join(' ');
  ['front', 'left', 'right', 'rear'].forEach(k => {
    const c = clipTable(A[k]);
    if (c.length > 2)
      el(
        'polygon',
        { points: pts(c), fill: ARC_FILL[k], 'fill-opacity': k === 'front' ? 0.16 : 0.11, class: 'arc-' + k },
        g
      );
  });
  A.lines.forEach(([p, q]) => {
    const c = clipTable([p, q, p]);
    if (c.length < 2) return;
    const far = c.reduce(
      (m, x) => (Math.hypot(x[0] - p[0], x[1] - p[1]) > Math.hypot(m[0] - p[0], m[1] - p[1]) ? x : m),
      p
    );
    el(
      'line',
      {
        x1: px(p[0]),
        y1: py(p[1]),
        x2: px(far[0]),
        y2: py(far[1]),
        stroke: remote ? '#BFD7FF' : '#F3E6C4',
        'stroke-width': 1.4,
        'stroke-dasharray': '6 4',
        opacity: 0.9
      },
      g
    );
  });
}

/* which regiments show arcs on this screen */
function arcIds() {
  const ids = [];
  if (arcsOn) {
    if (arcHover && byId(arcHover)) ids.push(arcHover);
    if (selId && byId(selId) && !ids.includes(selId)) ids.push(selId);
  }
  return ids;
}
function drawArcsLayer(g) {
  arcIds().forEach(id => drawArcs(byId(id), g, false));
  if (rArcs && rArcs.id && !arcIds().includes(rArcs.id)) drawArcs(byId(rArcs.id), g, true);
  arcShare();
}
function redrawArcs() {
  const g = $('arcg');
  if (!g) return render();
  g.innerHTML = '';
  drawArcsLayer(g);
}

/* online: tell the opponent which regiment's arcs you are looking at */
function arcShare() {
  if (typeof PVP !== 'function' || !PVP() || !db || !seatSide()) return;
  const id = arcIds()[0] || '',
    k = id;
  if (k === arcSent) return;
  arcSent = k;
  clearTimeout(arcSendT);
  arcSendT = setTimeout(() => {
    db.doc('game/arcs')
      .set({ by: HU, id, at: Date.now() })
      .catch(() => {});
  }, 150);
}
function onArcs(d) {
  if (!d || d.by === HU) return;
  const id = d.id && byId(d.id) ? d.id : null;
  if ((rArcs && rArcs.id) === id) return;
  rArcs = id ? { id } : null;
  redrawArcs();
}

function toggleArcs(on) {
  arcsOn = on == null ? !arcsOn : !!on;
  const b = $('arcs-btn');
  if (b) b.setAttribute('aria-pressed', arcsOn);
  if (!arcsOn && !threatMode) arcHover = null;
  redrawArcs();
}
$('arcs-btn').onclick = () => {
  toggleArcs();
  toast(
    arcsOn
      ? 'Arcs on: point at a regiment, or select one to keep its arcs shown (A to turn off).'
      : 'Arcs off.'
  );
};
document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const tg = ev.target;
  if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable) return;
  if (mmCurrent()) return;
  if (ev.key === 'a' || ev.key === 'A') {
    ev.preventDefault();
    toggleArcs();
    toast(
      arcsOn
        ? 'Arcs on: point at a regiment, or select one to keep its arcs shown (A to turn off).'
        : 'Arcs off.'
    );
  }
});
/* the regiment under the pointer */
$('board').addEventListener('pointermove', ev => {
  if (!arcsOn) return;
  let id = null;
  try {
    const p = svgPt(ev),
      q = [ix(p.x), iy(p.y)];
    const u = (state ? state.units : []).find(u => u.onTable && !u.destroyed && ptInPolyG(q, corners(u)));
    id = u ? u.id : null;
  } catch (e) {}
  if (id !== arcHover) {
    arcHover = id;
    redrawArcs();
    if (threatMode) redrawThreat();
  }
});
$('board').addEventListener('pointerleave', () => {
  if (arcsOn && arcHover) {
    arcHover = null;
    redrawArcs();
    if (threatMode) redrawThreat();
  }
});
